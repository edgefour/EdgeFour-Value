#!/usr/bin/env bash
set -euo pipefail

# Creates a git worktree in projectRoot/worktrees/<name>, copies .claude and
# .env files from the main repo, and installs dependencies.
#
# Usage: bash .claude/create_worktree.sh <branch-name> [worktree-name]

BRANCH="${1:?Usage: $0 <branch-name> [worktree-name]}"
NAME="${2:-${BRANCH//\//-}}"

MAIN_REPO="$(git rev-parse --path-format=absolute --git-common-dir)"
MAIN_REPO="${MAIN_REPO%/.git}"

WORKTREE_DIR="$MAIN_REPO/worktrees/$NAME"

echo "Creating worktree '$NAME' at: $WORKTREE_DIR"
git -C "$MAIN_REPO" worktree add "$WORKTREE_DIR" -b "$BRANCH"

# Copy .claude from main repo
if [ -d "$MAIN_REPO/.claude" ]; then
  cp -r "$MAIN_REPO/.claude" "$WORKTREE_DIR/.claude"
  echo "Copied .claude"
fi

# Copy all .env* files (except .env.sample which is tracked in git)
for env_file in "$MAIN_REPO"/.env*; do
  [ -f "$env_file" ] || continue
  basename="$(basename "$env_file")"
  [ "$basename" = ".env.sample" ] && continue
  cp "$env_file" "$WORKTREE_DIR/$basename"
  echo "Copied $basename"
done

ln -s "$MAIN_REPO/node_modules" "$WORKTREE_DIR/node_modules"
echo "Linked node_modules"
echo "Worktree setup complete: $WORKTREE_DIR"
