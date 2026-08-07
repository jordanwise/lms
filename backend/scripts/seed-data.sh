#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="http://localhost:4566"
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

# ─── Mock Fixtures for GW28-GW31 ───
echo "🌱 Seeding mock fixtures..."

# GW28 fixtures (used in round 1)
put '{"PK":{"S":"FIXTURES#premier-league#GW28"},"SK":{"S":"TEAM#arsenal"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW28"},"teamId":{"S":"arsenal"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW28"},"SK":{"S":"TEAM#man-city"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW28"},"teamId":{"S":"man-city"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW28"},"SK":{"S":"TEAM#liverpool"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW28"},"teamId":{"S":"liverpool"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW28"},"SK":{"S":"TEAM#chelsea"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW28"},"teamId":{"S":"chelsea"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW28"},"SK":{"S":"TEAM#west-ham"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW28"},"teamId":{"S":"west-ham"},"result":{"S":"loss"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW28"},"SK":{"S":"TEAM#tottenham"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW28"},"teamId":{"S":"tottenham"},"result":{"S":"win"}}'

# GW29 fixtures (used in round 2)
put '{"PK":{"S":"FIXTURES#premier-league#GW29"},"SK":{"S":"TEAM#man-city"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW29"},"teamId":{"S":"man-city"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW29"},"SK":{"S":"TEAM#arsenal"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW29"},"teamId":{"S":"arsenal"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW29"},"SK":{"S":"TEAM#man-utd"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW29"},"teamId":{"S":"man-utd"},"result":{"S":"draw"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW29"},"SK":{"S":"TEAM#newcastle"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW29"},"teamId":{"S":"newcastle"},"result":{"S":"win"}}'

# GW30 fixtures (used in round 3)
put '{"PK":{"S":"FIXTURES#premier-league#GW30"},"SK":{"S":"TEAM#liverpool"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW30"},"teamId":{"S":"liverpool"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW30"},"SK":{"S":"TEAM#chelsea"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW30"},"teamId":{"S":"chelsea"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW30"},"SK":{"S":"TEAM#tottenham"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW30"},"teamId":{"S":"tottenham"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW30"},"SK":{"S":"TEAM#brighton"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW30"},"teamId":{"S":"brighton"},"result":{"S":"postponed"}}'

# GW31 fixtures — next round after the seeded GW28-30
# Generate all 20 teams with deterministic outcomes
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#arsenal"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"arsenal"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#aston-villa"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"aston-villa"},"result":{"S":"loss"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#bournemouth"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"bournemouth"},"result":{"S":"draw"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#brentford"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"brentford"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#brighton"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"brighton"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#chelsea"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"chelsea"},"result":{"S":"loss"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#crystal-palace"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"crystal-palace"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#everton"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"everton"},"result":{"S":"draw"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#fulham"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"fulham"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#ipswich"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"ipswich"},"result":{"S":"loss"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#leicester"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"leicester"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#liverpool"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"liverpool"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#man-city"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"man-city"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#man-utd"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"man-utd"},"result":{"S":"loss"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#newcastle"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"newcastle"},"result":{"S":"draw"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#nottingham-forest"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"nottingham-forest"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#southampton"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"southampton"},"result":{"S":"loss"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#tottenham"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"tottenham"},"result":{"S":"win"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#west-ham"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"west-ham"},"result":{"S":"loss"}}'
put '{"PK":{"S":"FIXTURES#premier-league#GW31"},"SK":{"S":"TEAM#wolves"},"leagueId":{"S":"premier-league"},"matchday":{"S":"GW31"},"teamId":{"S":"wolves"},"result":{"S":"draw"}}'

# ─── Second game in locked state (for tick testing) ───
echo "🌱 Seeding test game (locked round for tick processing)..."

put '{
  "PK":{"S":"GAME#game-002"},
  "SK":{"S":"META"},
  "GSI1PK":{"S":"PIN#XYZ98765"},
  "gameId":{"S":"game-002"},
  "name":{"S":"Tick Test Game"},
  "pin":{"S":"XYZ98765"},
  "fee":{"N":"5"},
  "leagues":{"L":[{"S":"premier-league"}]},
  "rollover":{"BOOL":true},
  "splitPot":{"BOOL":false},
  "state":{"S":"active"},
  "roundState":{"S":"locked"},
  "currentRound":{"N":"1"},
  "creatorId":{"S":"user-alice"},
  "prizePool":{"N":"15"},
  "playerCount":{"N":"3"},
  "version":{"N":"5"},
  "createdAt":{"S":"2026-04-01T10:00:00Z"},
  "updatedAt":{"S":"2026-04-05T12:00:00Z"}
}'

# Players for game-002
put '{
  "PK":{"S":"GAME#game-002"},"SK":{"S":"PLAYER#user-alice"},
  "GSI2PK":{"S":"USER#user-alice"},"GSI2SK":{"S":"GAME#game-002"},
  "gameId":{"S":"game-002"},"userId":{"S":"user-alice"},"displayName":{"S":"Alice"},
  "status":{"S":"alive"},"paidFee":{"BOOL":true},
  "gameName":{"S":"Tick Test Game"},"gameState":{"S":"active"},
  "joinedAt":{"S":"2026-04-01T10:00:00Z"}
}'
put '{
  "PK":{"S":"GAME#game-002"},"SK":{"S":"PLAYER#user-bob"},
  "GSI2PK":{"S":"USER#user-bob"},"GSI2SK":{"S":"GAME#game-002"},
  "gameId":{"S":"game-002"},"userId":{"S":"user-bob"},"displayName":{"S":"Bob"},
  "status":{"S":"alive"},"paidFee":{"BOOL":true},
  "gameName":{"S":"Tick Test Game"},"gameState":{"S":"active"},
  "joinedAt":{"S":"2026-04-01T11:00:00Z"}
}'
put '{
  "PK":{"S":"GAME#game-002"},"SK":{"S":"PLAYER#user-charlie"},
  "GSI2PK":{"S":"USER#user-charlie"},"GSI2SK":{"S":"GAME#game-002"},
  "gameId":{"S":"game-002"},"userId":{"S":"user-charlie"},"displayName":{"S":"Charlie"},
  "status":{"S":"alive"},"paidFee":{"BOOL":true},
  "gameName":{"S":"Tick Test Game"},"gameState":{"S":"active"},
  "joinedAt":{"S":"2026-04-01T12:00:00Z"}
}'

# Round 1 (locked) for game-002
put '{
  "PK":{"S":"GAME#game-002"},"SK":{"S":"ROUND#0001"},
  "gameId":{"S":"game-002"},"roundNum":{"N":"1"},
  "state":{"S":"locked"},"matchday":{"S":"GW31"},"leagueId":{"S":"premier-league"},
  "deadline":{"S":"2026-04-06T12:30:00Z"},"createdAt":{"S":"2026-04-05T10:00:00Z"}
}'

# Picks for game-002 round 1
put '{"PK":{"S":"GAME#game-002"},"SK":{"S":"PICK#0001#user-alice"},"gameId":{"S":"game-002"},"roundNum":{"N":"1"},"userId":{"S":"user-alice"},"teamId":{"S":"arsenal"},"teamName":{"S":"Arsenal"},"pickedAt":{"S":"2026-04-05T20:00:00Z"}}'
put '{"PK":{"S":"GAME#game-002"},"SK":{"S":"PICK#0001#user-bob"},"gameId":{"S":"game-002"},"roundNum":{"N":"1"},"userId":{"S":"user-bob"},"teamId":{"S":"chelsea"},"teamName":{"S":"Chelsea"},"pickedAt":{"S":"2026-04-05T21:00:00Z"}}'
put '{"PK":{"S":"GAME#game-002"},"SK":{"S":"PICK#0001#user-charlie"},"gameId":{"S":"game-002"},"roundNum":{"N":"1"},"userId":{"S":"user-charlie"},"teamId":{"S":"man-city"},"teamName":{"S":"Manchester City"},"pickedAt":{"S":"2026-04-05T22:00:00Z"}}'

echo "✅ Fixtures seeded: GW28-31 (4 matchdays, 40 fixture entries)"
echo "✅ Test game seeded: game-002 (locked round, 3 players, 3 picks ready for tick)"
