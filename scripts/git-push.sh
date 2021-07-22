#!/bin/bash

set -xeuo pipefail

changes=$(git status --short | wc -l)
if [[ "$changes" == "0" ]]; then
  exit 0
fi

if [[ -n "${BRANCH:+y}" ]]; then
  git checkout -b "$BRANCH"
fi
git config user.name github-actions
git config user.email github-actions@github.com
git add -A
git commit -m "${COMMIT_MESSAGE}"
git push
