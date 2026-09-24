# ArchiveTuna (Android)

Spotify-style music streaming app for [Archive.org](https://archive.org) audio:
live concert tapers (etree), 78 RPM shellac (georgeblood78s), netlabels, and
general audio. Local-first: vault library, playlists, tier lists, listen
history, and offline pins live on-device — no account, no tracking.

This repo is the Android shell: a [Capacitor](https://capacitorjs.com) wrapper
around the [`ArchiveTuna` web app](https://github.com/cyberbuddhy/ArchiveTuna)
codebase, plus background-audio notification controls and the Android project.

## Build (debug APK)

Requires JDK 21 and Android SDK 36 (see `build-apk.bat` for the local paths).

```powershell
npm ci
npm run lint
npm run test -- --run
npm run mobile:apk   # build + cap sync + assembleDebug
```

The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.
`npm run mobile:sync` copies the web `dist/` into the native shell.

## Web → Android sync

`src/` and `server.ts` are synced verbatim from the web repo on every release,
except: `src/services/nativeAudio.ts`, the native wiring in
`src/context/PlayerContext.tsx`, `package.json` mobile deps, `vite.config.ts`,
`capacitor.config.ts`, and `android/` stay Android-specific.

## Release ritual (F-Droid relevant)

1. Bump `versionCode` (+1) and `versionName` (match the tag) in
   `android/app/build.gradle`.
2. Tag `vX.Y.Z`, push, cut the GitHub release with the debug APK attached.

## License

MIT — see [LICENSE](LICENSE).
