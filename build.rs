fn main() {
    // Causes Rust to recompile if changes to template files, without this its only /src files
    println!("cargo:rerun-if-changed=templates");
}
