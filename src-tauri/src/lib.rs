mod logger;
mod scanner;

use scanner::{EmitFn, Network, ScanEvent};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::{AppHandle, Emitter, State};

struct LogState {
    crashed: bool,
}

#[derive(Default)]
struct ScanState {
    cancel: Mutex<Arc<AtomicBool>>,
}

#[tauri::command]
fn get_networks() -> Vec<Network> {
    scanner::networks()
}

#[tauri::command]
async fn start_scan(
    app: AppHandle,
    state: State<'_, ScanState>,
    range: String,
    threads: Option<usize>,
) -> Result<usize, String> {
    let ips = scanner::parse_range(&range)?;
    let total = ips.len();

    // Cancela un escaneo anterior (si lo hubiera) y crea un nuevo token
    let cancel = {
        let mut g = state.cancel.lock().unwrap();
        g.store(true, Ordering::Relaxed);
        let n = Arc::new(AtomicBool::new(false));
        *g = n.clone();
        n
    };

    let emit: EmitFn = Arc::new(move |ev| match ev {
        ScanEvent::Host(h) => {
            let _ = app.emit("scan-host", h);
        }
        ScanEvent::Progress { done, total } => {
            let _ = app.emit("scan-progress", serde_json::json!({ "done": done, "total": total }));
        }
        ScanEvent::Done { found, cancelled } => {
            let _ = app.emit("scan-done", serde_json::json!({ "found": found, "cancelled": cancelled }));
        }
    });

    tauri::async_runtime::spawn(scanner::run_scan(ips, threads.unwrap_or(100), cancel, emit));
    Ok(total)
}

#[tauri::command]
async fn get_info(
    ip: String,
    name: String,
    user: Option<String>,
    password: Option<String>,
) -> Result<scanner::Info, String> {
    let ip: std::net::Ipv4Addr = ip.parse().map_err(|_| "IP no válida".to_string())?;
    let cred = match (user, password) {
        (Some(u), Some(p)) if !u.trim().is_empty() => Some((u, p)),
        _ => None,
    };
    logger::log("INFO", &format!("consulta {ip} ({name}) …"));
    let r = scanner::get_info(ip, &name, cred).await;
    match &r {
        Ok(_) => logger::log("INFO", &format!("consulta {ip} correcta")),
        Err(e) => logger::log("WARN", &format!("consulta {ip} fallida: {e}")),
    }
    r
}

#[tauri::command]
fn save_file(path: String, data_base64: String) -> Result<(), String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    let bytes = STANDARD
        .decode(data_base64.trim())
        .map_err(|e| format!("Datos no válidos: {e}"))?;
    std::fs::write(&path, bytes).map_err(|e| format!("No se pudo guardar «{path}»: {e}"))
}

// ───────────── Control remoto (RDP / DameWare) ─────────────

#[derive(serde::Serialize)]
struct RemoteTools {
    rdp: bool,
    dameware: Option<String>,
}

/// Localiza DWRCC.exe (DameWare Mini Remote Control): ruta indicada en Ajustes o instalación habitual.
fn dameware_exe(custom: &str) -> Option<std::path::PathBuf> {
    use std::path::PathBuf;
    let c = custom.trim();
    if !c.is_empty() {
        let p = PathBuf::from(c);
        return p.is_file().then_some(p);
    }
    for var in ["ProgramW6432", "ProgramFiles", "ProgramFiles(x86)"] {
        let Ok(base) = std::env::var(var) else { continue };
        for vendor in ["SolarWinds", "DameWare Development", "DameWare"] {
            let dir = PathBuf::from(&base).join(vendor);
            let Ok(rd) = std::fs::read_dir(&dir) else { continue };
            for e in rd.flatten() {
                if e.file_name().to_string_lossy().to_lowercase().contains("dameware mini remote control") {
                    let exe = e.path().join("DWRCC.exe");
                    if exe.is_file() {
                        return Some(exe);
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
fn remote_tools(dameware_path: Option<String>) -> RemoteTools {
    RemoteTools {
        rdp: cfg!(windows),
        dameware: dameware_exe(&dameware_path.unwrap_or_default()).map(|p| p.display().to_string()),
    }
}

/// Ejecuta un programa del sistema sin ventana y devuelve su salida (solo Windows).
#[cfg(windows)]
fn run_cmd(program: &str, args: &[String]) -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    let out = std::process::Command::new(program)
        .args(args)
        .creation_flags(0x0800_0000)
        .output()
        .map_err(|e| format!("No se pudo ejecutar {program}: {e}"))?;
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
    if out.status.success() {
        Ok(text)
    } else {
        Err(format!("{program} falló: {}", text.trim()))
    }
}

fn open_remote_blocking(
    kind: String,
    ip: String,
    dameware_path: Option<String>,
    dameware_auth: Option<String>,
    dameware_args: Option<String>,
    user: Option<String>,
    password: Option<String>,
) -> Result<(), String> {
    let ip: std::net::Ipv4Addr = ip.parse().map_err(|_| "IP no válida".to_string())?;
    if kind == "dameware" {
        let exe = dameware_exe(&dameware_path.unwrap_or_default())
            .ok_or("No se encuentra DameWare Mini Remote Control (DWRCC.exe). Indica su ruta en Ajustes.")?;
        // -c: conecta, -m: equipo, -a:N tipo de autenticación (1 = Windows NT Challenge/Response)
        let mut args = vec!["-c:".to_string(), format!("-m:{ip}")];
        let auth = dameware_auth.unwrap_or_default();
        if !auth.trim().is_empty() && auth.trim().chars().all(|c| c.is_ascii_digit()) {
            args.push(format!("-a:{}", auth.trim()));
        }
        if let Some(extra) = dameware_args {
            args.extend(extra.split_whitespace().map(|x| x.to_string()));
        }
        logger::log("INFO", &format!("DameWare: {} {}", exe.display(), args.join(" ")));
        std::process::Command::new(exe)
            .args(&args)
            .spawn()
            .map_err(|e| format!("No se pudo abrir DameWare: {e}"))?;
        return Ok(());
    }
    #[cfg(not(windows))]
    {
        let _ = (&user, &password);
        Err("Esta acción solo está disponible en Windows".into())
    }
    #[cfg(windows)]
    {
        let unc = format!(r"\\{ip}");
        match kind.as_str() {
            "rdp" => {
                // Con usuario/contraseña de la ficha: se guardan 20 s en el Administrador de credenciales
                // de Windows para que mstsc no los pida, y se borran después.
                if let (Some(u), Some(p)) = (user.as_deref(), password.as_deref()) {
                    if !u.trim().is_empty() {
                        let target = format!("TERMSRV/{ip}");
                        let _ = run_cmd(
                            "cmdkey",
                            &[format!("/generic:{target}"), format!("/user:{u}"), format!("/pass:{p}")],
                        );
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_secs(20));
                            let _ = run_cmd("cmdkey", &[format!("/delete:{target}")]);
                        });
                    }
                }
                std::process::Command::new("mstsc.exe")
                    .arg(format!("/v:{ip}"))
                    .spawn()
                    .map_err(|e| format!("No se pudo abrir Escritorio remoto: {e}"))?;
                Ok(())
            }
            "web" => std::process::Command::new("explorer.exe")
                .arg(format!("http://{ip}"))
                .spawn()
                .map(|_| ())
                .map_err(|e| format!("No se pudo abrir el navegador: {e}")),
            "share" => std::process::Command::new("explorer.exe")
                .arg(format!(r"{unc}\C$"))
                .spawn()
                .map(|_| ())
                .map_err(|e| format!("No se pudo abrir el recurso compartido: {e}")),
            "ping" => std::process::Command::new("cmd")
                .args(["/C", "start", &format!("Ping continuo {ip}"), "cmd", "/K", &format!("ping -t {ip}")])
                .spawn()
                .map(|_| ())
                .map_err(|e| format!("No se pudo abrir el ping: {e}")),
            "shutdown" | "reboot" => {
                let flag = if kind == "shutdown" { "/s" } else { "/r" };
                run_cmd(
                    "shutdown",
                    &[
                        flag.into(),
                        "/m".into(),
                        unc,
                        "/t".into(),
                        "30".into(),
                        "/c".into(),
                        "Solicitado desde SGIIPP-IPSCANER. Se ejecutará en 30 segundos.".into(),
                    ],
                )
                .map(|_| ())
            }
            "abort" => run_cmd("shutdown", &["/a".into(), "/m".into(), unc]).map(|_| ()),
            _ => Err("Acción desconocida".into()),
        }
    }
}

#[derive(serde::Serialize)]
struct LogInfo {
    path: String,
    crashed: bool,
    text: String,
}

#[tauri::command]
fn log_event(level: String, message: String) {
    let l = match level.as_str() {
        "error" => "ERROR",
        "warn" => "WARN",
        _ => "INFO",
    };
    logger::log(l, &format!("[interfaz] {message}"));
}

#[tauri::command]
fn log_info(state: State<'_, LogState>) -> LogInfo {
    LogInfo {
        path: logger::file().display().to_string(),
        crashed: state.crashed,
        text: logger::tail(300),
    }
}

fn notes_file(dir: &str) -> std::path::PathBuf {
    let d = dir.trim();
    if d.is_empty() {
        logger::dir()
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(logger::dir)
            .join("notas.json")
    } else {
        std::path::PathBuf::from(d).join("notas.json")
    }
}

/// Lee las notas de los equipos (JSON). Si no existe el fichero, devuelve "{}".
#[tauri::command]
fn notes_load(dir: String) -> Result<String, String> {
    let f = notes_file(&dir);
    match std::fs::read_to_string(&f) {
        Ok(s) => Ok(s),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok("{}".into()),
        Err(e) => Err(format!("No se pudieron leer las notas ({}): {e}", f.display())),
    }
}

/// Guarda las notas (escritura atómica: fichero temporal + renombrado).
#[tauri::command]
fn notes_save(dir: String, json: String) -> Result<(), String> {
    let f = notes_file(&dir);
    if let Some(p) = f.parent() {
        let _ = std::fs::create_dir_all(p);
    }
    let tmp = f.with_extension("json.tmp");
    std::fs::write(&tmp, json).map_err(|e| format!("No se pudieron guardar las notas ({}): {e}", f.display()))?;
    std::fs::rename(&tmp, &f).map_err(|e| format!("No se pudieron guardar las notas ({}): {e}", f.display()))
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    // Solo enlaces de donación de PayPal y las descargas del propio repositorio
    let ok = [
        "https://www.paypal.com/",
        "https://paypal.me/",
        "https://www.paypal.me/",
        "https://github.com/marianoog1969/SGIIPP-IPSCANNER/",
    ]
        .iter()
        .any(|p| url.starts_with(p))
        && !url.contains(char::is_whitespace);
    if !ok {
        return Err("Enlace no permitido".into());
    }
    #[cfg(windows)]
    {
        std::process::Command::new("explorer.exe")
            .arg(&url)
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("No se pudo abrir el navegador: {e}"))
    }
    #[cfg(not(windows))]
    {
        Err(format!("Abre {url} en el navegador"))
    }
}

#[tauri::command]
fn open_log_dir() -> Result<(), String> {
    #[cfg(windows)]
    {
        std::process::Command::new("explorer.exe")
            .arg(logger::dir())
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("No se pudo abrir la carpeta: {e}"))
    }
    #[cfg(not(windows))]
    {
        Err(format!("Registro en {}", logger::dir().display()))
    }
}

/// Las acciones remotas se ejecutan en un hilo aparte para no bloquear la ventana.
#[tauri::command]
async fn open_remote(
    kind: String,
    ip: String,
    dameware_path: Option<String>,
    dameware_auth: Option<String>,
    dameware_args: Option<String>,
    user: Option<String>,
    password: Option<String>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        open_remote_blocking(kind, ip, dameware_path, dameware_auth, dameware_args, user, password)
    })
    .await
    .map_err(|e| format!("Error interno: {e}"))?
}

#[tauri::command]
fn stop_scan(state: State<'_, ScanState>) {
    state.cancel.lock().unwrap().store(true, Ordering::Relaxed);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logger::install_panic_hook();
    let crashed = logger::mark_start();
    logger::log(
        "INFO",
        &format!("Inicio de SGIIPP-IPSCANER v{} ({})", env!("CARGO_PKG_VERSION"), std::env::consts::OS),
    );
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ScanState::default())
        .manage(LogState { crashed })
        .invoke_handler(tauri::generate_handler![
            get_networks,
            start_scan,
            stop_scan,
            get_info,
            save_file,
            remote_tools,
            open_remote,
            log_event,
            log_info,
            open_log_dir,
            open_url,
            notes_load,
            notes_save
        ])
        .build(tauri::generate_context!())
        .unwrap_or_else(|e| {
            logger::log("ERROR", &format!("No se pudo iniciar la aplicación: {e}"));
            panic!("error al iniciar la aplicación: {e}");
        })
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                logger::log("INFO", "Cierre normal");
                logger::mark_exit();
            }
        });
}
