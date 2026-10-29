//! Registro de errores: %LOCALAPPDATA%\SGIIPP-IPSCANER\logs\errores.log
use std::{
    fs,
    io::Write,
    path::PathBuf,
    sync::{Mutex, OnceLock},
};

static DIR: OnceLock<PathBuf> = OnceLock::new();
static WRITE: Mutex<()> = Mutex::new(());
const MAX_BYTES: u64 = 1_000_000;

pub fn dir() -> PathBuf {
    DIR.get_or_init(|| {
        let base = std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(std::env::temp_dir);
        let d = base.join("SGIIPP-IPSCANER").join("logs");
        let _ = fs::create_dir_all(&d);
        d
    })
    .clone()
}

pub fn file() -> PathBuf {
    dir().join("errores.log")
}

fn lock_file() -> PathBuf {
    dir().join("sesion.lock")
}

fn now() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

/// Añade una línea al registro (rota a errores.old.log al superar 1 MB). Nunca falla.
pub fn log(level: &str, msg: &str) {
    let _g = WRITE.lock().unwrap_or_else(|e| e.into_inner());
    let f = file();
    if fs::metadata(&f).map(|m| m.len() > MAX_BYTES).unwrap_or(false) {
        let _ = fs::rename(&f, dir().join("errores.old.log"));
    }
    if let Ok(mut h) = fs::OpenOptions::new().create(true).append(true).open(&f) {
        let _ = writeln!(h, "{} [{}] {}", now(), level, msg.replace('\n', "\n    "));
    }
}

/// Los fallos (panic) de cualquier hilo quedan escritos con su traza.
pub fn install_panic_hook() {
    std::panic::set_hook(Box::new(|info| {
        let bt = std::backtrace::Backtrace::force_capture();
        log("PANIC", &format!("{info}\n{bt}"));
    }));
}

/// Marca el inicio de sesión. Devuelve true si la anterior no se cerró con normalidad.
pub fn mark_start() -> bool {
    let crashed = lock_file().exists();
    if crashed {
        log("ERROR", "La sesión anterior terminó de forma inesperada (el programa se cerró sin avisar). Las últimas líneas anteriores indican qué hacía.");
    }
    let _ = fs::write(lock_file(), now());
    crashed
}

pub fn mark_exit() {
    let _ = fs::remove_file(lock_file());
}

pub fn tail(max_lines: usize) -> String {
    let t = fs::read_to_string(file()).unwrap_or_default();
    let lines: Vec<&str> = t.lines().collect();
    lines[lines.len().saturating_sub(max_lines)..].join("\n")
}
