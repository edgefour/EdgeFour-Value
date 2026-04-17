#!/usr/bin/env bash
set -euo pipefail

# This script runs after Claude creates a worktree via EnterWorktree.
# It copies .env files from the main repo and installs dependencies.

# The worktree path is the current working directory when the hook runs.
WORKTREE_DIR="$PWD"

# Find the main repo root (the original, non-worktree checkout).
MAIN_REPO="$(git -C "$WORKTREE_DIR" rev-parse --path-format=absolute --git-common-dir)"
MAIN_REPO="${MAIN_REPO%/.git}"

echo "Setting up worktree: $WORKTREE_DIR"
echo "Main repo: $MAIN_REPO"

# Copy .claude directory from main repo
if [ -d "$MAIN_REPO/.claude" ]; then
  cp -r "$MAIN_REPO/.claude" "$WORKTREE_DIR/.claude"
  echo "Copied .claude"
fi

# Copy all .env* files (except .env.sample which is tracked in git)
for env_file in "$MAIN_REPO"/.env*; do
  [ -f "$env_file" ] || continue
  basename="$(basename "$env_file")"
  # Skip .env.sample — it's in version control and already in the worktree
  [ "$basename" = ".env.sample" ] && continue
  cp "$env_file" "$WORKTREE_DIR/$basename"
  echo "Copied $basename"
done

# Install dependencies
echo "Running bun install..."
cd "$WORKTREE_DIR"
bun install
echo "Worktree setup complete."
