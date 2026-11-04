#!/bin/sh
# compare.sh <normA> <normB>: build section (up to the last "DTS" line) as sorted sets; everything after, exactly.
split() { last=$(grep -n '^DTS ' "$1" | tail -1 | cut -d: -f1); head -n "$last" "$1" | sort > "$1.build"; tail -n +"$((last+1))" "$1" > "$1.smoke"; }
split "$1"; split "$2"
echo "build section (sorted) diff:"; diff "$1.build" "$2.build" && echo "  identical"
echo "smoke section (exact) diff:"; diff "$1.smoke" "$2.smoke" && echo "  identical ($(wc -l < "$1.smoke" | tr -d ' ') lines)"
