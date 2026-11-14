# Black Temple desktop

A small native shell (Tauri 2: Rust, using macOS's own WebKit) that opens Sense at
`https://www.blacktemple.dev/admin/sense` in its own window. Links to other sites open in
the default browser.

```bash
npm install
npm run build      # → src-tauri/target/release/bundle/macos/Black Temple.app
npm run dev        # run without bundling
```

Point it at a local server with `BLACK_TEMPLE_URL=http://localhost:3000/admin/sense npm run dev`.

## Staying signed in

Sign in once with the admin password. The page then registers the app as a device
(`POST /api/sense/devices`) and hands the `btd_…` token to the app, which keeps it in the
macOS keychain. On later launches the app trades it for an 8-hour admin session
(`POST /api/auth/device`) and renews that every 6 hours while open. Logout in the app
signs the device out. Devices are listed, and can be signed out, in Sense → Agents and MCP.

The site can call only two app commands (`remember_device`, `forget_device`), and only
from blacktemple.dev or localhost (`src-tauri/capabilities/default.json`).

Builds are signed with the self-signed "Reel Code Signing" certificate in the login keychain
(`bundle.macOS.signingIdentity` in `tauri.conf.json`), so every build counts as the same app to
the keychain: click Always Allow once and rebuilds stop asking. Without that certificate the build
fails to sign; remove `signingIdentity` to fall back to an ad-hoc signature, which asks again after
every rebuild.
