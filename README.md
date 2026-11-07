# Beon Code — Portuguese (Brazil) Language Pack

A declarative `pt-BR` language extension for Beon Code 0.1. No executable extension entry point or runtime permissions are included.

## Repository contents

- `extension.json` — extension metadata and locale contribution.
- `translations/main.i18n.json` — Portuguese UI strings (1,725 keys).
- `build.cjs` — minimal `.beonx` signing and packaging entry point.
- `tests/` — locale completeness and signature checks.
- `.github/workflows/release.yml` — automated signed GitHub release.

Local workspace configuration, translation generators, temporary assets, and unused publishing helpers are intentionally excluded.

## Before publishing

1. Edit `extension.json`: `publisher` must match the GitHub repository **owner** (lowercase); `id` must be `<publisher>.language-pack-pt-br`; `repository.url` must point to that owner's actual public repository. The included manifest already uses `beon-foundation` and points to `Beon-Foundation/BeonCode-Brazilian-Portuguese`.
2. Keep the official repository public; the `beon-extension` topic is optional for this official extension.
3. Generate an Ed25519 private key outside this repository. Example, from the repository root (Node.js 22+):

   ```sh
   node -e "const fs=require('node:fs');const {generateKeyPairSync}=require('node:crypto');const {privateKey}=generateKeyPairSync('ed25519');fs.writeFileSync('../publisher.private.pem',privateKey.export({type:'pkcs8',format:'pem'}),{flag:'wx',mode:0o600});"
   ```

   Back up the private key securely. Never commit it or share it publicly.
4. Add the entire PEM content as a GitHub Actions repository secret named `BEON_PUBLISHER_PRIVATE_KEY`.
5. Ensure GitHub Actions has permission to create releases (`contents: write`).

## Validate and publish

Run `npm test`, then push to the repository's `main` branch. GitHub Actions automatically
validates, signs and publishes a `.beonx` asset as a GitHub Release named for the
version in `extension.json`. The `dist/` folder is a temporary build output: it is
not meant to be committed, and the Beon Code client never reads local build outputs
from the publisher's computer.

**Required one-time setup:** configure the GitHub Actions secret
`BEON_PUBLISHER_PRIVATE_KEY` with the private Ed25519 publisher key, and allow the
workflow to create Releases with `contents: write`. Without this secret, publication
fails safely; no unsigned extension is distributed. Keep the key outside Git and
back it up securely. Never embed it in the app or repository.

Each version is immutable: increase `extension.json`'s version only when publishing a
new extension release. Changes pushed with the same already-published extension
version will not replace a signed Release. This does **not** change the public Beon
Code application version (which remains 0.1).

You may still run `npm run pack -- /secure/path/publisher.private.pem dist` for
local testing; this is optional, not part of the normal publication workflow.

## Discovery in Beon Code

The official Brazilian Portuguese repository is discovered directly by Beon Code without depending on the optional `beon-extension` GitHub topic. Installation requires a stable GitHub Release with the signed `.beonx` asset. Other extension repositories can use the topic. Refresh the Extensions view after publication.

Only `translations/main.i18n.json` contains Portuguese UI text; `localizedLanguageName` in the manifest intentionally identifies the locale as `Português (Brasil)`.

## Validation scope

`npm test` verifies locale completeness, interpolation placeholders, manifest restrictions, signature generation, and tamper detection. It does not certify the quality of every translation or prove live discovery from GitHub. Recheck the locale reference when the Beon Code UI key set changes.
