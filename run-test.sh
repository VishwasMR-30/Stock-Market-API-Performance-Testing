#!/usr/bin/env bash
# macOS / Linux helper.   Usage:  ./run-test.sh load      ./run-test.sh load -e PEAK=200
set -e
TEST="${1:-smoke}"; shift || true
docker compose run --rm \
  -e "K6_WEB_DASHBOARD_EXPORT=/results/${TEST}-report.html" \
  k6 run -o experimental-prometheus-rw \
  "--summary-export=/results/${TEST}-summary.json" \
  "$@" "/scripts/${TEST}.js"
