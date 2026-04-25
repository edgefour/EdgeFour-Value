"""
Runtime parser for the EdgeFour valuation calculator.

Reads the production source files at runtime so the generated spreadsheet
always reflects the *current* state of the code:

    api/_lib/calculator.ts          — multiples, slider arrays, notices,
                                      and all inline calculation scalars
    public/industry-options-fragment.html
                                    — slug → display label and the
                                      category groupings shown in the UI

If any expected pattern goes missing (e.g. the calculator is refactored),
the parser raises a clear error rather than silently producing stale output.
"""

from __future__ import annotations

import os
import re
import subprocess
from dataclasses import dataclass, field
from datetime import date


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CALC_PATH = os.path.join(REPO_ROOT, "api", "_lib", "calculator.ts")
HTML_PATH = os.path.join(REPO_ROOT, "public", "industry-options-fragment.html")

# Curated category display order — mirrors the order Mike used in the
# original spec workbook. Anything from the HTML that is not in this list
# is appended at the end (alphabetical) so new categories never silently
# disappear.
CATEGORY_DISPLAY_ORDER: list[str] = [
    "Manufacturing & Distribution",
    "Home & Field Services",
    "Retail",
    "Food & Beverage",
    "Automotive",
    "Healthcare & Wellness",
    "Professional Services",
    "Technology",
    "Construction & Real Estate",
    "Logistics & Transportation",
    "Education & Childcare",
    "Senior Care",
    "Personal Services",
    "Agriculture & Environmental",
    "Publishing & Media",
    "Other",
]


@dataclass
class CalculatorRules:
    """Inline scalars extracted from `calculate()` in calculator.ts."""

    years_bonus_high: float = 0.0      # ≥ 10 yrs
    years_bonus_low: float = 0.0       # ≥ 5 yrs
    years_bonus_high_threshold: int = 10
    years_bonus_low_threshold: int = 5
    revenue_bonus_high: float = 0.0    # ≥ $15M
    revenue_bonus_low: float = 0.0     # ≥ $5M
    revenue_bonus_high_threshold: int = 15_000_000
    revenue_bonus_low_threshold: int = 5_000_000
    final_multiple_floor: float = 1.0
    range_low: float = 0.85
    range_high: float = 1.15
    score_base: int = 50
    score_weight_growth: int = 11
    score_weight_owner_dep: int = 12
    score_weight_recurring: int = 11
    score_weight_cust_conc: int = 9
    score_weight_systems: int = 9
    score_weight_fin_rec: int = 7
    score_years_bonus_pts: int = 5
    score_years_bonus_threshold: int = 10
    score_min: int = 10
    score_max: int = 100
    trajectory_max_levels: int = 2
    trajectory_total_cap_above_base: float = 3.5


@dataclass
class CalculatorData:
    industry_multiples: dict[str, float] = field(default_factory=dict)
    owner_dep_by_sector: dict[str, list[float]] = field(default_factory=dict)
    industry_notices: dict[str, dict[str, str]] = field(default_factory=dict)
    growth_adj: list[float] = field(default_factory=list)
    recurring_adj: list[float] = field(default_factory=list)
    cust_conc_adj: list[float] = field(default_factory=list)
    systems_adj: list[float] = field(default_factory=list)
    fin_rec_adj: list[float] = field(default_factory=list)
    industry_groups: list[tuple[str, list[tuple[str, str]]]] = field(default_factory=list)
    rules: CalculatorRules = field(default_factory=CalculatorRules)
    git_commit: str = ""
    snapshot_date: str = ""


# ── low-level helpers ──────────────────────────────────────────────────────

def _between_braces(text: str, start_marker: str) -> str:
    """Return the substring inside the outermost `{…}` that follows
    `start_marker = …` in `text`, using brace counting (so nested braces
    are handled correctly).

    Crucially: skips past the TypeScript type annotation by anchoring on
    the `=` after the marker — otherwise `Record<string, { title: string;
    body: string }>` would be picked up as the opening brace.
    """
    i = text.index(start_marker)
    eq = text.index("=", i)
    j = text.index("{", eq)
    depth, k = 1, j + 1
    while depth > 0:
        if k >= len(text):
            raise ValueError(f"Unbalanced braces after {start_marker!r}")
        if text[k] == "{":
            depth += 1
        elif text[k] == "}":
            depth -= 1
        k += 1
    return text[j + 1 : k - 1]


def _strip_comments(s: str) -> str:
    """Remove // line comments (we have no /* */ blocks inside the records
    we care about). Preserves string literals — comments live on their own
    lines in the source we parse."""
    return re.sub(r"//[^\n]*", "", s)


# ── record parsers (TS object literals → Python dicts) ─────────────────────

def parse_number_record(text: str, name: str) -> dict[str, float]:
    body = _strip_comments(_between_braces(text, f"export const {name}"))
    out: dict[str, float] = {}
    for m in re.finditer(r"(\w+)\s*:\s*(-?\d+(?:\.\d+)?)", body):
        out[m.group(1)] = float(m.group(2))
    if not out:
        raise ValueError(f"{name}: no entries parsed")
    return out


def parse_array_record(text: str, name: str) -> dict[str, list[float]]:
    body = _strip_comments(_between_braces(text, f"export const {name}"))
    out: dict[str, list[float]] = {}
    for m in re.finditer(r"(\w+)\s*:\s*\[([^\]]+)\]", body):
        out[m.group(1)] = [float(x) for x in m.group(2).split(",") if x.strip()]
    if not out:
        raise ValueError(f"{name}: no entries parsed")
    return out


def parse_array(text: str, name: str) -> list[float]:
    m = re.search(rf"\bconst\s+{name}\s*=\s*\[([^\]]+)\]", text)
    if not m:
        raise ValueError(f"{name}: array not found")
    return [float(x) for x in m.group(1).split(",") if x.strip()]


def parse_notices(text: str) -> dict[str, dict[str, str]]:
    body = _between_braces(text, "export const INDUSTRY_NOTICES")
    out: dict[str, dict[str, str]] = {}
    pos = 0
    # Each entry looks like:  slug: { title: '…', body: '…' },
    while True:
        m = re.search(r"(\w+)\s*:\s*\{", body[pos:])
        if not m:
            break
        slug = m.group(1)
        entry_start = pos + m.end()
        depth, k = 1, entry_start
        while depth > 0:
            if k >= len(body):
                raise ValueError(f"INDUSTRY_NOTICES: unbalanced entry for {slug!r}")
            if body[k] == "{":
                depth += 1
            elif body[k] == "}":
                depth -= 1
            k += 1
        entry = body[entry_start : k - 1]
        title = _extract_quoted_field(entry, "title")
        body_text = _extract_quoted_field(entry, "body")
        out[slug] = {"title": title, "body": body_text}
        pos = k
    if not out:
        raise ValueError("INDUSTRY_NOTICES: no entries parsed")
    return out


def _extract_quoted_field(entry_text: str, field_name: str) -> str:
    """Extract a single-quoted JS string value for `field_name:` inside an
    entry. Handles escaped single-quotes (\\')."""
    m = re.search(
        rf"\b{field_name}\s*:\s*'((?:[^'\\]|\\.)*)'",
        entry_text,
        re.S,
    )
    if not m:
        raise ValueError(f"could not extract {field_name!r} from notice entry")
    return m.group(1).replace("\\'", "'")


# ── inline-scalar parsers ──────────────────────────────────────────────────

def parse_rules(text: str) -> CalculatorRules:
    r = CalculatorRules()

    # Years bonus  →  if (years >= 10) yearsBonus = 0.3 ; else if (years >= 5) yearsBonus = 0.1
    m = re.search(r"if\s*\(\s*years\s*>=\s*(\d+)\s*\)\s*yearsBonus\s*=\s*([\d.]+)", text)
    if m:
        r.years_bonus_high_threshold, r.years_bonus_high = int(m.group(1)), float(m.group(2))
    m = re.search(r"else\s+if\s*\(\s*years\s*>=\s*(\d+)\s*\)\s*yearsBonus\s*=\s*([\d.]+)", text)
    if m:
        r.years_bonus_low_threshold, r.years_bonus_low = int(m.group(1)), float(m.group(2))

    # Revenue bonus
    m = re.search(r"if\s*\(\s*revenue\s*>=\s*([\d_]+)\s*\)\s*revenueBonus\s*=\s*([\d.]+)", text)
    if m:
        r.revenue_bonus_high_threshold = int(m.group(1).replace("_", ""))
        r.revenue_bonus_high = float(m.group(2))
    m = re.search(r"else\s+if\s*\(\s*revenue\s*>=\s*([\d_]+)\s*\)\s*revenueBonus\s*=\s*([\d.]+)", text)
    if m:
        r.revenue_bonus_low_threshold = int(m.group(1).replace("_", ""))
        r.revenue_bonus_low = float(m.group(2))

    # Final multiple floor
    m = re.search(r"Math\.max\s*\(\s*([\d.]+)\s*,\s*baseMultiple", text)
    if m:
        r.final_multiple_floor = float(m.group(1))

    # Range bands
    m = re.search(r"const\s+lowVal\s*=\s*baseVal\s*\*\s*([\d.]+)", text)
    if m:
        r.range_low = float(m.group(1))
    m = re.search(r"const\s+highVal\s*=\s*baseVal\s*\*\s*([\d.]+)", text)
    if m:
        r.range_high = float(m.group(1))

    # Score weights — score += <arr>[<idx>] * <N>
    weight_lookup = {
        "growthAdj": "score_weight_growth",
        "ownerDepAdj": "score_weight_owner_dep",
        "recurringAdj": "score_weight_recurring",
        "custConcAdj": "score_weight_cust_conc",
        "systemsAdj": "score_weight_systems",
        "finRecAdj": "score_weight_fin_rec",
    }
    for arr_name, attr in weight_lookup.items():
        m = re.search(rf"score\s*\+=\s*{arr_name}\[[^\]]+\]\s*\*\s*(\d+)", text)
        if m:
            setattr(r, attr, int(m.group(1)))

    # Score base, years bonus pts, clamp
    m = re.search(r"\blet\s+score\s*=\s*(\d+)", text)
    if m:
        r.score_base = int(m.group(1))
    m = re.search(r"if\s*\(\s*years\s*>=\s*(\d+)\s*\)\s*score\s*\+=\s*(\d+)", text)
    if m:
        r.score_years_bonus_threshold = int(m.group(1))
        r.score_years_bonus_pts = int(m.group(2))
    m = re.search(r"score\s*=\s*Math\.min\s*\(\s*(\d+)\s*,\s*Math\.max\s*\(\s*(\d+)", text)
    if m:
        r.score_max, r.score_min = int(m.group(1)), int(m.group(2))

    # Trajectory cap
    m = re.search(r"baseMultiple\s*\+\s*([\d.]+)\s*\)", text)
    if m:
        r.trajectory_total_cap_above_base = float(m.group(1))
    m = re.search(r"clampDelta\s*\([^,]+,[^,]+,\s*maxLevels\s*=\s*(\d+)\s*\)", text)
    if m:
        r.trajectory_max_levels = int(m.group(1))

    return r


# ── HTML parser ────────────────────────────────────────────────────────────

def parse_industry_groups(html: str, calc_slugs: set[str]) -> list[tuple[str, list[tuple[str, str]]]]:
    """Parse the production industry-select fragment into ordered groups.

    Returns a list of `(category, [(slug, label), …])` pairs ordered by the
    curated `CATEGORY_DISPLAY_ORDER`. Validates that every slug from the
    calculator has an HTML label, and warns about any HTML slugs that are
    not in the calculator (and vice-versa)."""
    raw_groups: dict[str, list[tuple[str, str]]] = {}
    for m in re.finditer(r'<optgroup\s+label="([^"]+)">(.*?)</optgroup>', html, re.S):
        cat = m.group(1)
        items: list[tuple[str, str]] = []
        for opt in re.finditer(r'<option\s+value="([^"]+)">([^<]+)</option>', m.group(2)):
            items.append((opt.group(1), opt.group(2).strip()))
        raw_groups.setdefault(cat, []).extend(items)

    html_slugs = {slug for items in raw_groups.values() for slug, _ in items}
    missing_in_html = calc_slugs - html_slugs
    extra_in_html = html_slugs - calc_slugs
    if missing_in_html:
        print(f"  ⚠ slugs in calculator.ts but missing from HTML: {sorted(missing_in_html)}")
    if extra_in_html:
        print(f"  ⚠ slugs in HTML but missing from calculator.ts: {sorted(extra_in_html)}")

    ordered: list[tuple[str, list[tuple[str, str]]]] = []
    used: set[str] = set()
    for cat in CATEGORY_DISPLAY_ORDER:
        if cat in raw_groups:
            ordered.append((cat, raw_groups[cat]))
            used.add(cat)
    for cat in sorted(raw_groups.keys() - used):
        print(f"  ⚠ uncategorized group from HTML: {cat!r} (appended at end)")
        ordered.append((cat, raw_groups[cat]))
    return ordered


# ── git metadata ───────────────────────────────────────────────────────────

def _git_short_sha() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=REPO_ROOT, stderr=subprocess.DEVNULL,
        ).decode().strip()
    except Exception:
        return "unknown"


# ── public entry point ─────────────────────────────────────────────────────

def load() -> CalculatorData:
    with open(CALC_PATH, encoding="utf-8") as f:
        ts = f.read()
    with open(HTML_PATH, encoding="utf-8") as f:
        html = f.read()

    data = CalculatorData()
    data.industry_multiples   = parse_number_record(ts, "industryMultiples")
    data.owner_dep_by_sector  = parse_array_record(ts, "ownerDepBySector")
    data.industry_notices     = parse_notices(ts)
    data.growth_adj           = parse_array(ts, "growthAdj")
    data.recurring_adj        = parse_array(ts, "recurringAdj")
    data.cust_conc_adj        = parse_array(ts, "custConcAdj")
    data.systems_adj          = parse_array(ts, "systemsAdj")
    data.fin_rec_adj          = parse_array(ts, "finRecAdj")
    data.rules                = parse_rules(ts)
    data.industry_groups      = parse_industry_groups(
        html, set(data.industry_multiples.keys())
    )
    data.git_commit           = _git_short_sha()
    data.snapshot_date        = date.today().isoformat()
    return data


if __name__ == "__main__":
    d = load()
    print(f"Industries:        {len(d.industry_multiples)}")
    print(f"Owner-dep arrays:  {len(d.owner_dep_by_sector)}")
    print(f"Notices:           {len(d.industry_notices)}")
    print(f"Universal arrays:  growth={d.growth_adj}  recurring={d.recurring_adj}")
    print(f"                   custConc={d.cust_conc_adj}  systems={d.systems_adj}  finRec={d.fin_rec_adj}")
    print(f"Rules:             {d.rules}")
    print(f"Industry groups:   {len(d.industry_groups)} categories, "
          f"{sum(len(items) for _, items in d.industry_groups)} entries")
    print(f"Snapshot:          {d.snapshot_date} @ {d.git_commit}")
