#!/usr/bin/env bash
set -euo pipefail

# WorktreeCreate hook for Claude Code.
# Reads JSON from stdin: { "name": "<worktree-name>", "cwd": "<repo-root>", ... }
# Creates the worktree at <repo-root>/worktrees/<name>, copies .claude and .env*
# files, symlinks node_modules, then prints the worktree path to stdout.

INPUT=$(cat)
NAME=$(echo "$INPUT" | jq -r '.name')
CWD=$(echo "$INPUT" | jq -r '.cwd')

WORKTREE_DIR="$CWD/worktrees/$NAME"

echo "Creating worktree '$NAME' at: $WORKTREE_DIR" >&2
git -C "$CWD" worktree add "$WORKTREE_DIR" -b "$NAME" >&2

# Copy .claude from main repo
if [ -d "$CWD/.claude" ]; then
  cp -r "$CWD/.claude" "$WORKTREE_DIR/.claude"
  echo "Copied .claude" >&2
fi

# Copy all .env* files (skip .env.sample which is tracked in git)
for env_file in "$CWD"/.env*; do
  [ -f "$env_file" ] || continue
  basename="$(basename "$env_file")"
  [ "$basename" = ".env.sample" ] && continue
  cp "$env_file" "$WORKTREE_DIR/$basename"
  echo "Copied $basename" >&2
done

# Symlink node_modules from main repo
if [ -d "$CWD/node_modules" ]; then
  ln -s "$CWD/node_modules" "$WORKTREE_DIR/node_modules"
  echo "Linked node_modules" >&2
fi

echo "Worktree setup complete: $WORKTREE_DIR" >&2

# Must print only the worktree path to stdout
echo "$WORKTREE_DIR"
