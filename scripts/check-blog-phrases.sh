#!/bin/sh
set -- docs/blog/*.md
if [ ! -f "$1" ]; then
  echo "No blog Markdown files found" >&2
  exit 2
fi

failed=0
grep -nH -F -e 'Мой ответ' -e 'моя позиция' -e 'Посмотрите на эту картинку' "$@"
result=$?
if [ "$result" -eq 0 ]; then
  echo "Remove the phrases shown above from blog Markdown files" >&2
  failed=1
elif [ "$result" -ne 1 ]; then
  exit "$result"
fi

awk '
  FNR == 1 { section = 0 }
  /^##[[:space:]]/ { section = NR; next }
  section && /^[[:space:]]*$/ { next }
  section {
    if ($0 ~ /^[[:space:]]*!\[/ || $0 ~ /^[[:space:]]*###[[:space:]]/) {
      printf "%s:%d: Add introductory text before the image or heading\n", FILENAME, FNR
      failed = 1
    }
    section = 0
  }
  END { exit failed }
' "$@" || failed=1

exit "$failed"
