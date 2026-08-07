#!/usr/bin/env bash
# build-ios-local.sh
# Builds the app locally using EAS (no cloud) and optionally submits to TestFlight.
#
# Usage:
#   ./scripts/build-ios-local.sh           # build only
#   ./scripts/build-ios-local.sh --submit  # build + submit to TestFlight

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/builds"
IPA_PATH="$OUTPUT_DIR/LastPlayerStanding.ipa"
SUBMIT=false

# Parse flags
for arg in "$@"; do
  case $arg in
    --submit) SUBMIT=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

cd "$ROOT_DIR"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Last Player Standing – iOS Build   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "→ Checking prerequisites..."
command -v xcodebuild >/dev/null || { echo "✗ Xcode not found. Install from the Mac App Store."; exit 1; }
command -v pod >/dev/null        || { echo "✗ CocoaPods not found. Run: sudo gem install cocoapods"; exit 1; }
command -v eas >/dev/null        || { echo "✗ EAS CLI not found. Run: npm install -g eas-cli"; exit 1; }
command -v node >/dev/null       || { echo "✗ Node.js not found."; exit 1; }
echo "  ✓ Xcode $(xcodebuild -version | head -1 | awk '{print $2}')"
echo "  ✓ CocoaPods $(pod --version)"
echo "  ✓ EAS CLI $(eas --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
echo ""

# Install JS dependencies
echo "→ Installing JS dependencies..."
npm install --silent
echo "  ✓ Done"
echo ""

# Install CocoaPods
echo "→ Installing CocoaPods dependencies..."
(cd ios && pod install --silent)
echo "  ✓ Done"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build locally via EAS (uses eas.json production profile, credentials from EAS server)
echo "→ Building iOS app locally (Release)..."
echo "  Output: $IPA_PATH"
echo ""
eas build \
  --platform ios \
  --profile production \
  --local \
  --output "$IPA_PATH"

echo ""
echo "✓ Build complete: $IPA_PATH"
echo ""

# Submit to App Store Connect / TestFlight
if [ "$SUBMIT" = true ]; then
  echo "→ Submitting to App Store Connect..."
  eas submit \
    --platform ios \
    --path "$IPA_PATH" \
    --non-interactive
  echo ""
  echo "✓ Submitted! Check TestFlight at:"
  echo "  https://appstoreconnect.apple.com/apps/6771241663/testflight/ios"
else
  echo "To submit this build to TestFlight, run:"
  echo "  ./scripts/build-ios-local.sh --submit"
  echo "  or: eas submit --platform ios --path \"$IPA_PATH\" --non-interactive"
fi

echo ""
