import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

import {
  Host,
  Network,
  Info,
  InfoState,
  fmtUptime,
  diskPct,
  lightClass,
  worstDisk,
  diskText,
  diskAlerts,
  pctClass,
  ficha,
  SortKey,
  userOf,
  fmtRam,
  shortOs,
  fmtBytes,
  ipNum,
  deviceKind,
} from "./lib";
import { DEFAULT_COLS, Row } from "./columns";
import { saveBytes } from "./files";
import Manual from "./Manual";
import ReportDialog from "./ReportDialog";
import { confirm } from "@tauri-apps/plugin-dialog";
import DeviceIcon from "./DeviceIcon";
import NewsDialog from "./NewsDialog";
import LogDialog from "./LogDialog";
import AboutDialog from "./AboutDialog";
import { logEvent } from "./log";
import { t, tn, setLang, initialLang, locale } from "./i18n";
import DonateButton from "./DonateButton";
import { loadNotes, setNote, getNote, noteText } from "./notes";
import SettingsDialog, { DEFAULT_SETTINGS, Settings } from "./SettingsDialog";

function AlertIcon({ info }: { info?: Info }) {
  if (!info) return null;
  const a = diskAlerts(info);
  if (!a.length) return null;
  const tip = a
    .map((x) => `${x.d.letter} ${x.d.label}`.trim() + `: ${t("{p}% ocupado ({free} libres)", { p: x.p, free: fmtBytes(x.d.free) })}`)
    .join("\n");
  return (
    <span className="alert bad" title={tip}>
      ⚠
    </span>
  );
}

const PREFS = "ipscanner.prefs.v1";
interface Prefs {
  range?: string;
  autoCheck?: boolean;
  onlyAlerts?: boolean;
  kindFilter?: string;
  tcols?: string[];
  twidth?: Record<string, number>;
  hideNews?: boolean;
  sort?: { key: SortKey; asc: boolean };
  settings?: Settings;
  reportCols?: string[];
}
const loadPrefs = (): Prefs => {
  try {
    return JSON.parse(localStorage.getItem(PREFS) ?? "{}");
  } catch {
    return {};
  }
};

const LAST = "ipscanner.lastscan.v1";
interface LastScan {
  at: number;
  ips: string[];
}
const loadLast = (): LastScan | null => {
  try {
    const v = JSON.parse(localStorage.getItem(LAST) ?? "null");
    return v && Array.isArray(v.ips) ? v : null;
  } catch {
    return null;
  }
};

const TCOL_KEYS = ["name", "ip", "mac", "user", "os", "ram", "disk", "ms", "note"];
const DEFAULT_TCOLS = ["name", "ip", "mac", "user", "os", "ram", "disk", "ms"];

export default function App() {
  const prefs = useRef<Prefs>(loadPrefs()).current;
  const [prevScan, setPrevScan] = useState<LastScan | null>(null);
  const prevSet = useMemo(() => new Set(prevScan?.ips ?? []), [prevScan]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [range, setRange] = useState(prefs.range ?? "");
  const [hosts, setHosts] = useState<Map<string, Host>>(new Map());
  const hostsRef = useRef<Map<string, Host>>(new Map());
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>(prefs.sort ?? { key: "ip", asc: true });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const unlisten = useRef<UnlistenFn[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [infos, setInfos] = useState<Map<string, InfoState>>(new Map());
  const [cred, setCred] = useState({ user: "", pass: "" });
  const [autoCheck, setAutoCheck] = useState(prefs.autoCheck ?? true);
  const [onlyAlerts, setOnlyAlerts] = useState(prefs.onlyAlerts ?? false);
  const [kindFilter, setKindFilter] = useState<string>(prefs.kindFilter || "all");
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS, ...prefs.settings });
  setLang(initialLang(settings.lang));
  const [reportCols, setReportCols] = useState<string[]>(prefs.reportCols ?? DEFAULT_COLS);
  const [dialog, setDialog] = useState<null | "report" | "manual" | "news" | "log" | "about">(prefs.hideNews ? null : "news");
  const [hideNews, setHideNews] = useState(prefs.hideNews ?? false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [quick, setQuick] = useState<"" | "new" | "noaccess">("");
  const [tcols, setTcols] = useState<string[]>(prefs.tcols ?? DEFAULT_TCOLS);
  const [twidth, setTwidth] = useState<Record<string, number>>(prefs.twidth ?? {});
  const [colMenu, setColMenu] = useState<null | { top: number; left: number }>(null);
  const [notesVer, setNotesVer] = useState(0);
  const [notesLoads, setNotesLoads] = useState(0);
  const resized = useRef(false);
  const lastChecked = useRef<string | null>(null);
  const shiftHeld = useRef(false);
  const [menu, setMenu] = useState<{ x: number; y: number; h: Host } | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS, JSON.stringify({ range, autoCheck, onlyAlerts, kindFilter, hideNews, sort, settings, reportCols, tcols, twidth }));
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  }, [range, autoCheck, onlyAlerts, kindFilter, hideNews, sort, settings, reportCols, tcols, twidth]);

  // El texto de estado del pie queda en el idioma antiguo: se limpia al cambiar de idioma
  useEffect(() => {
    setMsg("");
  }, [settings.lang]);

  const notify = (text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1800);
  };
  const userOfHost = (h: Host) => userOf(infos.get(h.ip)?.info);
  const osOf = (h: Host) => shortOs(infos.get(h.ip)?.info?.os);
  const ramOf = (h: Host) => infos.get(h.ip)?.info?.ram_total ?? 0;
  const worstOf = (h: Host) => {
    const i = infos.get(h.ip)?.info;
    return i ? worstDisk(i)?.p ?? -1 : -1;
  };

  const loadInfo = useCallback(
    async (h: Host, useCred: boolean) => {
      const set = (s: InfoState) => setInfos((p) => new Map(p).set(h.ip, s));
      set({ loading: true });
      try {
        const withCred = useCred && cred.user.trim() !== "";
        const info = await invoke<Info>("get_info", {
          ip: h.ip,
          name: h.name,
          user: withCred ? cred.user : null,
          password: withCred ? cred.pass : null,
        });
        set({ loading: false, info });
      } catch (e) {
        set({ loading: false, error: String(e) });
      }
    },
    [cred]
  );

  // Comprobación de discos en segundo plano (equipos simultáneos según Ajustes) al terminar el escaneo
  useEffect(() => {
    if (scanning || !autoCheck) return;
    const pending = [...hosts.values()].filter((h) => !infos.has(h.ip));
    const running = [...infos.values()].filter((i) => i.loading).length;
    pending.slice(0, Math.max(0, settings.consultas - running)).forEach((h) => loadInfo(h, false));
  }, [scanning, autoCheck, hosts, infos, loadInfo, settings.consultas]);

  const select = (h: Host) => {
    setSelected(h.ip);
    if (!infos.has(h.ip)) loadInfo(h, false);
  };

  // Eventos del backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const subs = [
        await listen<Host>("scan-host", (e) =>
          setHosts((prev) => new Map(prev).set(e.payload.ip, e.payload))
        ),
        await listen<{ done: number; total: number }>("scan-progress", (e) =>
          setProgress(e.payload)
        ),
        await listen<{ found: number; cancelled: boolean }>("scan-done", (e) => {
          setScanning(false);
          logEvent("info", `Escaneo ${e.payload.cancelled ? "detenido" : "completado"}: ${e.payload.found} equipos`);
          if (!e.payload.cancelled) {
            try {
              localStorage.setItem(LAST, JSON.stringify({ at: Date.now(), ips: [...hostsRef.current.keys()] }));
            } catch {
              /* sin almacenamiento */
            }
          }
          setMsg(
            e.payload.cancelled
              ? t("Escaneo detenido · {n} equipos", { n: e.payload.found })
              : t("Escaneo completado · {n} equipos", { n: e.payload.found })
          );
        }),
      ];
      if (cancelled) subs.forEach((u) => u());
      else unlisten.current = subs;
    })();
    return () => {
      cancelled = true;
      unlisten.current.forEach((u) => u());
    };
  }, []);

  // Redes locales detectadas
  useEffect(() => {
    invoke<Network[]>("get_networks")
      .then((n) => {
        setNetworks(n);
        if (n.length) setRange((r) => r || n[0].cidr);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const start = useCallback(async () => {
    logEvent("info", `Escaneo iniciado: ${range} (${settings.hilos} hilos)`);
    setError("");
    setMsg("");
    setPrevScan(loadLast());
    setMarked(new Set());
    setHosts(new Map());
    setSelected(null);
    setInfos(new Map());
    setProgress({ done: 0, total: 0 });
    try {
      const total = await invoke<number>("start_scan", { range, threads: settings.hilos });
      setProgress({ done: 0, total });
      setScanning(true);
    } catch (e) {
      setError(String(e));
    }
  }, [range, settings.hilos]);

  // Si la sesión anterior se cerró sin avisar, se abre el registro automáticamente
  useEffect(() => {
    invoke<{ crashed: boolean }>("log_info")
      .then((i) => i?.crashed && setDialog("log"))
      .catch(() => {});
  }, []);

  const stop = () => invoke("stop_scan");

  hostsRef.current = hosts;

  const groupOf = (h: Host): string => {
    const k = deviceKind(h, infos.get(h.ip)?.info);
    return k === "server" ? "pc" : k === "camera" ? "other" : k;
  };
  const kindCount = useMemo(() => {
    const c: Record<string, number> = { pc: 0, printer: 0, router: 0, tv: 0, phone: 0, other: 0 };
    hosts.forEach((h) => {
      c[groupOf(h)]++;
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hosts, infos]);

  useEffect(() => {
    loadNotes(settings.notesDir).then(() => {
      setNotesVer((v) => v + 1);
      setNotesLoads((v) => v + 1);
    });
  }, [settings.notesDir]);

  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    let list = [...hosts.values()];
    if (onlyAlerts)
      list = list.filter((h) => {
        const i = infos.get(h.ip)?.info;
        return i ? diskAlerts(i).length > 0 : false;
      });
    if (kindFilter !== "all") list = list.filter((h) => groupOf(h) === kindFilter);
    if (quick === "new") list = list.filter((h) => prevScan && !prevSet.has(h.ip));
    if (quick === "noaccess") list = list.filter((h) => !!infos.get(h.ip)?.error);
    if (f)
      list = list.filter((h) =>
        `${h.name} ${h.ip} ${h.mac} ${userOfHost(h)} ${infos.get(h.ip)?.info?.last_user ?? ""} ${infos.get(h.ip)?.info?.user ?? ""} ${noteText(h)}`.toLowerCase().includes(f)
      );
    const dir = sort.asc ? 1 : -1;
    list.sort((a, b) => {
      switch (sort.key) {
        case "ip":
          return (ipNum(a.ip) - ipNum(b.ip)) * dir;
        case "ms":
          return ((a.ms ?? 1e9) - (b.ms ?? 1e9)) * dir;
        case "user":
          return (userOfHost(a) || "\uffff").localeCompare(userOfHost(b) || "\uffff") * dir;
        case "os":
          return (osOf(a) || "\uffff").localeCompare(osOf(b) || "\uffff") * dir;
        case "ram":
          return ((ramOf(a) || 1e18) - (ramOf(b) || 1e18)) * dir;
        case "disk":
          return ((worstOf(a) < 0 ? 1e9 : worstOf(a)) - (worstOf(b) < 0 ? 1e9 : worstOf(b))) * dir;
        default:
          return a[sort.key].localeCompare(b[sort.key]) * dir;
      }
    });
    return list;
  }, [hosts, filter, sort, onlyAlerts, kindFilter, infos, quick, prevScan, prevSet, notesVer]);

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === "F1") {
        e.preventDefault();
        setDialog("manual");
        return;
      }
      if (e.key === "Escape" && marked.size > 0 && !dialog && !showSettings && !menu) {
        setMarked(new Set());
        return;
      }
      if (e.key === "Escape") {
        if (showSettings) setShowSettings(false);
        else if (dialog) setDialog(null);
        else if (document.activeElement === filterRef.current && filter) setFilter("");
        else if (menu) setMenu(null);
        else if (selected) setSelected(null);
        return;
      }
      if (dialog || showSettings) return;
      if (ctrl && !typing && e.key.toLowerCase() === "a") {
        e.preventDefault();
        markVisible();
        return;
      }
      if (ctrl && !typing && e.key.toLowerCase() === "i") {
        e.preventDefault();
        invertMarked();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "f") {
        e.preventDefault();
        filterRef.current?.focus();
        filterRef.current?.select();
        return;
      }
      if (e.key === "F5" || (ctrl && e.key.toLowerCase() === "r")) {
        e.preventDefault();
        if (!scanning && range.trim()) start();
        return;
      }
      if (typing || (e.key !== "ArrowDown" && e.key !== "ArrowUp") || !rows.length) return;
      e.preventDefault();
      const i = rows.findIndex((h) => h.ip === selected);
      const n =
        e.key === "ArrowDown" ? Math.min(rows.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
      select(rows[n]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    document.querySelector("tr.sel")?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const infoCell = (h: Host, v: string | null, label = "—") => {
    const s = infos.get(h.ip);
    if (!s) return autoCheck ? <span className="skel" /> : <span className="muted">—</span>;
    if (s.loading) return <span className="skel" />;
    if (s.error)
      return (
        <span className="muted" title={`${t("No se pudo consultar")}: ${s.error}`}>
          {label}
        </span>
      );
    return v ?? <span className="muted">—</span>;
  };

  const diskCell = (h: Host) => {
    const i = infos.get(h.ip)?.info;
    const w = i ? worstDisk(i) : null;
    if (!i || !w) return infoCell(h, i ? t("Sin discos") : null);
    const tip = i.disks
      .filter((d) => d.total > 0)
      .map((d) => `${`${d.letter} ${d.label}`.trim()}: ${t("{p}% ocupado ({free} libres)", { p: diskPct(d), free: fmtBytes(d.free) })}`)
      .join("\n");
    return (
      <span className="light" title={tip}>
        <span className={`dot ${lightClass(w.p)}`} /> {w.p}% · {w.d.letter}
      </span>
    );
  };

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }));

  const arrow = (k: SortKey) => (sort.key === k ? (sort.asc ? " ▲" : " ▼") : "");

  const [remote, setRemote] = useState<{ rdp: boolean; dameware: string | null }>({ rdp: false, dameware: null });
  useEffect(() => {
    invoke<{ rdp: boolean; dameware: string | null }>("remote_tools", { damewarePath: settings.dameware })
      .then((r) => r && setRemote(r))
      .catch(() => {});
  }, [settings.dameware]);

  type RemoteKind = "rdp" | "dameware" | "web" | "share" | "ping" | "shutdown" | "reboot" | "abort";
  const REMOTE_MSG = (k: RemoteKind) =>
    ({
      rdp: t("Escritorio remoto: conectando a"),
      dameware: t("DameWare: conectando a"),
      web: t("Abriendo en el navegador"),
      share: t("Abriendo recurso compartido de"),
      ping: t("Ping continuo a"),
      shutdown: t("Apagado en 30 s:"),
      reboot: t("Reinicio en 30 s:"),
      abort: t("Apagado cancelado:"),
    })[k];
  const openRemote = async (kind: RemoteKind, h: Host) => {
    const label = h.name ? `${h.name} (${h.ip})` : h.ip;
    if (kind === "shutdown" || kind === "reboot") {
      const ok = await confirm(
        t(kind === "shutdown" ? "¿Apagar el equipo {label}?" : "¿Reiniciar el equipo {label}?", { label }) +
          "\n\n" +
          t("Se ejecutará en 30 segundos con tu usuario de Windows (necesita permisos de administrador en ese equipo). Podrás cancelarlo desde el menú."),
        { title: kind === "shutdown" ? t("Apagar equipo") : t("Reiniciar equipo"), kind: "warning", okLabel: kind === "shutdown" ? t("Apagar") : t("Reiniciar"), cancelLabel: t("Cancelar") }
      );
      if (!ok) return;
    }
    try {
      await invoke("open_remote", {
        kind,
        ip: h.ip,
        damewarePath: settings.dameware,
        damewareAuth: settings.damewareAuth,
        damewareArgs: settings.damewareArgs,
        user: cred.user || null,
        password: cred.user ? cred.pass : null,
      });
      notify(`${REMOTE_MSG(kind)} ${label}`);
    } catch (e) {
      logEvent("warn", `Acción remota ${kind} sobre ${h.ip}: ${e}`);
      setError(String(e));
    }
  };

  const ownIps = useMemo(() => new Set(networks.map((n) => n.ip)), [networks]);
  const saveNote = (h: Host, patch: { ubic?: string; nota?: string }) => {
    const cur = getNote(h) ?? { nota: "", ubic: "" };
    const next = { ...cur, ...patch };
    if (next.nota.trim() === cur.nota && next.ubic.trim() === cur.ubic) return;
    setNote(h, next, settings.notesDir, (m) => setError(m));
    setNotesVer((v) => v + 1);
  };

  const markVisible = () => setMarked((p) => new Set([...p, ...rows.map((h) => h.ip)]));
  const invertMarked = () =>
    setMarked((p) => {
      const n = new Set(p);
      rows.forEach((h) => (n.has(h.ip) ? n.delete(h.ip) : n.add(h.ip)));
      return n;
    });

  const toggleCheck = (ip: string, on?: boolean) =>
    setMarked((p) => {
      const n = new Set(p);
      (on ?? !n.has(ip)) ? n.add(ip) : n.delete(ip);
      return n;
    });
  const checkRange = (to: string) => {
    const ips = rows.map((h) => h.ip);
    const a = ips.indexOf(lastChecked.current ?? to);
    const b = ips.indexOf(to);
    if (a < 0 || b < 0) return toggleCheck(to, true);
    setMarked((p) => {
      const n = new Set(p);
      ips.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((ip) => n.add(ip));
      return n;
    });
  };

  const bulkPower = async (kind: "shutdown" | "reboot" | "abort") => {
    const all = [...hosts.values()].filter((h) => marked.has(h.ip));
    const targets = all.filter((h) => !ownIps.has(h.ip));
    const skipped = all.length - targets.length;
    if (!targets.length) return setError(t("No hay equipos válidos: este propio equipo no se apaga ni reinicia desde aquí."));
    const verb = kind === "shutdown" ? t("Apagar") : t("Reiniciar");
    if (kind !== "abort") {
      const names = targets.slice(0, 12).map((h) => `• ${h.name || h.ip} (${h.ip})`).join("\n");
      const more = targets.length > 12 ? `\n${t("… y {n} más", { n: targets.length - 12 })}` : "";
      const q = kind === "shutdown" ? tn(targets.length, "¿Apagar {n} equipo?", "¿Apagar {n} equipos?") : tn(targets.length, "¿Reiniciar {n} equipo?", "¿Reiniciar {n} equipos?");
      const ok = await confirm(
        `${q}\n\n${names}${more}\n\n${t("Se ejecutará en 30 segundos con tu usuario de Windows y podrás cancelarlo desde esta barra.")}${skipped ? `\n\n${t("(Este propio equipo se ha excluido.)")}` : ""}`,
        { title: q, kind: "warning", okLabel: verb, cancelLabel: t("Cancelar") }
      );
      if (!ok) return;
    }
    logEvent("info", `${kind} masivo sobre ${targets.length} equipos: ${targets.map((h) => h.ip).join(", ")}`);
    const res = await Promise.allSettled(
      targets.map((h) =>
        invoke("open_remote", { kind, ip: h.ip, damewarePath: "", damewareAuth: "", damewareArgs: "", user: null, password: null })
      )
    );
    const fails = res
      .map((r, i) => (r.status === "rejected" ? `${targets[i].name || targets[i].ip}: ${r.reason}` : null))
      .filter(Boolean) as string[];
    fails.forEach((f) => logEvent("warn", `${kind} masivo: ${f}`));
    const okN = targets.length - fails.length;
    notify(`${REMOTE_MSG(kind)} ${tn(okN, "{n} equipo", "{n} equipos")}${fails.length ? ` · ${t("{n} con error", { n: fails.length })}` : ""}`);
    if (fails.length) setError(`${t("{n} equipo(s) con error:", { n: fails.length })}\n${fails.slice(0, 5).join("\n")}${fails.length > 5 ? "\n…" : ""}`);
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(t("{what} copiado", { what }));
    } catch {
      setError(t("No se pudo copiar al portapapeles"));
    }
  };

  const toTable = (sep: string) =>
    [
      [t("Nombre"), "IP", "MAC", t("Sistema"), "RAM", t("Almacenamiento")].join(sep),
      ...rows.map((h) =>
        [h.name, h.ip, h.mac, osOf(h), ramOf(h) ? fmtRam(ramOf(h)) : "", diskText(infos.get(h.ip)?.info)].join(sep)
      ),
    ].join("\n");

  const exportCsv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv =
      "﻿" +
      [
        [t("Nombre"), "IP", "MAC", t("Sistema"), "RAM", t("Almacenamiento")].join(";"),
        ...rows.map((h) =>
          [h.name, h.ip, h.mac, osOf(h), ramOf(h) ? fmtRam(ramOf(h)) : "", diskText(infos.get(h.ip)?.info)]
            .map(esc)
            .join(";")
        ),
      ].join("\r\n");
    saveBytes(
      `${t("escaneo_red")}_${new Date().toISOString().slice(0, 10)}.csv`,
      t("CSV (Excel)"),
      "csv",
      new TextEncoder().encode(csv)
    )
      .then((path) => path && notify(t("CSV guardado")))
      .catch((e) => setError(String(e)));
  };

  const sel = selected ? hosts.get(selected) : undefined;
  const ds = sel ? infos.get(sel.ip) : undefined;
  const info = ds?.info;
  const row = (k: string, v: string | null | undefined) =>
    v ? (
      <>
        <dt>{k}</dt>
        <dd onDoubleClick={() => copy(v, k)}>{v}</dd>
      </>
    ) : null;
  const meter = (label: string, p: number, detail: string) => (
    <div className="disk">
      <div className="disk-top">
        <span>{label}</span>
        <b>{p}%</b>
      </div>
      <div className="meter">
        <div className={pctClass(p)} style={{ width: `${p}%` }} />
      </div>
      <div className="muted small">{detail}</div>
    </div>
  );

  type TCol = { key: string; label: string; sort?: SortKey; num?: boolean; td: (h: Host) => JSX.Element };
  const TCOLS: TCol[] = [
    {
      key: "name",
      label: t("Nombre del equipo"),
      sort: "name",
      td: (h) => (
        <td key="name" onDoubleClick={() => h.name && copy(h.name, t("Nombre"))}>
          <DeviceIcon kind={deviceKind(h, infos.get(h.ip)?.info)} />
          {h.name || <span className="muted">—</span>}
          {prevScan && !prevSet.has(h.ip) && (
            <span className="badge-nuevo" title={t("No estaba en el escaneo anterior")}>{t("Nuevo")}</span>
          )}
          <AlertIcon info={infos.get(h.ip)?.info} />
        </td>
      ),
    },
    { key: "ip", label: t("Dirección IP"), sort: "ip", td: (h) => <td key="ip" className="mono" onDoubleClick={() => copy(h.ip, "IP")}>{h.ip}</td> },
    {
      key: "mac",
      label: t("Dirección MAC"),
      sort: "mac",
      td: (h) => (
        <td key="mac" className="mono" onDoubleClick={() => h.mac && copy(h.mac, "MAC")}>
          {h.mac || <span className="muted">—</span>}
        </td>
      ),
    },
    { key: "user", label: t("Último usuario"), sort: "user", td: (h) => <td key="user" className="user" title={userOfHost(h)}>{infoCell(h, userOfHost(h) || null)}</td> },
    { key: "os", label: t("Sistema operativo"), sort: "os", td: (h) => <td key="os" className="os" title={osOf(h)}>{infoCell(h, osOf(h) || null, t("Sin acceso"))}</td> },
    { key: "ram", label: "RAM", sort: "ram", num: true, td: (h) => <td key="ram" className="num">{infoCell(h, ramOf(h) ? fmtRam(ramOf(h)) : null)}</td> },
    { key: "disk", label: t("Almacenamiento"), sort: "disk", td: (h) => <td key="disk">{diskCell(h)}</td> },
    { key: "ms", label: t("Latencia"), sort: "ms", num: true, td: (h) => <td key="ms" className="num">{h.ms != null ? `${h.ms} ms` : <span className="muted">—</span>}</td> },
    {
      key: "note",
      label: t("Ubicación y nota"),
      td: (h) => (
        <td key="note" className="note" title={noteText(h)}>
          {noteText(h) || <span className="muted">—</span>}
        </td>
      ),
    },
  ];
  const shownCols = tcols.map((k) => TCOLS.find((c) => c.key === k)).filter((c): c is TCol => !!c);
  const moveCol = (k: string, d: -1 | 1) =>
    setTcols((cur) => {
      const i = cur.indexOf(k);
      const j = i + d;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const n = [...cur];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const startResize = (k: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
    const x0 = e.clientX;
    const w0 = th.offsetWidth;
    resized.current = true;
    const move = (ev: MouseEvent) => setTwidth((w) => ({ ...w, [k]: Math.max(50, w0 + ev.clientX - x0) }));
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setTimeout(() => (resized.current = false), 0);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const alive = [...hosts.values()];
  const noAccessCount = alive.filter((h) => !!infos.get(h.ip)?.error).length;
  const newCount = prevScan ? alive.filter((h) => !prevSet.has(h.ip)).length : 0;
  const gone = prevScan && !scanning ? prevScan.ips.filter((ip) => !hosts.has(ip)) : [];
  const checked = alive.filter((h) => infos.get(h.ip) && !infos.get(h.ip)!.loading).length;
  const alertCount = [...hosts.values()].filter((h) => {
    const i = infos.get(h.ip)?.info;
    return i && diskAlerts(i).length > 0;
  }).length;

  const toRow = (h: Host): Row => ({ h, info: infos.get(h.ip)?.info });
  const visibleRows: Row[] = rows.map(toRow);
  const allRows: Row[] = [...hosts.values()].sort((a, b) => ipNum(a.ip) - ipNum(b.ip)).map(toRow);

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand clickable" onClick={() => setDialog("about")} title={t("Acerca de SGIIPP-IPSCANER")}>
          <b>SGIIPP-IPSCANER</b>
          <span title={settings.localidad ? `${settings.centro} · ${settings.localidad}` : settings.centro}>
            {settings.centro}
          </span>
        </div>
        <div className="range">
          <label>{t("Rango")}</label>
          <input
            value={range}
            onChange={(e) => setRange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !scanning && start()}
            placeholder="192.168.1.0/24 · 192.168.1.1-254"
            spellCheck={false}
            disabled={scanning}
          />
          {networks.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && setRange(e.target.value)}
              disabled={scanning}
              title={t("Redes detectadas en este equipo")}
            >
              <option value="">{t("Mis redes…")}</option>
              {networks.map((n) => (
                <option key={n.name + n.ip} value={n.cidr}>
                  {n.cidr} ({n.ip})
                </option>
              ))}
            </select>
          )}
        </div>
        {scanning ? (
          <button className="btn danger" onClick={stop}>■ {t("Detener")} · {pct}%</button>
        ) : (
          <button className="btn primary" onClick={start} disabled={!range.trim()}>▶ {t("Escanear")}</button>
        )}
        <div className="tools">
          <DonateButton compact />
          <button
            className="btn icon lang"
            onClick={() => setSettings((st) => ({ ...st, lang: st.lang === "en" ? "es" : "en" }))}
            title={t("Cambiar idioma")}
          >
            {settings.lang === "en" ? "ES" : "EN"}
          </button>
          <button className="btn icon" onClick={() => setShowSettings(true)} title={t("Ajustes (nombre del centro)")}>⚙</button>
          <button className="btn icon" onClick={() => setDialog("manual")} title={t("Manual de usuario (F1)")}>?</button>
        </div>
      </header>

      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} title={t("Cerrar")}>✕</button>
        </div>
      )}

      <div className="subbar">
        <input
          ref={filterRef}
          className="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("Filtrar por nombre, IP, MAC o usuario…")}
        />
        <div className="seg" role="group" aria-label={t("Filtrar por tipo")}>
          {([
            ["all", t("Todos"), hosts.size],
            ["pc", t("Ordenadores"), kindCount.pc],
            ["printer", t("Impresoras"), kindCount.printer],
            ["router", t("Routers y red"), kindCount.router],
            ["tv", t("TV y multimedia"), kindCount.tv],
            ["phone", t("Móviles y teléfonos"), kindCount.phone],
            ["other", t("Otros"), kindCount.other],
          ] as const).map(([k, label, n]) => (
            <button
              key={k}
              className={kindFilter === k ? "on" : ""}
              onClick={() => setKindFilter(k)}
              title={`${label} (${n})`}
            >
              {k !== "all" && <DeviceIcon kind={k} />}
              {k === "all" ? t("Todos") : ""} <span className="n">{n}</span>
            </button>
          ))}
        </div>
        <label className="chk" title={t("Consulta los discos de los equipos al terminar el escaneo")}>
          <input type="checkbox" checked={autoCheck} onChange={(e) => setAutoCheck(e.target.checked)} />
          {t("Comprobar discos")}
        </label>
        <label className="chk">
          <input type="checkbox" checked={onlyAlerts} onChange={(e) => setOnlyAlerts(e.target.checked)} />
          {t("Solo con alertas")}
        </label>
        <div className="spacer" />
        <button
          className="btn"
          disabled={!alive.length || scanning}
          onClick={() => {
            logEvent("info", `Recomprobar pulsado (${alive.length} equipos, ${settings.consultas} consultas simultáneas)`);
            setInfos(new Map());
            setAutoCheck(true);
          }}
          title={t("Volver a consultar discos, RAM y sistema de todos los equipos")}
        >
          ↻ {t("Recomprobar")}
        </button>
        <button className="btn" disabled={!rows.length} onClick={() => copy(toTable("\t"), t("Listado"))}>
          {t("Copiar")}
        </button>
        <button className="btn" disabled={!rows.length} onClick={exportCsv}>
          {t("Exportar CSV")}
        </button>
        <button className="btn primary" disabled={!hosts.size} onClick={() => setDialog("report")}>
          {t("Informe PDF")}
        </button>
        <div className="colmenu-wrap">
          <button
            className="btn icon"
            onClick={(e) => {
              if (colMenu) return setColMenu(null);
              const b = e.currentTarget.getBoundingClientRect();
              setColMenu({ top: b.bottom + 6, left: Math.max(8, Math.min(b.right - 270, window.innerWidth - 278)) });
            }}
            title={t("Columnas de la tabla")} aria-label={t("Columnas de la tabla")}>▦</button>
          {colMenu && (
            <>
              <div className="colmenu-bg" onClick={() => setColMenu(null)} />
              <div className="colmenu" role="menu" style={{ top: colMenu.top, left: colMenu.left }}>
                <b>{t("Columnas de la tabla")}</b>
                {[...tcols.filter((k) => TCOL_KEYS.includes(k)), ...TCOL_KEYS.filter((k) => !tcols.includes(k))].map((k) => {
                  const c = TCOLS.find((x) => x.key === k)!;
                  const on = tcols.includes(k);
                  return (
                    <div key={k} className="cm-row">
                      <label>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={on && tcols.length <= 1}
                          onChange={() => setTcols((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))}
                        />
                        {c.label}
                      </label>
                      <button className="btn" disabled={!on} onClick={() => moveCol(k, -1)} title={t("Subir")}>▲</button>
                      <button className="btn" disabled={!on} onClick={() => moveCol(k, 1)} title={t("Bajar")}>▼</button>
                    </div>
                  );
                })}
                <button
                  className="btn"
                  onClick={() => {
                    setTcols(DEFAULT_TCOLS);
                    setTwidth({});
                  }}
                >
                  {t("Restablecer columnas")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {(alertCount > 0 || (prevScan && newCount > 0) || noAccessCount > 0) && !scanning && (
        <div className="summary" role="group" aria-label={t("Resumen")}>
          {alertCount > 0 && (
            <button className={"chip bad" + (onlyAlerts ? " on" : "")} onClick={() => setOnlyAlerts((v) => !v)} title={t("Mostrar solo estos equipos")}>
              ⚠ {tn(alertCount, "{n} disco crítico", "{n} discos críticos")}
            </button>
          )}
          {prevScan && newCount > 0 && (
            <button className={"chip new" + (quick === "new" ? " on" : "")} onClick={() => setQuick((q) => (q === "new" ? "" : "new"))} title={t("Mostrar solo estos equipos")}>
              ★ {tn(newCount, "{n} equipo nuevo", "{n} equipos nuevos")}
            </button>
          )}
          {noAccessCount > 0 && (
            <button className={"chip warn" + (quick === "noaccess" ? " on" : "")} onClick={() => setQuick((q) => (q === "noaccess" ? "" : "noaccess"))} title={t("Mostrar solo estos equipos")}>
              {tn(noAccessCount, "{n} sin acceso", "{n} sin acceso")}
            </button>
          )}
        </div>
      )}

      {scanning && (
        <div className="bar"><div style={{ width: `${pct}%` }} /></div>
      )}

      {marked.size > 0 && (
        <div className="selbar" role="toolbar" aria-label={t("Acciones sobre los equipos seleccionados")}>
          <b>{tn(marked.size, "{n} seleccionado", "{n} seleccionados")}</b>
          <button className="btn" disabled={!remote.rdp} onClick={() => bulkPower("reboot")} title={t("Reiniciar en 30 s")}>{t("Reiniciar")}</button>
          <button className="btn danger" disabled={!remote.rdp} onClick={() => bulkPower("shutdown")} title={t("Apagar en 30 s")}>{t("Apagar")}</button>
          <button className="btn" disabled={!remote.rdp} onClick={() => bulkPower("abort")} title={t("Cancelar apagado o reinicio pendiente")}>{t("Cancelar apagado")}</button>
          <button
            className="btn"
            onClick={() =>
              copy(
                [...hosts.values()].filter((h) => marked.has(h.ip)).map((h) => h.ip).join("\n"),
                "IPs"
              )
            }
          >
            {t("Copiar IPs")}
          </button>
          <span className="sep-v" />
          <button className="btn" onClick={markVisible} title={t("Marcar todos los equipos visibles (Ctrl+A)")}>{t("Marcar visibles")}</button>
          <button className="btn" onClick={invertMarked} title={t("Invertir la selección entre los equipos visibles (Ctrl+I)")}>{t("Invertir")}</button>
          <div className="spacer" />
          <button className="btn" onClick={() => setMarked(new Set())} title={t("Quitar la selección (Esc)")}>{t("Limpiar selección")}</button>
        </div>
      )}
      <div className="content">
      <main className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="c-chk">
                <input
                  type="checkbox"
                  aria-label={t("Seleccionar todos los equipos visibles")}
                  title={t("Seleccionar todos los equipos visibles")}
                  checked={rows.length > 0 && rows.every((h) => marked.has(h.ip))}
                  onChange={(e) =>
                    setMarked((p) => {
                      const n = new Set(p);
                      rows.forEach((h) => (e.target.checked ? n.add(h.ip) : n.delete(h.ip)));
                      return n;
                    })
                  }
                />
              </th>
              <th className="c-state" />
              {shownCols.map((c) => (
                <th
                  key={c.key}
                  className={c.num ? "num" : ""}
                  style={twidth[c.key] ? { width: twidth[c.key], maxWidth: twidth[c.key] } : undefined}
                  onClick={() => c.sort && !resized.current && toggleSort(c.sort)}
                >
                  {c.label}
                  {c.sort && arrow(c.sort)}
                  <span className="rz" onMouseDown={(e) => startResize(c.key, e)} onClick={(e) => e.stopPropagation()} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr
                key={h.ip}
                className={`${selected === h.ip ? "sel" : ""} ${marked.has(h.ip) ? "picked" : ""}`}
                tabIndex={0}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    toggleCheck(h.ip);
                    lastChecked.current = h.ip;
                  } else if (e.shiftKey) {
                    checkRange(h.ip);
                  } else select(h);
                }}
                onKeyDown={(e) => e.key === "Enter" && select(h)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, h });
                }}
              >
                <td className="c-chk" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`${t("Seleccionar")} ${h.name || h.ip}`}
                    checked={marked.has(h.ip)}
                    onClick={(e) => {
                      shiftHeld.current = e.shiftKey;
                    }}
                    onChange={() => {
                      if (shiftHeld.current) checkRange(h.ip);
                      else toggleCheck(h.ip);
                      lastChecked.current = h.ip;
                    }}
                  />
                </td>
                <td className="c-state">
                  <span
                    className={`dot ${h.alive ? "on" : "arp"}`}
                    title={h.alive ? t("Responde a ping") : t("Solo en tabla ARP (no responde a ping)")}
                  />
                </td>
                {shownCols.map((c) => c.td(h))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">
            {scanning ? (
              <>
                <span className="spinner" /> {t("Buscando equipos…")}
              </>
            ) : hosts.size ? (
              <>
                {t("Ningún equipo coincide con el filtro.")}{" "}
                <button
                  className="btn"
                  onClick={() => {
                    setFilter("");
                    setOnlyAlerts(false);
                    setKindFilter("all");
                    setQuick("");
                  }}
                >
                  {t("Quitar filtros")}
                </button>
              </>
            ) : (
              t("Pulsa «Escanear» (o F5) para descubrir los equipos de la red.")
            )}
          </div>
        )}
      </main>

      {sel && (
        <aside className="detail">
          <div className="d-head">
            <div>
              <h2>{sel.name || sel.ip}</h2>
              <span className="muted mono">{sel.ip}</span>
            </div>
            <button className="btn" onClick={() => setSelected(null)} title={t("Cerrar")}>✕</button>
          </div>
          <dl>
            <dt>MAC</dt>
            <dd className="mono">{sel.mac || "—"}</dd>
            <dt>{t("Latencia")}</dt>
            <dd>{sel.ms != null ? `${sel.ms} ms` : "—"}</dd>
            <dt>{t("Estado")}</dt>
            <dd>{sel.alive ? t("Responde a ping") : t("Solo en tabla ARP")}</dd>
          </dl>

          <div className="d-sec notes" key={`${sel.ip}-${notesLoads}`}>
            <h3>{t("Notas")}</h3>
            <input
              defaultValue={getNote(sel)?.ubic ?? ""}
              placeholder={t("Ubicación (planta, despacho…)")}
              onBlur={(e) => saveNote(sel, { ubic: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            <textarea
              rows={3}
              defaultValue={getNote(sel)?.nota ?? ""}
              placeholder={t("Nota sobre el equipo")}
              onBlur={(e) => saveNote(sel, { nota: e.target.value })}
            />
            {!sel.mac && <p className="muted small">{t("Sin MAC: la nota se asocia a la IP.")}</p>}
          </div>

          <div className="d-sec">
            <h3>{t("Equipo")}</h3>
            <div className="d-actions">
              <button className="btn" disabled={!info} onClick={() => info && copy(ficha(sel, info), t("Ficha"))} title={t("Copiar ficha del equipo")}>⧉</button>
              <button className="btn" disabled={ds?.loading} onClick={() => loadInfo(sel, false)} title={t("Volver a consultar")}>↻</button>
              <button className="btn" disabled={!remote.rdp} onClick={() => openRemote("rdp", sel)} title={t("Escritorio remoto (RDP)")}>RDP</button>
              <button className="btn" disabled={!remote.dameware} onClick={() => openRemote("dameware", sel)} title={remote.dameware ? "DameWare" : t("DameWare no está instalado")}>DameWare</button>
            </div>
          </div>
          {ds?.loading && <p className="muted">{t("Consultando…")}</p>}
          {ds?.error && <p className="err">{ds.error}</p>}
          {info && (
            <>
              <dl>
                {row(t("Sistema"), info.os && `${info.os}${info.arch ? ` (${info.arch})` : ""}`)}
                {row(t("Versión"), info.version && `${info.version}${info.build ? ` · build ${info.build}` : ""}`)}
                {row(t("Modelo"), [info.manufacturer, info.model].filter(Boolean).join(" "))}
                {row(t("Nº serie"), info.serial)}
                {row("CPU", info.cpu && `${info.cpu}${info.cores ? ` · ${t("{c} núcleos / {h} hilos", { c: info.cores, h: info.threads ?? "?" })}` : ""}`)}
                {row(t("Último usuario"), userOf(info))}
                {row(t("Dominio"), info.domain)}
                {row(t("Encendido"), info.uptime_s != null ? t("hace {t}", { t: fmtUptime(info.uptime_s) }) : null)}
              </dl>

              {info.ram_total
                ? meter(
                    t("Memoria RAM"),
                    Math.round(((info.ram_total - (info.ram_free ?? 0)) / info.ram_total) * 100),
                    t("{free} libres de {total}", { free: fmtBytes(info.ram_free ?? 0), total: fmtBytes(info.ram_total) })
                  )
                : null}
              {info.cpu_load != null && meter(t("Uso de CPU"), Math.round(info.cpu_load), t("Carga en este momento"))}

              <div className="d-sec">
                <h3>{t("Discos duros")}</h3>
              </div>
              {info.disks.length === 0 && <p className="muted">{t("Sin discos fijos.")}</p>}
              {info.disks.map((d) => {
                const p = d.total ? Math.round(((d.total - d.free) / d.total) * 100) : 0;
                return (
                  <div key={d.letter}>
                    {meter(`${d.letter} ${d.label}`.trim(), p, t("{free} libres de {total}", { free: fmtBytes(d.free), total: fmtBytes(d.total) }))}
                  </div>
                );
              })}
            </>
          )}

          <details className="cred">
            <summary>{t("Usar otras credenciales")}</summary>
            <p className="muted small">{t("Por defecto se usa tu usuario de Windows (necesita ser administrador del equipo).")}</p>
            <input placeholder={t("DOMINIO\\usuario")} value={cred.user} onChange={(e) => setCred({ ...cred, user: e.target.value })} />
            <input type="password" placeholder={t("Contraseña")} value={cred.pass} onChange={(e) => setCred({ ...cred, pass: e.target.value })} />
            <button className="btn" disabled={!cred.user.trim() || ds?.loading} onClick={() => loadInfo(sel, true)}>
              {t("Consultar con estas credenciales")}
            </button>
          </details>
        </aside>
      )}
      </div>

      {menu && (
        <>
          <div
            className="backdrop"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
            }}
          />
          <ul
            className="menu"
            style={{
              left: Math.max(4, Math.min(menu.x, window.innerWidth - 210)),
              top: Math.max(4, Math.min(menu.y, window.innerHeight - 420)),
            }}
          >
            {[
              [t("Copiar IP"), menu.h.ip, "IP"],
              [t("Copiar nombre"), menu.h.name, t("Nombre")],
              [t("Copiar MAC"), menu.h.mac, "MAC"],
              [
                t("Copiar fila"),
                [menu.h.name, menu.h.ip, menu.h.mac, osOf(menu.h), ramOf(menu.h) ? fmtRam(ramOf(menu.h)) : "", diskText(infos.get(menu.h.ip)?.info)].join("\t"),
                t("Fila"),
              ],
            ].map(([label, text, what]) => (
              <li
                key={label}
                className={text ? "" : "off"}
                onClick={() => {
                  setMenu(null);
                  if (text) copy(text, what);
                }}
              >
                {label}
              </li>
            ))}
            <li className="sep" />
            {(
              [
                ["rdp", t("Escritorio remoto (RDP)"), !!remote.rdp],
                ["dameware", "DameWare", !!remote.dameware],
                ["web", t("Abrir en el navegador"), !!remote.rdp],
                ["share", t("Abrir recurso compartido (C$)"), !!remote.rdp],
                ["ping", t("Ping continuo"), !!remote.rdp],
              ] as [RemoteKind, string, boolean][]
            ).map(([k, label, on]) => (
              <li
                key={k}
                className={on ? "" : "off"}
                title={on ? "" : k === "dameware" ? t("DameWare no está instalado (o indica su ruta en Ajustes)") : t("Solo disponible en Windows")}
                onClick={() => {
                  const h = menu.h;
                  setMenu(null);
                  if (on) openRemote(k, h);
                }}
              >
                {label}
              </li>
            ))}
            <li className="sep" />
            {(
              [
                ["reboot", t("Reiniciar equipo…")],
                ["shutdown", t("Apagar equipo…")],
                ["abort", t("Cancelar apagado/reinicio")],
              ] as [RemoteKind, string][]
            ).map(([k, label]) => (
              <li
                key={k}
                className={remote.rdp ? "" : "off"}
                onClick={() => {
                  const h = menu.h;
                  setMenu(null);
                  if (remote.rdp) openRemote(k, h);
                }}
              >
                {label}
              </li>
            ))}
            <li className="sep" />
            <li
              onClick={() => {
                const h = menu.h;
                setMenu(null);
                setSelected(h.ip);
                loadInfo(h, false);
              }}
            >
              {t("Ver ficha / actualizar")}
            </li>
          </ul>
        </>
      )}

      {dialog === "report" && (
        <ReportDialog
          settings={settings}
          visible={visibleRows}
          all={allRows}
          initialCols={reportCols}
          onColsChange={setReportCols}
          onOpenSettings={() => setShowSettings(true)}
          onSaved={() => notify(t("Informe PDF guardado"))}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "news" && (
        <NewsDialog hideOnStart={hideNews} onHideChange={setHideNews} onClose={() => setDialog(null)} />
      )}
      {dialog === "about" && <AboutDialog onClose={() => setDialog(null)} onManual={() => setDialog("manual")} />}
      {dialog === "log" && <LogDialog onClose={() => setDialog(null)} notify={notify} />}
      {dialog === "manual" && <Manual onClose={() => setDialog(null)} />}
      {showSettings && (
        <SettingsDialog
          value={settings}
          onSave={(s) => {
            setSettings(s);
            notify(t("Ajustes guardados"));
          }}
          onOpenLog={() => {
            setShowSettings(false);
            setDialog("log");
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}

      <footer className="status">
        <span>{tn(hosts.size, "{n} equipo", "{n} equipos")}{rows.length !== hosts.size && ` (${t("{n} mostrados", { n: rows.length })})`}</span>
        {scanning && <span>{progress.done}/{progress.total} · {pct}%</span>}
        {!scanning && autoCheck && alive.length > 0 && checked < alive.length && (
          <span title={t("Consultando cada equipo: sistema operativo, RAM, discos y último usuario")}>{t("Leyendo SO, RAM, discos y usuario: {a} de {b}…", { a: checked, b: alive.length })}</span>
        )}
        {prevScan && newCount > 0 && (
          <span className="info" title={t("Respecto al escaneo del {d}", { d: new Date(prevScan.at).toLocaleString(locale()) })}>
            ★ {tn(newCount, "{n} nuevo", "{n} nuevos")}
          </span>
        )}
        {prevScan && !scanning && gone.length > 0 && (
          <span className="muted" title={`${t("No aparecen ahora:")}\n${gone.join("\n")}`}>
            {tn(gone.length, "{n} ya no aparece", "{n} ya no aparecen")}
          </span>
        )}
        {alertCount > 0 && <span className="err">⚠ {t("{n} con discos casi llenos", { n: alertCount })}</span>}
        <span className="muted push">{msg || t("Clic derecho: más acciones · ↑↓ navegar · Ctrl+F filtrar · F5 escanear · Esc cerrar")}</span>
        <button className="linkbtn" title={t("Ver el registro de errores")} onClick={() => setDialog("log")}>{t("Registro")}</button>
        <button className="linkbtn" title={t("Ver novedades")} onClick={() => setDialog("news")}>v{__APP_VERSION__}</button>
      </footer>
    </div>
  );
}
