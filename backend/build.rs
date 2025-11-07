fn main() {
    // Skip tauri-build for now
    println!("cargo:rerun-if-changed=src/");
}
