fn main() {
    // Declaring the app's own commands generates permissions for them, so the
    // capability can grant exactly these two to the Temple's site and nothing else.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["remember_device", "forget_device"])),
    )
    .expect("failed to run tauri-build");
}
