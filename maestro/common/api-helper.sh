#!/usr/bin/env bash
# Helper for Maestro test flows to interact with the LMS backend
# Usage: ./api-helper.sh <command> [args...]

API_URL="${LMS_API_URL:-http://localhost:3000}"

post() {
  curl -s -X POST "$API_URL$1" -H "Content-Type: application/json" -d "$2"
}

get() {
  curl -s "$API_URL$1"
}

create_user() {
  local name="$1"
  local result
  result=$(post "/users" "{\"displayName\":\"$name\"}")
  echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('userId','test-user'))" 2>/dev/null || echo "test-user"
}

create_game() {
  local name="$1" fee="$2" leagues="$3"
  local creatorId="${4:-test-creator}"
  local result
  result=$(post "/games" "{\"name\":\"$name\",\"fee\":$fee,\"leagues\":[\"$leagues\"],\"rollover\":false,\"splitPot\":false,\"creatorId\":\"$creatorId\",\"displayName\":\"Test Creator\"}")
  local gameId
  gameId=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('gameId',''))" 2>/dev/null)
  local pin
  pin=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('pin',''))" 2>/dev/null)
  echo "$gameId $pin"
}

join_game() {
  local gameId="$1" userId="$2" displayName="${3:-Test Player}"
  post "/games/$gameId/join" "{\"userId\":\"$userId\",\"displayName\":\"$displayName\"}"
}

add_round() {
  local gameId="$1" matchday="$2" leagueId="${3:-premier-league}"
  post "/games/$gameId/rounds" "{\"matchday\":\"$matchday\",\"leagueId\":\"$leagueId\"}"
}

open_picks() {
  local gameId="$1" roundNum="$2"
  post "/games/$gameId/rounds/$roundNum/open" ""
}

submit_pick() {
  local gameId="$1" roundNum="$2" userId="$3" teamId="$4" teamName="${5:-}"
  post "/games/$gameId/rounds/$roundNum/picks" "{\"userId\":\"$userId\",\"teamId\":\"$teamId\",\"teamName\":\"${teamName:-$teamId}\"}"
}

lock_round() {
  local gameId="$1" roundNum="$2"
  post "/games/$gameId/rounds/$roundNum/lock" ""
}

submit_results() {
  local gameId="$1" roundNum="$2"
  shift 2
  local results_json="["
  local first=true
  for pair in "$@"; do
    local teamId="${pair%%:*}"
    local outcome="${pair##*:}"
    if [ "$first" = true ]; then first=false; else results_json+=","; fi
    results_json+="{\"teamId\":\"$teamId\",\"outcome\":\"$outcome\"}"
  done
  results_json+="]"
  post "/games/$gameId/rounds/$roundNum/results" "{\"results\":$results_json}"
}

apply_eliminations() {
  local gameId="$1" roundNum="$2"
  post "/games/$gameId/rounds/$roundNum/eliminate" ""
}

trigger_tick() {
  post "/tick" ""
}

get_game() {
  local gameId="$1"
  get "/games/$gameId"
}

"$@"
