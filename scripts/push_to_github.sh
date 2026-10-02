#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/push_to_github.sh <GITHUB_PERSONAL_ACCESS_TOKEN>"
  echo "Or set GITHUB_TOKEN environment variable."
  exit 1
fi

TOKEN="$1"
git push "https://${TOKEN}@github.com/Kimbedded/SFHacks-2026.git" main
echo "Successfully pushed to GitHub!"
