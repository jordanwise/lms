#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="http://localhost:8000"
REGION="local"
TABLE="LMS"

put() {
  aws dynamodb put-item \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" \
    --table-name "$TABLE" \
    --item "$1" \
    --no-cli-pager 2>/dev/null
}

echo "🌱 Seeding sample data..."

# ─── User Profiles ───
put '{
  "PK":{"S":"USER#user-alice"},
  "SK":{"S":"PROFILE"},
  "userId":{"S":"user-alice"},
  "displayName":{"S":"Alice"},
  "preferences":{"M":{
    "notificationsEnabled":{"BOOL":true},
    "notifyOnRoundOpen":{"BOOL":true},
    "notifyOnDeadlineReminder":{"BOOL":true},
    "notifyOnResults":{"BOOL":true},
    "notifyOnElimination":{"BOOL":true},
    "theme":{"S":"dark"},
    "favouriteLeagues":{"L":[{"S":"premier-league"}]}
  }},
  "createdAt":{"S":"2026-03-01T10:00:00Z"},
  "updatedAt":{"S":"2026-03-01T10:00:00Z"}
}'

put '{
  "PK":{"S":"USER#user-bob"},
  "SK":{"S":"PROFILE"},
  "userId":{"S":"user-bob"},
  "displayName":{"S":"Bob"},
  "preferences":{"M":{
    "notificationsEnabled":{"BOOL":true},
    "notifyOnRoundOpen":{"BOOL":true},
    "notifyOnDeadlineReminder":{"BOOL":false},
    "notifyOnResults":{"BOOL":true},
    "notifyOnElimination":{"BOOL":true},
    "theme":{"S":"dark"},
    "favouriteLeagues":{"L":[{"S":"premier-league"},{"S":"championship"}]}
  }},
  "createdAt":{"S":"2026-03-01T11:00:00Z"},
  "updatedAt":{"S":"2026-03-01T11:00:00Z"}
}'

put '{
  "PK":{"S":"USER#user-charlie"},
  "SK":{"S":"PROFILE"},
  "userId":{"S":"user-charlie"},
  "displayName":{"S":"Charlie"},
  "preferences":{"M":{
    "notificationsEnabled":{"BOOL":false},
    "notifyOnRoundOpen":{"BOOL":false},
    "notifyOnDeadlineReminder":{"BOOL":false},
    "notifyOnResults":{"BOOL":false},
    "notifyOnElimination":{"BOOL":false},
    "theme":{"S":"light"},
    "favouriteLeagues":{"L":[]}
  }},
  "createdAt":{"S":"2026-03-02T09:00:00Z"},
  "updatedAt":{"S":"2026-03-02T09:00:00Z"}
}'

put '{
  "PK":{"S":"USER#user-diana"},
  "SK":{"S":"PROFILE"},
  "userId":{"S":"user-diana"},
  "displayName":{"S":"Diana"},
  "preferences":{"M":{
    "notificationsEnabled":{"BOOL":true},
    "notifyOnRoundOpen":{"BOOL":true},
    "notifyOnDeadlineReminder":{"BOOL":true},
    "notifyOnResults":{"BOOL":true},
    "notifyOnElimination":{"BOOL":true},
    "theme":{"S":"dark"},
    "favouriteLeagues":{"L":[{"S":"la-liga"}]}
  }},
  "createdAt":{"S":"2026-03-02T10:00:00Z"},
  "updatedAt":{"S":"2026-03-02T10:00:00Z"}
}'

put '{
  "PK":{"S":"USER#user-eric"},
  "SK":{"S":"PROFILE"},
  "userId":{"S":"user-eric"},
  "displayName":{"S":"Eric"},
  "preferences":{"M":{
    "notificationsEnabled":{"BOOL":true},
    "notifyOnRoundOpen":{"BOOL":true},
    "notifyOnDeadlineReminder":{"BOOL":true},
    "notifyOnResults":{"BOOL":true},
    "notifyOnElimination":{"BOOL":true},
    "theme":{"S":"dark"},
    "favouriteLeagues":{"L":[{"S":"premier-league"}]}
  }},
  "createdAt":{"S":"2026-03-03T08:00:00Z"},
  "updatedAt":{"S":"2026-03-03T08:00:00Z"}
}'

put '{
  "PK":{"S":"USER#user-fiona"},
  "SK":{"S":"PROFILE"},
  "userId":{"S":"user-fiona"},
  "displayName":{"S":"Fiona"},
  "preferences":{"M":{
    "notificationsEnabled":{"BOOL":true},
    "notifyOnRoundOpen":{"BOOL":false},
    "notifyOnDeadlineReminder":{"BOOL":true},
    "notifyOnResults":{"BOOL":true},
    "notifyOnElimination":{"BOOL":true},
    "theme":{"S":"dark"},
    "favouriteLeagues":{"L":[{"S":"premier-league"},{"S":"serie-a"}]}
  }},
  "createdAt":{"S":"2026-03-03T09:00:00Z"},
  "updatedAt":{"S":"2026-03-03T09:00:00Z"}
}'

# ─── Game Meta ───
put '{
  "PK":{"S":"GAME#game-001"},
  "SK":{"S":"META"},
  "GSI1PK":{"S":"PIN#ABC12345"},
  "gameId":{"S":"game-001"},
  "name":{"S":"Weekend Warriors"},
  "pin":{"S":"ABC12345"},
  "fee":{"N":"10"},
  "leagues":{"L":[{"S":"premier-league"}]},
  "rollover":{"BOOL":true},
  "splitPot":{"BOOL":false},
  "state":{"S":"active"},
  "roundState":{"S":"complete"},
  "currentRound":{"N":"3"},
  "creatorId":{"S":"user-alice"},
  "prizePool":{"N":"60"},
  "playerCount":{"N":"6"},
  "version":{"N":"10"},
  "createdAt":{"S":"2026-03-10T12:00:00Z"},
  "updatedAt":{"S":"2026-03-28T18:00:00Z"}
}'

# ─── Players ───
# Alice - alive (creator)
put '{
  "PK":{"S":"GAME#game-001"},
  "SK":{"S":"PLAYER#user-alice"},
  "GSI2PK":{"S":"USER#user-alice"},
  "GSI2SK":{"S":"GAME#game-001"},
  "gameId":{"S":"game-001"},
  "userId":{"S":"user-alice"},
  "displayName":{"S":"Alice"},
  "status":{"S":"alive"},
  "paidFee":{"BOOL":true},
  "gameName":{"S":"Weekend Warriors"},
  "gameState":{"S":"active"},
  "joinedAt":{"S":"2026-03-10T12:00:00Z"}
}'

# Bob - alive
put '{
  "PK":{"S":"GAME#game-001"},
  "SK":{"S":"PLAYER#user-bob"},
  "GSI2PK":{"S":"USER#user-bob"},
  "GSI2SK":{"S":"GAME#game-001"},
  "gameId":{"S":"game-001"},
  "userId":{"S":"user-bob"},
  "displayName":{"S":"Bob"},
  "status":{"S":"alive"},
  "paidFee":{"BOOL":true},
  "gameName":{"S":"Weekend Warriors"},
  "gameState":{"S":"active"},
  "joinedAt":{"S":"2026-03-10T13:00:00Z"}
}'

# Charlie - eliminated (round 2)
put '{
  "PK":{"S":"GAME#game-001"},
  "SK":{"S":"PLAYER#user-charlie"},
  "GSI2PK":{"S":"USER#user-charlie"},
  "GSI2SK":{"S":"GAME#game-001"},
  "gameId":{"S":"game-001"},
  "userId":{"S":"user-charlie"},
  "displayName":{"S":"Charlie"},
  "status":{"S":"eliminated"},
  "paidFee":{"BOOL":true},
  "gameName":{"S":"Weekend Warriors"},
  "gameState":{"S":"active"},
  "joinedAt":{"S":"2026-03-10T14:00:00Z"}
}'

# Diana - alive
put '{
  "PK":{"S":"GAME#game-001"},
  "SK":{"S":"PLAYER#user-diana"},
  "GSI2PK":{"S":"USER#user-diana"},
  "GSI2SK":{"S":"GAME#game-001"},
  "gameId":{"S":"game-001"},
  "userId":{"S":"user-diana"},
  "displayName":{"S":"Diana"},
  "status":{"S":"alive"},
  "paidFee":{"BOOL":true},
  "gameName":{"S":"Weekend Warriors"},
  "gameState":{"S":"active"},
  "joinedAt":{"S":"2026-03-10T15:00:00Z"}
}'

# Eric - eliminated (round 1)
put '{
  "PK":{"S":"GAME#game-001"},
  "SK":{"S":"PLAYER#user-eric"},
  "GSI2PK":{"S":"USER#user-eric"},
  "GSI2SK":{"S":"GAME#game-001"},
  "gameId":{"S":"game-001"},
  "userId":{"S":"user-eric"},
  "displayName":{"S":"Eric"},
  "status":{"S":"eliminated"},
  "paidFee":{"BOOL":true},
  "gameName":{"S":"Weekend Warriors"},
  "gameState":{"S":"active"},
  "joinedAt":{"S":"2026-03-11T08:00:00Z"}
}'

# Fiona - deferred (postponed match round 3)
put '{
  "PK":{"S":"GAME#game-001"},
  "SK":{"S":"PLAYER#user-fiona"},
  "GSI2PK":{"S":"USER#user-fiona"},
  "GSI2SK":{"S":"GAME#game-001"},
  "gameId":{"S":"game-001"},
  "userId":{"S":"user-fiona"},
  "displayName":{"S":"Fiona"},
  "status":{"S":"deferred"},
  "paidFee":{"BOOL":true},
  "gameName":{"S":"Weekend Warriors"},
  "gameState":{"S":"active"},
  "joinedAt":{"S":"2026-03-11T09:00:00Z"}
}'

# ─── Rounds ───
put '{
  "PK":{"S":"GAME#game-001"},
  "SK":{"S":"ROUND#0001"},
  "gameId":{"S":"game-001"},
  "roundNum":{"N":"1"},
  "state":{"S":"complete"},
  "matchday":{"S":"GW28"},
  "leagueId":{"S":"premier-league"},
  "deadline":{"S":"2026-03-15T12:30:00Z"},
  "createdAt":{"S":"2026-03-14T10:00:00Z"}
}'

put '{
  "PK":{"S":"GAME#game-001"},
  "SK":{"S":"ROUND#0002"},
  "gameId":{"S":"game-001"},
  "roundNum":{"N":"2"},
  "state":{"S":"complete"},
  "matchday":{"S":"GW29"},
  "leagueId":{"S":"premier-league"},
  "deadline":{"S":"2026-03-22T12:30:00Z"},
  "createdAt":{"S":"2026-03-21T10:00:00Z"}
}'

put '{
  "PK":{"S":"GAME#game-001"},
  "SK":{"S":"ROUND#0003"},
  "gameId":{"S":"game-001"},
  "roundNum":{"N":"3"},
  "state":{"S":"complete"},
  "matchday":{"S":"GW30"},
  "leagueId":{"S":"premier-league"},
  "deadline":{"S":"2026-03-29T12:30:00Z"},
  "createdAt":{"S":"2026-03-28T10:00:00Z"}
}'

# ─── Picks (Round 1) ───
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0001#user-alice"},"gameId":{"S":"game-001"},"roundNum":{"N":"1"},"userId":{"S":"user-alice"},"teamId":{"S":"arsenal"},"teamName":{"S":"Arsenal"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-15T10:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0001#user-bob"},"gameId":{"S":"game-001"},"roundNum":{"N":"1"},"userId":{"S":"user-bob"},"teamId":{"S":"man-city"},"teamName":{"S":"Manchester City"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-15T11:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0001#user-charlie"},"gameId":{"S":"game-001"},"roundNum":{"N":"1"},"userId":{"S":"user-charlie"},"teamId":{"S":"liverpool"},"teamName":{"S":"Liverpool"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-15T09:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0001#user-diana"},"gameId":{"S":"game-001"},"roundNum":{"N":"1"},"userId":{"S":"user-diana"},"teamId":{"S":"chelsea"},"teamName":{"S":"Chelsea"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-15T08:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0001#user-eric"},"gameId":{"S":"game-001"},"roundNum":{"N":"1"},"userId":{"S":"user-eric"},"teamId":{"S":"west-ham"},"teamName":{"S":"West Ham"},"outcome":{"S":"loss"},"pickedAt":{"S":"2026-03-15T07:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0001#user-fiona"},"gameId":{"S":"game-001"},"roundNum":{"N":"1"},"userId":{"S":"user-fiona"},"teamId":{"S":"tottenham"},"teamName":{"S":"Tottenham"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-15T06:00:00Z"}}'

# ─── Picks (Round 2) ───
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0002#user-alice"},"gameId":{"S":"game-001"},"roundNum":{"N":"2"},"userId":{"S":"user-alice"},"teamId":{"S":"man-city"},"teamName":{"S":"Manchester City"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-22T10:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0002#user-bob"},"gameId":{"S":"game-001"},"roundNum":{"N":"2"},"userId":{"S":"user-bob"},"teamId":{"S":"arsenal"},"teamName":{"S":"Arsenal"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-22T11:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0002#user-charlie"},"gameId":{"S":"game-001"},"roundNum":{"N":"2"},"userId":{"S":"user-charlie"},"teamId":{"S":"man-utd"},"teamName":{"S":"Manchester United"},"outcome":{"S":"draw"},"pickedAt":{"S":"2026-03-22T09:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0002#user-diana"},"gameId":{"S":"game-001"},"roundNum":{"N":"2"},"userId":{"S":"user-diana"},"teamId":{"S":"arsenal"},"teamName":{"S":"Arsenal"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-22T08:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0002#user-fiona"},"gameId":{"S":"game-001"},"roundNum":{"N":"2"},"userId":{"S":"user-fiona"},"teamId":{"S":"newcastle"},"teamName":{"S":"Newcastle"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-22T07:00:00Z"}}'

# ─── Picks (Round 3) ───
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0003#user-alice"},"gameId":{"S":"game-001"},"roundNum":{"N":"3"},"userId":{"S":"user-alice"},"teamId":{"S":"liverpool"},"teamName":{"S":"Liverpool"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-29T10:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0003#user-bob"},"gameId":{"S":"game-001"},"roundNum":{"N":"3"},"userId":{"S":"user-bob"},"teamId":{"S":"chelsea"},"teamName":{"S":"Chelsea"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-29T11:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0003#user-diana"},"gameId":{"S":"game-001"},"roundNum":{"N":"3"},"userId":{"S":"user-diana"},"teamId":{"S":"tottenham"},"teamName":{"S":"Tottenham"},"outcome":{"S":"win"},"pickedAt":{"S":"2026-03-29T08:00:00Z"}}'
put '{"PK":{"S":"GAME#game-001"},"SK":{"S":"PICK#0003#user-fiona"},"gameId":{"S":"game-001"},"roundNum":{"N":"3"},"userId":{"S":"user-fiona"},"teamId":{"S":"brighton"},"teamName":{"S":"Brighton"},"outcome":{"S":"postponed"},"pickedAt":{"S":"2026-03-29T07:00:00Z"}}'

# ─── Deferred Obligation (Fiona, round 3 postponement) ───
put '{
  "PK":{"S":"GAME#game-001"},
  "SK":{"S":"DEFER#user-fiona#0003"},
  "gameId":{"S":"game-001"},
  "userId":{"S":"user-fiona"},
  "roundNum":{"N":"3"},
  "originalTeamId":{"S":"brighton"},
  "resolved":{"BOOL":false}
}'

echo "✅ Seed data loaded: 6 users, 1 game, 6 players, 3 rounds, 15 picks, 1 deferred"
