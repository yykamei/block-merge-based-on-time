#!/bin/bash

set -xeuo pipefail

if [[ -z "${FUTURE_RELEASE:+y}" ]]; then
  suffix=()
else
  suffix=(--future-release "${FUTURE_RELEASE}")
fi

github_changelog_generator \
  --user "${GITHUB_REPOSITORY%/*}" \
  --project "${GITHUB_REPOSITORY#*/}" \
  --exclude-labels chore,no-changelog,duplicate,question,invalid,wontfix \
  --include-tags-regex 'v\d+\.\d+\.\d+' \
  "${suffix[@]}"
