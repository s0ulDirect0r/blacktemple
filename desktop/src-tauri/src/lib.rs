use std::sync::Mutex;
use std::time::{Duration, SystemTime};

use serde::Deserialize;
use tauri::{Manager, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

/// Where the app opens. `BLACK_TEMPLE_URL` points it elsewhere, e.g. `http://localhost:3000/admin/sense`.
const SENSE_URL: &str = "https://www.blacktemple.dev/admin/sense";
const KEYCHAIN_SERVICE: &str = "dev.blacktemple.desktop";
const DEVICE_PREFIX: &str = "btd_";
/// Admin sessions last 8 hours; renew well before that.
const RENEW_AFTER: Duration = Duration::from_secs(6 * 60 * 60);
const CHECK_EVERY: Duration = Duration::from_secs(10 * 60);

struct Desktop {
    /// e.g. `https://www.blacktemple.dev`: the keychain account and the API base.
    origin: String,
    http: reqwest::Client,
    /// When the page last got a fresh admin session. Wall-clock, so sleep counts.
    last_session: Mutex<Option<SystemTime>>,
}

impl Desktop {
    fn keychain(&self) -> Result<keyring::Entry, String> {
        keyring::Entry::new(KEYCHAIN_SERVICE, &self.origin).map_err(|e| e.to_string())
    }

    fn device_token(&self) -> Option<String> {
        self.keychain().ok()?.get_password().ok()
    }

    fn forget_token(&self) {
        if let Ok(entry) = self.keychain() {
            let _ = entry.delete_credential();
        }
    }

    fn mark_fresh(&self) {
        *self.last_session.lock().unwrap() = Some(SystemTime::now());
    }

    /// Trade the device token for an admin session. `Ok(None)` means the server no
    /// longer knows the device (revoked), so the stored token is useless.
    async fn session(&self, device_token: &str) -> Result<Option<String>, String> {
        #[derive(Deserialize)]
        struct Session {
            token: String,
        }
        let response = self
            .http
            .post(format!("{}/api/auth/device", self.origin))
            .bearer_auth(device_token)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        match response.status() {
            s if s.is_success() => Ok(Some(response.json::<Session>().await.map_err(|e| e.to_string())?.token)),
            reqwest::StatusCode::UNAUTHORIZED => Ok(None),
            s => Err(format!("sign-in returned {s}")),
        }
    }
}

/// The page hands over a freshly minted device token after a password sign-in.
#[tauri::command]
fn remember_device(token: String, desktop: State<'_, Desktop>) -> Result<(), String> {
    if !token.starts_with(DEVICE_PREFIX) || token.len() > 200 {
        return Err("That isn't a device token.".into());
    }
    desktop.keychain()?.set_password(&token).map_err(|e| e.to_string())?;
    desktop.mark_fresh();
    Ok(())
}

/// Logging out in the app: sign the device out on the server, then drop the token.
#[tauri::command]
async fn forget_device(desktop: State<'_, Desktop>) -> Result<(), String> {
    if let Some(token) = desktop.device_token() {
        let _ = desktop
            .http
            .delete(format!("{}/api/auth/device", desktop.origin))
            .bearer_auth(&token)
            .send()
            .await;
    }
    desktop.forget_token();
    *desktop.last_session.lock().unwrap() = None;
    Ok(())
}

/// Pages on the Temple's own site stay in the app; every other link opens in the default browser.
fn stays_in_app(url: &url::Url, home: &url::Url) -> bool {
    let host = |u: &url::Url| u.host_str().map(|h| h.trim_start_matches("www.").to_owned());
    matches!(url.scheme(), "about" | "blob" | "data") || host(url) == host(home)
}

/// Runs before the page's own scripts on every load: tells the page it's in the app
/// and, when the keychain had a live device, gives it an admin session.
fn bootstrap_script(origin: &str, paired: bool, session: Option<&str>) -> String {
    let info = serde_json::json!({ "paired": paired, "deviceName": format!("Desktop app · {}", std::env::consts::OS) });
    let session = serde_json::to_string(&session).unwrap();
    let origin = serde_json::to_string(origin).unwrap();
    format!(
        r#"if (location.origin === {origin}) {{
  window.__BLACK_TEMPLE_DESKTOP__ = {info};
  const session = {session};
  if (session && !sessionStorage.getItem('adminSession')) sessionStorage.setItem('adminSession', session);
}}"#
    )
}

/// Keep the page's admin session from expiring while the app stays open.
fn keep_session_fresh(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(CHECK_EVERY).await;
            let desktop = app.state::<Desktop>();
            let due = desktop
                .last_session
                .lock()
                .unwrap()
                .is_some_and(|at| at.elapsed().map_or(true, |age| age >= RENEW_AFTER));
            let Some(token) = due.then(|| desktop.device_token()).flatten() else { continue };
            match desktop.session(&token).await {
                Ok(Some(session)) => {
                    let Some(window) = app.get_webview_window("main") else { continue };
                    let script = format!("sessionStorage.setItem('adminSession', {});", serde_json::to_string(&session).unwrap());
                    if window.eval(&script).is_ok() {
                        desktop.mark_fresh();
                    }
                }
                Ok(None) => desktop.forget_token(),
                Err(_) => {} // Offline or asleep: try again on the next check.
            }
        }
    });
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![remember_device, forget_device])
        .setup(|app| {
            let start = std::env::var("BLACK_TEMPLE_URL").unwrap_or_else(|_| SENSE_URL.to_owned());
            let home: url::Url = start.parse()?;
            let desktop = Desktop {
                origin: home.origin().ascii_serialization(),
                http: reqwest::Client::builder().timeout(Duration::from_secs(15)).build()?,
                last_session: Mutex::new(None),
            };

            // Sign in silently when the keychain holds a device the server still knows.
            let stored = desktop.device_token();
            let session = match &stored {
                Some(token) => match tauri::async_runtime::block_on(desktop.session(token)) {
                    Ok(Some(session)) => Some(session),
                    Ok(None) => {
                        desktop.forget_token();
                        None
                    }
                    Err(_) => None, // Offline: the page shows the password form.
                },
                None => None,
            };
            if session.is_some() {
                desktop.mark_fresh();
            }
            let script = bootstrap_script(&desktop.origin, desktop.device_token().is_some(), session.as_deref());
            app.manage(desktop);

            let handle = app.handle().clone();
            let nav_home = home.clone();
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(home))
                .title("Sense · Black Temple")
                .inner_size(1440.0, 900.0)
                .min_inner_size(720.0, 480.0)
                .initialization_script(&script)
                .on_navigation(move |url| {
                    if stays_in_app(url, &nav_home) {
                        return true;
                    }
                    let _ = handle.opener().open_url(url.as_str(), None::<&str>);
                    false
                })
                .build()?;

            keep_session_fresh(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Black Temple");
}
