# SGIIPP-IPSCANNER · Version history

## 3.1.0 · 2026-11-20
- Improvement: the name is now taken from the device itself via NetBIOS (UDP 137, fast, no processes spawned) and wins over DNS when they differ; the old DNS name is shown in the ↺ tooltip. Fixes reused IPs whose DNS (PTR and A) still has the old name, like MU4WXLIBVIG → MU45CD3137095.
- Fix: names of devices that no longer exist (stale reverse-DNS records, like “mu4wX…”) are no longer shown. The DNS name is only accepted if forward DNS confirms it for that same IP; otherwise the device's own NetBIOS name is used, or the name is left empty.
- New: if the DNS name differs from the one Windows reports when the sheet is read, the **real name** is shown with a ↺ mark (the tooltip gives the old name).

## 3.0.1 · 2026-11-20
- Fix: RAM, storage and the other sheet data could stay empty since 3.0.0. The main read is fast again and unchanged.
- Change: antivirus, BitLocker and patches are queried separately (“Query antivirus, BitLocker and patches” button in the detail panel, or “Security” in the selection bar for several devices), because on some devices they are slow or unavailable.

## 3.0.0 · 2026-11-19
- New: **extended device sheet** with antivirus, BitLocker status per drive, latest installed patch and an **Installed software** button (filterable, copyable list).
- New: **open ports** (13 common ports): button in the detail panel and in the selection bar, optional column, and data in the PDF report and Excel.
- New: **Export Excel** (.xlsx) with all devices and columns, and a disks sheet with colour coding.
- New optional report columns: Antivirus, BitLocker, Latest patch and Open ports.
- Fix: the “Shutdown” (selection bar) and “Stop” buttons showed text in the same colour as the background.

## 2.9.1 · 2026-11-10
- PDF report: smaller font in the list (more columns per page) and abbreviated headers (Device, OS, OS ver., Disk, Lat., CPU…). Abbreviated values: “Win 11 Pro”, “Dell” without “Inc.”, CPU without “(R)/(TM)”, “ARP”.

## 2.9.0 · 2026-11-05
- New: **★ important devices** (star in the detail panel and context menu, summary filter and built-in view).
- New: **❓ unknown devices**: alert for a never-seen MAC (after the first scan), “Mark as known” and an alert on auto-scan.
- New: **vendor by MAC** (optional column and detail panel; partial list) and private-MAC detection.
- New: **Copy device sheet** to the clipboard, to paste into a ticket.

## 2.8.0 · 2026-11-04
- New: **possible network conflict detection**: same MAC on several IPs, or an IP that used to have another MAC. Clickable notice in the summary, ⚡ next to the name and an explanation in the detail panel.

## 2.7.1 · 2026-11-04
- Manual: added the last scan on startup, the new version notice, the Donate button and the Ctrl+A / Ctrl+I shortcuts.

## 2.7.0 · 2026-11-04
- New: **Wake-on-LAN**: power on devices from the right-click menu, the selection bar or «Compare scans» (the ones that no longer appear).
- New: **Actions on several devices** (selection bar → Actions): update policies, flush DNS, restart the print spooler and send a message to the user. Closed list, with confirmation and logging.
- New: **OS version** column (e.g. «23H2 · 22631»), also in the PDF reports.

## 2.6.1 · 2026-11-04
- Changed: the program and its executable are now called **SGIIPP-IPSCANNER** (two N). The data folder (log and notes) does not change.

## 2.6.0 · 2026-11-02
- New: **per-device history** in the detail panel (first and last seen, previous names and IPs), tied to the MAC.
- New: **Compare scans** (⇄ button): new devices, devices that no longer appear and IP or name changes between two of the last 10 scans; exportable to CSV.
- New: **saved views** (☰ Views): ready-made filters («Disks in red», «New», «No access», printers, routers) and your own.
- New: **several networks at once**: separate the ranges with commas (`192.168.1.0/24, 192.168.2.0/24`) or choose «All my networks».
- New: **automatic scan** every N minutes (Settings) with a notice when new devices appear.
- New: the news carry a **date** and are also in the manual.

## 2.5.0 · 2026-11-02
- New: on startup the devices from the last scan are shown (with its date) without running queries; they refresh when you press Scan.
- New: **new version** notice (⬆ button on the toolbar) when a newer GitHub release exists. Shows nothing when offline.
- New: 📝 mark next to the name of devices that have a note.

## 2.4.1 · 2026-11-02
- Fixed: the PDF report failed («Cannot read properties of undefined») when including long columns such as Model or Processor.

## 2.4.0 · 2026-10-30
- New: per-device **notes and location** (in the detail panel), stored by MAC in `notas.json`; folder configurable in Settings to share them. Can be shown as a column, searched and included in PDF reports.
- New: **configurable table columns** (show, hide, reorder and resize).
- New: **clickable summary** under the bar: critical disks, new devices and no access.
- New: **Select visible** and **Invert** in the selection bar (`Ctrl+A` / `Ctrl+I`).

## 2.3.1 · 2026-10-30
- **Donate** (PayPal) button enabled on the toolbar and in «About».

## 2.3.0 · 2026-10-30
- New: interface in **Spanish or English** (Settings → Language, or the ES/EN button on the toolbar). It covers the interface, the manual, the news and the PDF reports.
- New: **Donate** (PayPal) button on the toolbar and in «About»; it only appears when a link is set in `src/credits.ts`.

## 2.2.0
- New: multi-select of devices (checkboxes, Ctrl+click, Shift+click) with a bulk action bar: reboot, shut down, cancel shutdown and copy IPs. Confirmation lists the devices; this computer is excluded.
- Improved: remote actions run in the background and no longer block the window.

## 2.1.0
- New: DameWare opens with «Windows NT Challenge/Response» authentication by default (configurable in Settings, with extra parameters).
- New: the text filter also searches by user.

## 2.0.1
- «About»: simplified credits, «Created by Servicio de Informática CIS Guillermo Miranda de Murcia».

## 2.0.0
- New: «About» window with credits, opened by clicking the application name. Credits are edited in `src/credits.ts`.

## 1.9.1
- Improved: the footer explains the second scan phase: «Reading OS, RAM, disks and user: X of Y».

## 1.9.0
- New: «Last user» column in the list (domain removed), also in the detail panel and PDF reports. Read from the Windows registry (LogonUI) and WMI.

## 1.8.1
- New: error log (`%LOCALAPPDATA%\\SGIIPP-IPSCANER\\logs\\errores.log`): internal failures with trace, interface errors, actions and queries. Unexpected exits are detected and the log is shown on next start. «Log» button in the footer.

## 1.8.0
- New: more device types with icon and filter: router/network, TV/multimedia, phone and IP camera, besides computer, server and printer.

## 1.7.0
- New: change detection between scans. «New» tag on devices that were not there last time, and counters of new and missing devices in the footer.

## 1.6.0
- New: more right-click actions: open in browser, open shared folder (C$), continuous ping, reboot, shut down (with confirmation and 30 s delay) and cancel shutdown.

## 1.5.0
- New: remote control from the right-click menu: **Remote Desktop (RDP)** and **DameWare**.

## 1.4.0
- New: the last 4 news items are shown on startup (can be disabled with «Do not show on startup»).

## 1.3.0
- Improved: detection. Active ARP (SendARP, Windows) and more probe ports.

## 1.0.0
- New: device-type icon next to the name, and performance settings (scan threads, simultaneous detail queries).

## 0.8.0
- PDF reports in the CIS institutional style, settings, and built-in user manual (F1).

## 0.1.0
- Network scan: device name, IP and MAC. Build without bundle (.exe only).
