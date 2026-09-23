#!/bin/zsh
# One visible classroom assistant. Runs exactly one mutually exclusive mode.
set -u

print "Classroom Assistant"
print "1) Local classroom mode (H0; only if school policy permits the content)"
print "2) General planning mode (public/synthetic only)"
print "3) Paper/offline floor"
printf "Choose 1, 2, or 3: "
read -r choice

case "$choice" in
  1)
    if ! command -v ollama >/dev/null 2>&1; then
      print "Local H0 is unavailable. Use the printed paper floor."
      exit 2
    fi
    if ! ollama list 2>/dev/null | awk '$1 ~ /^classroom(:|$)/ { found=1 } END { exit !found }'; then
      print "The preserved classroom model was not found. Nothing was downloaded."
      exit 2
    fi
    print "LOCAL ONLY. Do not copy this session into Hermes, email, or cloud chat."
    exec ollama run classroom
    ;;
  2)
    print "This mode is PUBLIC/SYNTHETIC ONLY: no child, family, roster, allergy,"
    print "toileting, incident, assessment, photo, audio, or school-record content."
    printf "Type PUBLIC to continue: "
    read -r confirmation
    if [[ "$confirmation" != "PUBLIC" ]]; then
      print "Cancelled."
      exit 3
    fi
    if command -v classroom-teacher >/dev/null 2>&1; then
      exec classroom-teacher chat
    fi
    if command -v hermes >/dev/null 2>&1; then
      exec hermes -p classroom-teacher chat
    fi
    print "Hermes classroom profile is unavailable. Use local/paper mode."
    exit 2
    ;;
  3)
    print "Use the printed command card, triage sheet, and week-one watchlist."
    print "No software or network is required."
    ;;
  *)
    print "Cancelled: invalid choice."
    exit 3
    ;;
esac

