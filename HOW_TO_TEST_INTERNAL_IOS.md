# How to Update Last Player Standing on TestFlight

The app, credentials, and App Store Connect record are all fully configured. This document covers only what you need to do going forward to build a new version and push it to testers.

---

## Setup Status ✅

Everything below is already done — no action needed:

| What | Detail |
|---|---|
| Apple Developer team | Octomation Ltd (`JG655R7Z3Z`) |
| App Store Connect app | [Last Player Standing](https://appstoreconnect.apple.com/apps/6771241663/testflight/ios) (ID: `6771241663`) |
| Bundle ID | `com.manning.lastplayerstanding` — registered |
| Distribution Certificate | Serial `7BFBEDFB7A9C82008437E30490409652`, expires Apr 2027 |
| Provisioning Profile | Active, stored on EAS servers |
| Expo project | `@jordanwise/last-player-standing` |
| EAS config | `eas.json` — production profile configured |

---

## Notes on the Apple Developer Organisation

The app is registered under **Octomation Ltd** — the same Apple Developer team as other projects. This is fine for internal testing; testers don't see the organisation name. It only becomes relevant if the app is ever published publicly on the App Store.

Apple does not support moving an app between organisations. If a separate organisation is needed in future the options are:

- **Leave it as-is** — recommended while the app is in development/testing
- **Start fresh under a new org** — requires a new Apple Developer account ($99/yr), re-running `eas credentials` for the new team, creating a new App Store Connect app record, then rebuilding and resubmitting with `./scripts/build-ios-local.sh --submit`

---

## Export Compliance (Encryption)

When Apple asks *"What type of encryption algorithms does your app implement?"*, answer:

> **None of the algorithms mentioned above**

The app uses only standard HTTPS/TLS via Apple's OS networking stack — it does not implement any encryption itself. This is also declared in `app.json` via `ITSAppUsesNonExemptEncryption: false`, which should suppress the question on future builds.

---

## Releasing a New Build

### Step 1 — Bump the version in `app.json`

Each build submitted to App Store Connect must have a higher build number than the last. Open `app.json` and increment `version`:

```json
"version": "1.0.1"
```

> Apple tracks builds by version + build number. If you submit the same version string twice the upload will be rejected.

### Step 2 — Build and submit

Run the local build script from the project root:

```bash
# Build only (outputs to builds/LastPlayerStanding.ipa)
./scripts/build-ios-local.sh

# Build + submit to TestFlight in one step
./scripts/build-ios-local.sh --submit
```

The script will:
1. Run `npm install` and `pod install`
2. Compile a Release `.ipa` locally using Xcode (takes ~10–15 min)
3. Upload directly to App Store Connect via EAS

If you ran the build step separately and just want to submit the existing `.ipa`:

```bash
eas submit --platform ios --path builds/LastPlayerStanding.ipa --non-interactive
```

### Step 3 — Enable the build in TestFlight

After uploading, Apple processes the binary (usually 5–15 min). Then:

1. Go to [appstoreconnect.apple.com/apps/6771241663/testflight/ios](https://appstoreconnect.apple.com/apps/6771241663/testflight/ios)
2. Wait for the build status to change from **Processing** to **Ready to Test**
3. Under **Internal Testing**, click your group → **+** next to Builds → select the new build → **Add**
4. Testers are notified automatically by TestFlight

---

## Adding a New Tester

Internal testers must be members of your App Store Connect team first.

1. Go to [App Store Connect → Users and Access](https://appstoreconnect.apple.com/access/users)
2. Click **+**, enter their Apple ID email, assign a role (e.g. **Developer**)
3. They accept the invite email
4. Go to your app → **TestFlight → Internal Testing** → your group → **+** next to Testers
5. Add them — they'll receive a TestFlight invitation automatically

**Limit:** up to 100 internal testers. No Beta App Review required.

---

## Tester Setup (share with your tester)

1. Install **TestFlight** from the App Store (free)
2. Open the invitation email from Apple → tap **View in TestFlight**
3. Tap **Install**
4. For future updates, TestFlight notifies them automatically — they just tap **Update**

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Build rejected — duplicate version | Increment `version` in `app.json` before building |
| Build stuck on "Processing" | Normal — wait up to 30 min; check [appstoreconnect.apple.com](https://appstoreconnect.apple.com) |
| `pod install` fails | Run `pod repo update` then retry |
| Credentials error during build | Run `eas credentials --platform ios` and select production to refresh |
| Tester not receiving invite | Check they accepted the team invite first; resend from TestFlight group |
| `eas submit` auth error | Run `eas login` to re-authenticate |
