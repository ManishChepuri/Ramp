#!/bin/bash
# pull-comms.sh
# Run this at the start of every session to get the latest BOB_COMMS.md
# and shared Bob rules from the Development branch.
#
# It only touches BOB_COMMS.md and .bob/rules/ — nothing else in your
# branch is affected.
#
# Usage:
#   chmod +x scripts/pull-comms.sh   (first time only)
#   ./scripts/pull-comms.sh

set -e

echo ""
echo "========================================="
echo "  Ramp — Pulling latest comms from Dev   "
echo "========================================="
echo ""

# Fetch latest remote state without touching working tree
echo "→ Fetching from origin..."
git fetch origin

# Pull only BOB_COMMS.md and .bob/rules/ from Development
echo "→ Checking out BOB_COMMS.md from Development..."
git checkout origin/Development -- BOB_COMMS.md

echo "→ Checking out .bob/rules/ from Development..."
git checkout origin/Development -- .bob/rules/

echo ""
echo "✓ Done. BOB_COMMS.md and Bob rules are up to date."
echo ""
echo "  Read BOB_COMMS.md now before starting any work:"
echo "  The latest entries are at the TOP of the file."
echo ""
