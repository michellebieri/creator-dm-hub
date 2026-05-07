#!/bin/bash
# DM.me deploy script — removes git locks, commits all changes, pushes to main
set -e

echo "🚀 Deploying dm.me..."

# Remove any stale git locks
rm -f "$(git rev-parse --git-dir)/index.lock" 2>/dev/null || true
rm -f "$(git rev-parse --git-dir)/HEAD.lock" 2>/dev/null || true

# Stage all changes
git add -A

# Commit with timestamp if no message provided
MSG="${1:-deploy: $(date '+%Y-%m-%d %H:%M')}"
git commit -m "$MSG" 2>/dev/null || echo "Nothing new to commit."

# Push to main
git push origin main

echo "✅ Done! Vercel will deploy automatically in ~1 minute."
echo "🔗 https://creator-dm-hub.vercel.app"
