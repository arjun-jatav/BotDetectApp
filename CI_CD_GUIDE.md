# Enterprise CI/CD Pipeline Guide

This repository is equipped with fully automated continuous integration (CI) and continuous delivery (CD) workflows powered by **GitHub Actions**.

---

## 1. CI Pipeline (`.github/workflows/ci.yml`)

### Triggers
- **Push** to `main`, `master`, or `develop` branches.
- **Pull Requests** targeting `main`, `master`, or `develop`.
- **Manual dispatch** via the GitHub Actions tab.

### Stages
1. **Quality Gate (`quality-gate`)**:
   - Runs on `ubuntu-latest`.
   - Executes ESLint (`npm run lint`), TypeScript compiler check (`npm run typecheck`), and Jest unit tests with coverage (`npm run test:coverage`).
   - Automatically uploads test coverage reports as a build artifact.
2. **Android Build Verification (`android-build-check`)**:
   - Runs on `ubuntu-latest`.
   - Configures Java 17 (Zulu), restores Gradle caches, and compiles an `assembleDebug` APK.
   - Uploads Debug APK artifacts for preview testing.
3. **iOS Build Verification (`ios-build-check`)**:
   - Runs on `macos-latest`.
   - Configures Ruby, Bundler, and CocoaPods with caching.
   - Runs `xcodebuild` targeting iOS Simulator (`iPhone 16`) to guarantee that native iOS code compiles without errors.

---

## 2. CD Android Release Pipeline (`.github/workflows/cd-android.yml`)

### Triggers
- **Git Tag Push**: Pushing a tag matching `v*.*.*` (e.g. `git tag v1.0.0 && git push origin v1.0.0`).
- **Manual Trigger**: Via `workflow_dispatch` with option to build `aab`, `apk`, or `both`.

### Outputs
- Signed **Android App Bundle (AAB)** (`android/app/build/outputs/bundle/release/*.aab`) ready for Google Play Console.
- Signed **Universal APK** (`android/app/build/outputs/apk/release/*.apk`).
- Automatic **GitHub Release** creation with attached binary assets and auto-generated release notes.

---

## 3. CD iOS Release Pipeline (`.github/workflows/cd-ios.yml`)

### Triggers
- **Git Tag Push**: Pushing a tag matching `v*.*.*`.
- **Manual Trigger**: Via `workflow_dispatch`.

### Outputs
- Signed **iOS Application Archive (`.ipa`)** ready for Apple TestFlight and App Store submission.
- Automatic **GitHub Release** artifact attachment.

---

## 4. Required GitHub Repository Secrets

Configure these in **GitHub Repository ➔ Settings ➔ Secrets and variables ➔ Actions**:

### Android Signing Secrets
| Secret Name | Description |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded release `.keystore` file (`base64 -i my-release-key.keystore \| pbcopy`) |
| `ANDROID_KEY_ALIAS` | Keystore key alias (e.g., `botdetect-key-alias`) |
| `ANDROID_KEYSTORE_PASSWORD`| Keystore master password |
| `ANDROID_KEY_PASSWORD` | Key password |

### iOS Signing Secrets
| Secret Name | Description |
|---|---|
| `APPLE_CERTIFICATE_BASE64` | Base64-encoded distribution `.p12` certificate |
| `APPLE_CERTIFICATE_PASSWORD`| Password for the `.p12` certificate |
| `APPLE_PROVISIONING_PROFILE_BASE64` | Base64-encoded `.mobileprovision` profile |
| `KEYCHAIN_PASSWORD` | Optional temporary keychain password |

---

## 5. Local Quality Scripts

You can run any part of the CI check locally before committing:

```bash
# Run full quality gate (Lint + Typecheck + Tests)
npm run ci:check

# Run linter
npm run lint

# Run TypeScript type validation
npm run typecheck

# Run unit tests with code coverage
npm run test:coverage
```
