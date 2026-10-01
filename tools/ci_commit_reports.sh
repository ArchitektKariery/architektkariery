#!/usr/bin/env bash
# Zapis raportow testow do main z ponawianiem.
#
# Jeden push do main uruchamia naraz kilka workflowow (etap 4, 5 i 6 Smoka).
# Kazdy z nich na koniec zapisuje swoj raport i robi git push. Pierwszy push
# wygrywa, a reszta dostawala "rejected (fetch first)" i workflow konczyl sie
# na czerwono, chociaz same testy przeszly.
#
# Ten skrypt odkłada wygenerowane pliki na bok, bierze najnowszy main,
# kladzie na nim te pliki i probuje pusha do 6 razy. Gdy pliki na main
# sa juz takie same, nie robi nic.
#
# Uzycie: tools/ci_commit_reports.sh "komunikat commita" plik1 [plik2 ...]
set -euo pipefail

msg="$1"
shift

git config user.name "QRyby Builder"
git config user.email "actions@users.noreply.github.com"

schowek="$(mktemp -d)"
for f in "$@"; do
  mkdir -p "$schowek/$(dirname "$f")"
  cp "$f" "$schowek/$f"
done

for proba in 1 2 3 4 5 6; do
  git fetch --quiet origin main
  git reset --quiet --hard origin/main
  for f in "$@"; do
    mkdir -p "$(dirname "$f")"
    cp "$schowek/$f" "$f"
  done
  git add -- "$@"
  if git diff --cached --quiet; then
    echo "No report changes"
    exit 0
  fi
  git commit --quiet -m "$msg"
  if git push --quiet origin HEAD:main; then
    echo "Report pushed (attempt $proba)"
    exit 0
  fi
  echo "Push rejected, retrying (attempt $proba)"
  sleep $((proba * 3))
done

echo "Could not push the report after 6 attempts"
exit 1
