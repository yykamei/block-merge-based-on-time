#!/bin/bash

set -xeuo pipefail

cat > tmp/body.txt
gh pr create --head "$BRANCH" --title "$TITLE" --label "$LABEL" --body-file tmp/body.txt
