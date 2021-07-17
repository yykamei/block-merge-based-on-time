#!/bin/bash

set -xeuo pipefail

DIFF=0
git diff --quiet --exit-code origin/main || DIFF=1
if [[ "$DIFF" == "0" ]]; then
  exit 0
fi

cat > /tmp/body.txt
gh pr create --head "$BRANCH" --title "$TITLE" --label "$LABEL" --body-file /tmp/body.txt
