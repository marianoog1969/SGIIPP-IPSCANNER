use dns_lookup::lookup_addr;
use serde::Serialize;
use std::{
    collections::{HashMap, HashSet},
    net::{IpAddr, Ipv4Addr},
    process::Stdio,
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tokio::{net::TcpStream, process::Command, sync::Semaphore, task::JoinSet};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Serialize, Clone, Debug)]
pub struct Host {
    pub ip: String,
    pub name: String,
    pub mac: String,
    pub ms: Option<u64>,
    /// true = responde a ping; false = solo aparece en la tabla ARP
    pub alive: bool,
    /// Pista de tipo según puertos abiertos: "printer", "pc" o "" (desconocido)
    pub kind: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct Network {
    pub name: String,
    pub ip: String,
    pub cidr: String,
}

pub enum ScanEvent {
    Host(Host),
    Progress { done: usize, total: usize },
    Done { found: usize, cancelled: bool },
}

pub type EmitFn = Arc<dyn Fn(ScanEvent) + Send + Sync>;

// ───────────────────────── Rango de IPs ─────────────────────────

/// Acepta: "192.168.1.0/24", "192.168.1.1-192.168.1.50", "192.168.1.1-50", "192.168.1.7"
pub fn parse_range(s: &str) -> Result<Vec<Ipv4Addr>, String> {
    let s = s.trim();
    let bad = |what: &str| format!("{} no válida: {}", what, s);

    let (start, end) = if let Some((ip, p)) = s.split_once('/') {
        let ip: Ipv4Addr = ip.trim().parse().map_err(|_| bad("IP"))?;
        let p: u32 = p.trim().parse().map_err(|_| bad("Máscara"))?;
        if !(16..=32).contains(&p) {
            return Err("Prefijo permitido: /16 a /32".into());
        }
        let mask = u32::MAX << (32 - p);
        let net = u32::from(ip) & mask;
        let bc = net | !mask;
        if p >= 31 {
            (net, bc)
        } else {
            (net + 1, bc - 1)
        }
    } else if let Some((a, b)) = s.split_once('-') {
        let a: Ipv4Addr = a.trim().parse().map_err(|_| bad("IP inicial"))?;
        let b = b.trim();
        let end = if let Ok(full) = b.parse::<Ipv4Addr>() {
            u32::from(full)
        } else {
            let n: u8 = b.parse().map_err(|_| bad("IP final"))?;
            (u32::from(a) & 0xFFFF_FF00) | n as u32
        };
        (u32::from(a), end)
    } else {
        let ip: Ipv4Addr = s.parse().map_err(|_| bad("IP"))?;
        (u32::from(ip), u32::from(ip))
    };

    if end < start {
        return Err("La IP final es menor que la inicial".into());
    }
    if end - start >= 65_536 {
        return Err("Rango demasiado grande (máximo 65.536 direcciones)".into());
    }
    Ok((start..=end).map(Ipv4Addr::from).collect())
}

// ───────────────────────── Interfaces locales ─────────────────────────

pub fn networks() -> Vec<Network> {
    let mut out = Vec::new();
    for iface in if_addrs::get_if_addrs().unwrap_or_default() {
        if let if_addrs::IfAddr::V4(v4) = &iface.addr {
            if v4.ip.is_loopback() || v4.ip.is_link_local() {
                continue;
            }
            let mut prefix = u32::from(v4.netmask).count_ones();
            if prefix < 16 {
                prefix = 24;
            }
            let mask = u32::MAX << (32 - prefix);
            let net = Ipv4Addr::from(u32::from(v4.ip) & mask);
            out.push(Network {
                name: iface.name.clone(),
                ip: v4.ip.to_string(),
                cidr: format!("{}/{}", net, prefix),
            });
        }
    }
    out
}

/// IP local -> (nombre del equipo, MAC)
fn local_hosts() -> HashMap<Ipv4Addr, (String, String)> {
    let name = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_default();
    let default_mac = mac_address::get_mac_address()
        .ok()
        .flatten()
        .map(|m| fmt_mac(&m.bytes()))
        .unwrap_or_default();

    let mut map = HashMap::new();
    for iface in if_addrs::get_if_addrs().unwrap_or_default() {
        if let if_addrs::IfAddr::V4(v4) = &iface.addr {
            let mac = mac_address::mac_address_by_name(&iface.name)
                .ok()
                .flatten()
                .map(|m| fmt_mac(&m.bytes()))
                .unwrap_or_else(|| default_mac.clone());
            map.insert(v4.ip, (name.clone(), mac));
        }
    }
    map
}

/// MAC real de cada IP local (Windows: WMI). En equipos con varias tarjetas
/// (cable + wifi, base de conexión...) cada IP tiene su propia MAC.
#[cfg(windows)]
async fn local_macs() -> HashMap<Ipv4Addr, String> {
    let script = "[Console]::OutputEncoding=[Text.Encoding]::UTF8; \
        $r=@(Get-CimInstance Win32_NetworkAdapterConfiguration -Filter 'IPEnabled=true' | ForEach-Object { \
        $m=$_.MACAddress; foreach($i in $_.IPAddress){ [pscustomobject]@{ip=$i;mac=$m} } }); \
        ConvertTo-Json -InputObject $r -Compress";
    let mut cmd = Command::new("powershell.exe");
    cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true);
    cmd.creation_flags(CREATE_NO_WINDOW);
    let mut map = HashMap::new();
    if let Ok(Ok(out)) = tokio::time::timeout(Duration::from_secs(15), cmd.output()).await {
        let txt = String::from_utf8_lossy(&out.stdout);
        if let Ok(serde_json::Value::Array(items)) = serde_json::from_str::<serde_json::Value>(txt.trim().trim_start_matches('\u{feff}')) {
            for it in items {
                let ip = it.get("ip").and_then(|v| v.as_str()).and_then(|s| s.parse::<Ipv4Addr>().ok());
                let mac = it.get("mac").and_then(|v| v.as_str()).and_then(norm_mac);
                if let (Some(ip), Some(mac)) = (ip, mac) {
                    map.insert(ip, mac);
                }
            }
        }
    }
    map
}

#[cfg(not(windows))]
async fn local_macs() -> HashMap<Ipv4Addr, String> {
    HashMap::new()
}

// ───────────────────────── MAC / ARP ─────────────────────────

fn fmt_mac(b: &[u8; 6]) -> String {
    format!(
        "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
        b[0], b[1], b[2], b[3], b[4], b[5]
    )
}

/// Normaliza "aa-bb-cc-dd-ee-ff" / "aa:bb:..." a "AA:BB:..."; None si no es válida.
pub fn norm_mac(s: &str) -> Option<String> {
    let parts: Vec<&str> = s.split(|c| c == '-' || c == ':').collect();
    if parts.len() != 6 {
        return None;
    }
    let mut b = [0u8; 6];
    for (i, p) in parts.iter().enumerate() {
        if p.is_empty() || p.len() > 2 {
            return None;
        }
        b[i] = u8::from_str_radix(p, 16).ok()?;
    }
    if b == [0; 6] || b == [0xFF; 6] || b[0] & 1 == 1 {
        return None;
    }
    Some(fmt_mac(&b))
}

fn parse_arp_text(txt: &str) -> HashMap<Ipv4Addr, String> {
    let mut map = HashMap::new();
    for line in txt.lines() {
        let toks: Vec<&str> = line
            .split_whitespace()
            .map(|t| t.trim_matches(|c| c == '(' || c == ')'))
            .collect();
        let ip = toks.iter().find_map(|t| t.parse::<Ipv4Addr>().ok());
        let mac = toks.iter().find_map(|t| norm_mac(t));
        if let (Some(ip), Some(mac)) = (ip, mac) {
            map.insert(ip, mac);
        }
    }
    map
}

pub async fn arp_table() -> HashMap<Ipv4Addr, String> {
    // Linux: /proc/net/arp (columnas: IP, HW type, Flags, HW address, ...)
    if let Ok(txt) = tokio::fs::read_to_string("/proc/net/arp").await {
        let m = parse_arp_text(&txt);
        if !m.is_empty() {
            return m;
        }
    }
    let mut cmd = Command::new("arp");
    cmd.arg("-a")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    match tokio::time::timeout(Duration::from_secs(5), cmd.output()).await {
        Ok(Ok(out)) => parse_arp_text(&String::from_utf8_lossy(&out.stdout)),
        _ => HashMap::new(),
    }
}

// ───────────────────────── Ping ─────────────────────────

async fn ping(ip: Ipv4Addr, timeout_ms: u64) -> Option<u64> {
    let mut cmd = Command::new("ping");
    let ips = ip.to_string();
    #[cfg(windows)]
    {
        cmd.args(["-n", "1", "-w", &timeout_ms.to_string(), &ips]);
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    {
        let secs = (timeout_ms / 1000).max(1).to_string();
        cmd.args(["-c", "1", "-W", &secs, &ips]);
    }
    cmd.stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true);

    let start = Instant::now();
    let out = tokio::time::timeout(Duration::from_millis(timeout_ms + 3000), cmd.output())
        .await
        .ok()?
        .ok()?;
    let ok = if cfg!(windows) {
        // En Windows "Host de destino inaccesible" devuelve código 0: se exige TTL=
        String::from_utf8_lossy(&out.stdout)
            .to_ascii_uppercase()
            .contains("TTL=")
    } else {
        out.status.success()
    };
    ok.then(|| start.elapsed().as_millis() as u64)
}

// ───────────────────────── Nombre de equipo ─────────────────────────

#[cfg(windows)]
async fn netbios_name(ip: Ipv4Addr) -> Option<String> {
    let mut cmd = Command::new("nbtstat");
    cmd.args(["-A", &ip.to_string()])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true);
    cmd.creation_flags(CREATE_NO_WINDOW);
    let out = tokio::time::timeout(Duration::from_secs(4), cmd.output())
        .await
        .ok()?
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    for line in text.lines() {
        let l = line.to_lowercase();
        if line.contains("<00>") && !l.contains("group") && !l.contains("grupo") {
            return line.split_whitespace().next().map(|s| s.to_string());
        }
    }
    None
}

#[cfg(not(windows))]
async fn netbios_name(_ip: Ipv4Addr) -> Option<String> {
    None
}

async fn resolve_name(ip: Ipv4Addr) -> String {
    let dns = tokio::time::timeout(
        Duration::from_secs(3),
        tokio::task::spawn_blocking(move || lookup_addr(&IpAddr::V4(ip)).ok()),
    )
    .await
    .ok()
    .and_then(|r| r.ok())
    .flatten();

    match dns {
        Some(n) if n != ip.to_string() => n,
        _ => netbios_name(ip).await.unwrap_or_default(),
    }
}

/// Puertos habituales: si alguno responde, el equipo está vivo aunque bloquee el ping.
const PROBE_PORTS: [u16; 18] = [
    445, 135, 139, 3389, 22, 23, 80, 443, 8080, 8443, 9100, 515, 631, 5357, 5900, 554, 5060, 49152,
];

async fn tcp_probe(ip: Ipv4Addr) -> Option<u64> {
    let mut set = JoinSet::new();
    for port in PROBE_PORTS {
        set.spawn(async move {
            let t = Instant::now();
            match tokio::time::timeout(Duration::from_millis(600), TcpStream::connect((ip, port))).await {
                // Conexión aceptada o rechazada (RST): en ambos casos hay un equipo al otro lado
                Ok(Ok(_)) => Some(t.elapsed().as_millis() as u64),
                Ok(Err(e)) if e.kind() == std::io::ErrorKind::ConnectionRefused => Some(t.elapsed().as_millis() as u64),
                _ => None,
            }
        });
    }
    let mut best = None;
    while let Some(r) = set.join_next().await {
        if let Ok(Some(ms)) = r {
            best = Some(best.map_or(ms, |b: u64| b.min(ms)));
        }
    }
    best
}

/// Descubre si un equipo está vivo: ping, luego TCP a puertos comunes y, en rangos
/// pequeños (≤1024 IP), un segundo ping más paciente.
async fn probe_alive(ip: Ipv4Addr, small_range: bool) -> Option<u64> {
    if let Some(ms) = ping(ip, 800).await {
        return Some(ms);
    }
    if let Some(ms) = tcp_probe(ip).await {
        return Some(ms);
    }
    if small_range {
        return ping(ip, 2000).await;
    }
    None
}

/// ARP activo (Windows, API SendARP): resuelve la MAC de cualquier equipo de la misma subred,
/// aunque bloquee ping y puertos. Devuelve la MAC si el equipo existe.
#[cfg(windows)]
async fn send_arp(ip: Ipv4Addr) -> Option<String> {
    #[link(name = "iphlpapi")]
    extern "system" {
        fn SendARP(dest: u32, src: u32, mac: *mut u8, len: *mut u32) -> u32;
    }
    tokio::task::spawn_blocking(move || {
        let mut buf = [0u8; 8];
        let mut len: u32 = 6;
        let dest = u32::from_ne_bytes(ip.octets());
        let r = unsafe { SendARP(dest, 0, buf.as_mut_ptr(), &mut len) };
        if r == 0 && len >= 6 && buf[..6].iter().any(|b| *b != 0) {
            Some(
                buf[..6]
                    .iter()
                    .map(|b| format!("{:02X}", b))
                    .collect::<Vec<_>>()
                    .join(":"),
            )
        } else {
            None
        }
    })
    .await
    .ok()
    .flatten()
}

#[cfg(not(windows))]
async fn send_arp(_ip: Ipv4Addr) -> Option<String> {
    None
}

// ───────────────────────── Tipo de dispositivo ─────────────────────────

async fn port_open(ip: Ipv4Addr, port: u16) -> bool {
    matches!(
        tokio::time::timeout(Duration::from_millis(500), TcpStream::connect((ip, port))).await,
        Ok(Ok(_))
    )
}

/// Puertas de enlace predeterminadas del equipo (para marcar el router).
#[cfg(windows)]
async fn gateways() -> HashSet<Ipv4Addr> {
    let mut cmd = Command::new("route");
    cmd.args(["print", "-4", "0.0.0.0"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true);
    cmd.creation_flags(CREATE_NO_WINDOW);
    let mut set = HashSet::new();
    if let Ok(Ok(out)) = tokio::time::timeout(Duration::from_secs(4), cmd.output()).await {
        for line in String::from_utf8_lossy(&out.stdout).lines() {
            let t: Vec<&str> = line.split_whitespace().collect();
            if t.len() >= 3 && t[0] == "0.0.0.0" && t[1] == "0.0.0.0" {
                if let Ok(gw) = t[2].parse::<Ipv4Addr>() {
                    set.insert(gw);
                }
            }
        }
    }
    set
}

#[cfg(not(windows))]
async fn gateways() -> HashSet<Ipv4Addr> {
    let mut set = HashSet::new();
    if let Ok(t) = tokio::fs::read_to_string("/proc/net/route").await {
        for line in t.lines().skip(1) {
            let f: Vec<&str> = line.split_whitespace().collect();
            if f.len() > 2 && f[1] == "00000000" {
                if let Ok(v) = u32::from_str_radix(f[2], 16) {
                    set.insert(Ipv4Addr::from(v.swap_bytes()));
                }
            }
        }
    }
    set
}

/// Pista de tipo según puertos abiertos y puerta de enlace:
/// "pc" (Windows), "router", "printer", "tv", "camera" o "" (desconocido).
async fn detect_kind(ip: Ipv4Addr, gw: &HashSet<Ipv4Addr>) -> String {
    const PORTS: [u16; 11] = [9100, 515, 631, 445, 135, 53, 8001, 8002, 8008, 8009, 554];
    let mut set = JoinSet::new();
    for port in PORTS {
        set.spawn(async move { (port, port_open(ip, port).await) });
    }
    let mut open: HashSet<u16> = HashSet::new();
    while let Some(r) = set.join_next().await {
        if let Ok((port, true)) = r {
            open.insert(port);
        }
    }
    let any = |ps: &[u16]| ps.iter().any(|p| open.contains(p));
    if any(&[445, 135]) {
        "pc"
    } else if gw.contains(&ip) {
        "router"
    } else if any(&[9100, 515, 631]) {
        "printer"
    } else if any(&[8001, 8002, 8008, 8009]) {
        "tv"
    } else if open.contains(&554) {
        "camera"
    } else if open.contains(&53) {
        "router"
    } else {
        ""
    }
    .into()
}

// ───────────────────────── Escaneo ─────────────────────────

pub async fn run_scan(ips: Vec<Ipv4Addr>, threads: usize, cancel: Arc<AtomicBool>, emit: EmitFn) {
    let total = ips.len();
    let in_range: HashSet<Ipv4Addr> = ips.iter().copied().collect();
    let mut lh = local_hosts();
    for (ip, mac) in local_macs().await {
        if let Some(e) = lh.get_mut(&ip) {
            e.1 = mac;
        }
    }
    let locals = Arc::new(lh);
    let gw = Arc::new(gateways().await);
    let sem = Arc::new(Semaphore::new(threads.clamp(10, 500)));
    let done = Arc::new(AtomicUsize::new(0));
    let found: Arc<Mutex<HashSet<Ipv4Addr>>> = Arc::new(Mutex::new(HashSet::new()));
    let mut set = JoinSet::new();

    for ip in ips {
        let permit = match sem.clone().acquire_owned().await {
            Ok(p) => p,
            Err(_) => break,
        };
        if cancel.load(Ordering::Relaxed) {
            break;
        }
        let (cancel, emit, locals, done, found, gw) = (
            cancel.clone(),
            emit.clone(),
            locals.clone(),
            done.clone(),
            found.clone(),
            gw.clone(),
        );
        set.spawn(async move {
            let _permit = permit;
            if !cancel.load(Ordering::Relaxed) {
                if let Some(ms) = probe_alive(ip, total <= 1024).await {
                    let (name, mac) = match locals.get(&ip) {
                        Some((n, m)) => (n.clone(), m.clone()),
                        None => {
                            let mac = arp_table().await.get(&ip).cloned().unwrap_or_default();
                            (resolve_name(ip).await, mac)
                        }
                    };
                    found.lock().unwrap().insert(ip);
                    let kind = detect_kind(ip, &gw).await;
                    emit(ScanEvent::Host(Host {
                        ip: ip.to_string(),
                        name,
                        mac,
                        ms: Some(ms),
                        alive: true,
                        kind,
                    }));
                } else if total <= 1024 {
                    // Sin ping ni puertos: ARP activo (solo equipos de la misma subred)
                    if let Some(mac) = send_arp(ip).await {
                        let name = resolve_name(ip).await;
                        found.lock().unwrap().insert(ip);
                        let kind = detect_kind(ip, &gw).await;
                        emit(ScanEvent::Host(Host {
                            ip: ip.to_string(),
                            name,
                            mac,
                            ms: None,
                            alive: false,
                            kind,
                        }));
                    }
                }
            }
            let d = done.fetch_add(1, Ordering::Relaxed) + 1;
            if d % 4 == 0 || d == total {
                emit(ScanEvent::Progress { done: d, total });
            }
        });
    }
    while set.join_next().await.is_some() {}

    let cancelled = cancel.load(Ordering::Relaxed);

    // Equipos que no contestan al ping pero sí a ARP (firewall)
    if !cancelled {
        let arp = arp_table().await;
        let already = found.lock().unwrap().clone();
        let mut extra: Vec<(Ipv4Addr, String)> = arp
            .into_iter()
            .filter(|(ip, _)| in_range.contains(ip) && !already.contains(ip))
            .collect();
        extra.sort();
        let mut set = JoinSet::new();
        for (ip, mac) in extra {
            let (emit, found, gw) = (emit.clone(), found.clone(), gw.clone());
            set.spawn(async move {
                let name = resolve_name(ip).await;
                found.lock().unwrap().insert(ip);
                let kind = detect_kind(ip, &gw).await;
                emit(ScanEvent::Host(Host {
                    ip: ip.to_string(),
                    name,
                    mac,
                    ms: None,
                    alive: false,
                    kind,
                }));
            });
        }
        while set.join_next().await.is_some() {}
    }

    let n = found.lock().unwrap().len();
    emit(ScanEvent::Progress {
        done: done.load(Ordering::Relaxed),
        total,
    });
    emit(ScanEvent::Done {
        found: n,
        cancelled,
    });
}

// ───────────────────────── Información del equipo (WMI) ─────────────────────────

#[derive(Serialize, Clone, Debug)]
pub struct Disk {
    pub letter: String,
    pub label: String,
    pub total: u64,
    pub free: u64,
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct Info {
    pub os: Option<String>,
    pub version: Option<String>,
    pub build: Option<String>,
    pub arch: Option<String>,
    pub uptime_s: Option<f64>,
    pub ram_total: Option<u64>,
    pub ram_free: Option<u64>,
    pub user: Option<String>,
    pub last_user: Option<String>,
    pub domain: Option<String>,
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub serial: Option<String>,
    pub cpu: Option<String>,
    pub cores: Option<f64>,
    pub threads: Option<f64>,
    pub cpu_load: Option<f64>,
    pub disks: Vec<Disk>,
}

#[derive(serde::Deserialize)]
struct RawDisk {
    #[serde(rename = "DeviceID")]
    device_id: Option<String>,
    #[serde(rename = "VolumeName")]
    volume_name: Option<String>,
    #[serde(rename = "Size")]
    size: Option<u64>,
    #[serde(rename = "FreeSpace")]
    free_space: Option<u64>,
}

#[derive(serde::Deserialize, Default)]
struct RawInfo {
    os: Option<String>,
    version: Option<String>,
    build: Option<String>,
    arch: Option<String>,
    uptime_s: Option<f64>,
    ram_total: Option<u64>,
    ram_free: Option<u64>,
    user: Option<String>,
    #[serde(default)]
    last_user: Option<String>,
    domain: Option<String>,
    manufacturer: Option<String>,
    model: Option<String>,
    serial: Option<String>,
    cpu: Option<String>,
    cores: Option<f64>,
    threads: Option<f64>,
    cpu_load: Option<f64>,
    #[serde(default)]
    disks: Vec<RawDisk>,
}

fn clean(s: Option<String>) -> Option<String> {
    s.map(|v| v.trim().to_string()).filter(|v| !v.is_empty())
}

pub fn parse_info_json(json: &str) -> Result<Info, String> {
    let json = json.trim().trim_start_matches('\u{feff}');
    let r: RawInfo =
        serde_json::from_str(json).map_err(|e| format!("Respuesta WMI no válida: {e}"))?;
    Ok(Info {
        os: clean(r.os),
        version: clean(r.version),
        build: clean(r.build),
        arch: clean(r.arch),
        uptime_s: r.uptime_s,
        ram_total: r.ram_total,
        ram_free: r.ram_free,
        user: clean(r.user),
        last_user: clean(r.last_user),
        domain: clean(r.domain),
        manufacturer: clean(r.manufacturer),
        model: clean(r.model),
        serial: clean(r.serial),
        cpu: clean(r.cpu),
        cores: r.cores,
        threads: r.threads,
        cpu_load: r.cpu_load,
        disks: r
            .disks
            .into_iter()
            .map(|d| Disk {
                letter: d.device_id.unwrap_or_default(),
                label: d.volume_name.unwrap_or_default(),
                total: d.size.unwrap_or(0),
                free: d.free_space.unwrap_or(0),
            })
            .collect(),
    })
}

#[cfg(windows)]
const INFO_PS: &str = r#"
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
try {
  $s = $null
  if ($env:SCAN_LOCAL -ne '1') {
    $p = @{ ComputerName=$env:SCAN_HOST; SessionOption=(New-CimSessionOption -Protocol Dcom); OperationTimeoutSec=10 }
    if ($env:SCAN_USER) {
      $p.Credential = New-Object System.Management.Automation.PSCredential($env:SCAN_USER,(ConvertTo-SecureString $env:SCAN_PASS -AsPlainText -Force))
    }
    $s = New-CimSession @p
  }
  function Q($cls, $flt, $strict) {
    $a = @{ ClassName=$cls }
    if ($flt) { $a.Filter = $flt }
    if ($s) { $a.CimSession = $s }
    if ($strict) { Get-CimInstance @a } else { Get-CimInstance @a -ErrorAction SilentlyContinue }
  }
  try {
    $os   = Q 'Win32_OperatingSystem' $null $true
    $cs   = Q 'Win32_ComputerSystem' $null $false
    $cpu  = @(Q 'Win32_Processor' $null $false)
    $bios = Q 'Win32_BIOS' $null $false
    $dk   = @(Q 'Win32_LogicalDisk' 'DriveType=3' $false)
    $lu = $null
    try {
      $ra = @{ Namespace='root/default'; ClassName='StdRegProv'; MethodName='GetStringValue'; ErrorAction='Stop'
               Arguments=@{ hDefKey=[uint32]2147483650; sSubKeyName='SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\LogonUI'; sValueName='LastLoggedOnUser' } }
      if ($s) { $ra.CimSession = $s }
      $lu = (Invoke-CimMethod @ra).sValue
    } catch { }
  } finally { if ($s) { Remove-CimSession $s } }
  $up = $null
  if ($os.LastBootUpTime -and $os.LocalDateTime) { $up = [math]::Round(($os.LocalDateTime - $os.LastBootUpTime).TotalSeconds) }
  $load = ($cpu | Measure-Object LoadPercentage -Average).Average
  $o = [ordered]@{
    os = $os.Caption; version = $os.Version; build = $os.BuildNumber; arch = $os.OSArchitecture
    uptime_s = $up
    ram_total = [uint64]$os.TotalVisibleMemorySize * 1024
    ram_free  = [uint64]$os.FreePhysicalMemory * 1024
    user = $cs.UserName; last_user = $(if ($cs.UserName) { $cs.UserName } else { $lu }); domain = $cs.Domain; manufacturer = $cs.Manufacturer; model = $cs.Model
    serial = $bios.SerialNumber
    cpu = ($cpu | Select-Object -First 1).Name
    cores = ($cpu | Measure-Object NumberOfCores -Sum).Sum
    threads = ($cpu | Measure-Object NumberOfLogicalProcessors -Sum).Sum
    cpu_load = $load
    disks = @($dk | Select-Object DeviceID,VolumeName,Size,FreeSpace)
  }
  ConvertTo-Json -InputObject $o -Compress -Depth 4
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
"#;

/// Ficha del equipo (SO, RAM, CPU, modelo, serie, discos...) por WMI/DCOM. Solo Windows.
pub async fn get_info(
    ip: Ipv4Addr,
    name: &str,
    cred: Option<(String, String)>,
) -> Result<Info, String> {
    #[cfg(not(windows))]
    {
        let _ = (ip, name, cred);
        Err("La consulta de equipos solo está disponible en Windows".into())
    }
    #[cfg(windows)]
    {
        let is_local = local_hosts().contains_key(&ip);
        let host = if name.trim().is_empty() {
            ip.to_string()
        } else {
            name.trim().to_string()
        };
        let mut cmd = Command::new("powershell.exe");
        cmd.args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            INFO_PS,
        ])
        .env("SCAN_HOST", host)
        .env("SCAN_LOCAL", if is_local { "1" } else { "0" })
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
        if let (Some((u, p)), false) = (cred, is_local) {
            cmd.env("SCAN_USER", u).env("SCAN_PASS", p);
        }
        cmd.creation_flags(CREATE_NO_WINDOW);

        let out = tokio::time::timeout(Duration::from_secs(40), cmd.output())
            .await
            .map_err(|_| "Tiempo de espera agotado consultando el equipo".to_string())?
            .map_err(|e| format!("No se pudo ejecutar PowerShell: {e}"))?;
        if !out.status.success() {
            let err = String::from_utf8_lossy(&out.stderr);
            let msg = err
                .lines()
                .find(|l| !l.trim().is_empty())
                .unwrap_or("Error desconocido");
            return Err(msg.trim().to_string());
        }
        parse_info_json(&String::from_utf8_lossy(&out.stdout))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn info_json() {
        let j = r#"{"os":"Microsoft Windows 11 Pro","version":"10.0.22631","build":"22631","arch":"64-bit","uptime_s":93784,"ram_total":17179869184,"ram_free":6442450944,"user":"CIS\\mariano","domain":"cis.local","manufacturer":"Dell Inc.","model":"OptiPlex 7090","serial":"ABC1234","cpu":"Intel(R) Core(TM) i5-10500 ","cores":6,"threads":12,"cpu_load":7,"disks":[{"DeviceID":"C:","VolumeName":"Sistema","Size":255000000000,"FreeSpace":100000000000},{"DeviceID":"D:","VolumeName":null,"Size":null,"FreeSpace":null}]}"#;
        let i = parse_info_json(j).unwrap();
        assert_eq!(i.os.as_deref(), Some("Microsoft Windows 11 Pro"));
        assert_eq!(i.cpu.as_deref(), Some("Intel(R) Core(TM) i5-10500"));
        assert_eq!(i.disks.len(), 2);
        assert_eq!(i.disks[0].free, 100_000_000_000);
        assert_eq!(i.disks[1].total, 0);
        assert_eq!(i.cores, Some(6.0));
        assert!(parse_info_json(r#"{"os":null,"disks":[]}"#).unwrap().disks.is_empty());
        assert!(parse_info_json("basura").is_err());
    }

    #[test]
    fn rangos() {
        assert_eq!(parse_range("192.168.1.0/24").unwrap().len(), 254);
        assert_eq!(parse_range("10.0.0.5-10.0.0.9").unwrap().len(), 5);
        assert_eq!(parse_range("10.0.0.5-9").unwrap().len(), 5);
        assert_eq!(parse_range("10.0.0.5").unwrap().len(), 1);
        assert!(parse_range("10.0.0.9-5").is_err());
        assert!(parse_range("10.0.0.0/8").is_err());
        assert!(parse_range("hola").is_err());
    }

    #[test]
    fn macs_y_arp() {
        assert_eq!(norm_mac("aa-bb-cc-dd-ee-0f").unwrap(), "AA:BB:CC:DD:EE:0F");
        assert!(norm_mac("ff-ff-ff-ff-ff-ff").is_none());
        assert!(norm_mac("01-00-5e-00-00-16").is_none());
        let win = "  192.168.1.1           00-11-22-33-44-55     dinámico\n  224.0.0.22  01-00-5e-00-00-16 estático";
        let m = parse_arp_text(win);
        assert_eq!(m.len(), 1);
        assert_eq!(m[&"192.168.1.1".parse().unwrap()], "00:11:22:33:44:55");
        let lin = "? (192.168.1.7) at aa:bb:cc:dd:ee:ff [ether] on eth0";
        assert_eq!(parse_arp_text(lin).len(), 1);
    }
}
