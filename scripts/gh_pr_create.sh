#!/bin/bash

set -xeuo pipefail

changes=$(git status --short | wc -l)
if [[ "$changes" == "0" ]]; then
  exit 0
fi

cat > /tmp/body.txt
gh pr create --head "$BRANCH" --title "$TITLE" --label "$LABEL" --body-file /tmp/body.txt
