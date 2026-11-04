# SGIIPP-IPSCANER · Version history

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
