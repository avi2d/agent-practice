#!/bin/sh
set -- docs/blog/*.md
if [ ! -f "$1" ]; then
  echo "No blog Markdown files found" >&2
  exit 2
fi

grep -nH -F -e 'Мой ответ' -e 'моя позиция' "$@"
result=$?
if [ "$result" -eq 0 ]; then
  echo "Remove the phrases shown above from blog Markdown files" >&2
  exit 1
fi
if [ "$result" -ne 1 ]; then
  exit "$result"
fi
