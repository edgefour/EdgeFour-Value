#!/usr/bin/env bash
set -euo pipefail

# Creates a git worktree in projectRoot/worktrees/<name>.
# Usage: bash .claude/create_worktree.sh <branch-name> [worktree-name]
#
# If worktree-name is omitted it defaults to branch-name (slashes replaced with dashes).

BRANCH="${1:?Usage: $0 <branch-name> [worktree-name]}"
NAME="${2:-${BRANCH//\//-}}"

# Resolve the main repo root regardless of whether we're inside a worktree.
MAIN_REPO="$(git rev-parse --path-format=absolute --git-common-dir)"
MAIN_REPO="${MAIN_REPO%/.git}"

WORKTREE_DIR="$MAIN_REPO/worktrees/$NAME"

echo "Creating worktree '$NAME' at: $WORKTREE_DIR"
git -C "$MAIN_REPO" worktree add "$WORKTREE_DIR" -b "$BRANCH"
echo "Done. Worktree created at $WORKTREE_DIR"
