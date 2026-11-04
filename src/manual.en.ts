import type { Section } from "./manual.es";

export const SECTIONS_EN: Section[] = [
  {
    id: "intro",
    title: "What SGIIPP-IPSCANER is",
    blocks: [
      {
        t: "p",
        x: "SGIIPP-IPSCANER discovers the devices connected to a local network and shows each one's **name**, **IP address** and **MAC address**. On Windows computers it also reads the **operating system**, the **RAM** and the state of the **hard disks**, and warns when one is about to fill up.",
      },
      {
        t: "ul",
        x: [
          "Fast scan of an address range (for example, a whole /24 network).",
          "Detailed sheet for each device: model, serial number, processor, logged-on user, uptime…",
          "Storage traffic light and almost-full disk alerts.",
          "PDF reports with your centre's name and the columns you choose.",
          "CSV export and quick copy to the clipboard.",
        ],
      },
      {
        t: "warn",
        x: "Use the tool only on your organisation's networks and with proper authorisation. Scanning generates traffic (ping and WMI queries) that security systems may log.",
      },
    ],
  },
  {
    id: "inicio",
    title: "Getting started",
    blocks: [
      {
        t: "ol",
        x: [
          "When the application opens, your computer's networks are detected and the main one is suggested (for example `192.168.1.0/24`). You can pick another one in the **My networks…** dropdown or type a range by hand.",
          "Press **Scan** (or the `F5` key). Devices appear in the table as they respond; the top bar and the percentage on the button show progress. **Stop** interrupts the scan.",
          "When it finishes, if «Check disks» is on, the application queries the system, RAM and disks of the active devices in the background (6 at a time). Meanwhile you will see pulsing grey bars in those cells.",
          "Click a device to open its **detail panel** on the right.",
        ],
      },
      { t: "h", x: "Supported range formats" },
      {
        t: "table",
        head: ["Example", "Meaning"],
        rows: [
          ["192.168.1.0/24", "The whole network (254 hosts). The prefix can go from /16 to /32."],
          ["192.168.1.1-192.168.1.50", "From the first IP to the second."],
          ["192.168.1.1-50", "Short form: only the last number changes."],
          ["192.168.1.7", "A single device."],
          ["192.168.1.0/24, 192.168.2.0/24", "Several networks at once: separate the ranges with commas or semicolons. «My networks…» also has «All my networks»."],
        ],
      },
      { t: "note", x: "The maximum is 65,536 addresses per scan. A /24 range usually takes a few seconds." },
    ],
  },
  {
    id: "listado",
    title: "The device list",
    blocks: [
      {
        t: "table",
        head: ["Column", "What it shows"],
        rows: [
          ["Status (dot)", "Green: answers ping or a common TCP port (445, 135, 139, 3389, 22, 80, 443, 515, 631, 9100…), so devices with ping blocked are detected too. Orange: answers neither ping nor ports, but replies to active ARP or is in the ARP table (the device exists, usually behind a strict firewall)."],
          ["Type icon", "To the left of the name: computer, server, printer, router/network, TV, phone, camera or other. It is inferred, in this order, from the operating system, the gateway and open ports (135/445 = Windows; 9100/515/631 = printer; 53 = router; 8008/8009/8001/8002 = TV; 554 = camera), the name (iphone, tv, router, tel…) and the private MAC (typical of phones). It is an estimate: hover to read the type."],
          ["Type filter", "Buttons with an icon in the top bar: All, Computers (includes servers), Printers, Routers and network, TV and multimedia, Phones, or Other (includes cameras), with the number of devices of each type. It is remembered between sessions."],
          ["«New» tag", "Device that was not in the previous completed scan. The footer shows how many are new and how many of the previous ones no longer appear (hover to see their IP)."],
          ["Device name", "Obtained by reverse DNS and, if there is no record, by NetBIOS. Stays «—» if it cannot be resolved."],
          ["IP address", "The device's address."],
          ["MAC address", "Read from the ARP table. Only available for devices on your own subnet."],
          ["Last user", "User who last logged on to the device (the current one if a session is open), without the domain. Read from the Windows registry (LogonUI) and WMI."],
          ["Operating system", "Detected Windows version (needs the device query)."],
          ["RAM", "Installed memory, rounded to GB."],
          ["Storage", "Traffic light based on the device's fullest disk, and its usage percentage."],
          ["Latency", "Ping response time in milliseconds."],
        ],
      },
      { t: "h", x: "Working with the table" },
      {
        t: "ul",
        x: [
          "**Sort:** click a column title; another click reverses the order.",
          "**Filter:** type in the «Filter by name, IP, MAC or user» box. `Ctrl+F` jumps to it.",
          "**Only with alerts:** shows only devices with a disk in red.",
          "**Copy:** double-click a cell to copy its value; the **Copy** button copies the whole visible list (it pastes well into Excel).",
          "**Right-click** a row: copy IP, name, MAC or the whole row, and view or refresh the detail panel.",
          "**Columns (▦):** show or hide columns, reorder them with ▲▼ and drag the right edge of a title to resize. It is remembered between sessions; «Reset columns» restores the default.",
          "**Clickable summary:** alerts appear under the bar (critical disks, new devices, no access); click one to see only those devices and click again to clear it.",
          "**☰ Views:** save the active filter, type and alerts under a name and bring them back with one click. Ready-made views are included: «Disks in red», «New since the previous scan», «No access», «Printers» and «Routers and network».",
          "**⇄ Compare scans:** the last 10 completed scans are kept. Pick two and you will see new devices, devices that no longer appear and IP or name changes (devices are matched by MAC). It can be exported to CSV.",
          "**↻ Recheck:** queries system, RAM and disks of all devices again without repeating the scan.",
        ],
      },
    ],
  },
  {
    id: "semaforo",
    title: "Traffic light and storage alerts",
    blocks: [
      {
        t: "p",
        x: "The **Storage** column rates each device by its fullest disk:",
      },
      {
        t: "table",
        head: ["Colour", "Usage", "Meaning"],
        rows: [
          ["Green", "under 75 %", "Enough space."],
          ["Orange", "75 % to 89 %", "Worth watching; plan a clean-up or an upgrade."],
          ["Red", "90 % or more", "Critical capacity. The device also shows the ⚠ icon next to its name."],
          ["—", "no data", "The device could not be queried or has no fixed disks."],
        ],
      },
      {
        t: "ul",
        x: [
          "Hover over the traffic light or the ⚠ to see the detail of each disk (usage and free space).",
          "The window footer counts how many devices have almost-full disks.",
          "Only local **fixed disks** are evaluated; network drives, USB and card readers are not included.",
        ],
      },
    ],
  },
  {
    id: "ficha",
    title: "Device detail panel",
    blocks: [
      {
        t: "p",
        x: "Clicking a device opens the detail panel. Close it with ✕ or `Esc`, and move between devices with the `↑` `↓` arrows.",
      },
      {
        t: "ul",
        x: [
          "**Network data:** MAC, latency and status.",
          "**Device:** operating system and version, model, serial number, processor, logged-on user, domain and uptime.",
          "**RAM and CPU:** usage bars at the time of the query (CPU is an instantaneous reading).",
          "**Hard disks:** one bar per drive with its percentage and free space.",
          "**History:** for each device (by MAC) the first and last time it was seen and the names and IPs it has had are recorded.",
          "**Notes:** location (floor, office…) and a free note per device. They are saved in `notas.json` tied to the MAC, so they follow the device even if its IP changes. In Settings you can set a shared folder to use them from several workstations. They can be shown as a «Location and note» column, searched in the filter and included in the PDF reports.",
        ],
      },
      {
        t: "ul",
        x: [
          "**⧉** copies the full sheet to the clipboard (useful for tickets or inventory).",
          "**↻** queries that device again.",
          "Double-clicking any value copies it.",
        ],
      },
      {
        t: "note",
        x: "«Logged-on user» shows the console session. It may be empty if nobody has logged in or there are only remote desktop connections.",
      },
    ],
  },
  {
    id: "permisos",
    title: "Requirements for querying devices",
    blocks: [
      {
        t: "p",
        x: "The detail data (system, RAM, CPU, disks…) is obtained through **WMI** via PowerShell. To work on a remote computer:",
      },
      {
        t: "ul",
        x: [
          "The device must be **Windows** and switched on.",
          "The user running SGIIPP-IPSCANER must be a **local administrator** of the queried device (for example, a domain administrator or the support group).",
          "The device's firewall must allow **WMI** («Windows Management Instrumentation») and **RPC** (TCP 135 and dynamic ports).",
          "The **computer name** is used when known, because with domain Kerberos authentication it is more reliable than the IP.",
        ],
      },
      {
        t: "p",
        x: "Printers, Linux machines, phones and other devices do not return this data: they will show «—». Each device query has a maximum time of about 40 seconds.",
      },
      { t: "h", x: "Using other credentials" },
      {
        t: "p",
        x: "If your user lacks permissions, open the device's panel, expand **Use other credentials**, type `DOMAIN\\user` and the password, and press **Query with these credentials**. The data is used only for that query: it is not saved to disk or sent anywhere.",
      },
    ],
  },
  {
    id: "informes",
    title: "PDF reports",
    blocks: [
      {
        t: "ol",
        x: [
          "Scan the network and wait for the device query to finish (the footer says «Reading OS, RAM, disks and user…»).",
          "If you wish, filter the table (by text or with «Only with alerts»).",
          "Press **PDF report**.",
          "Choose the **columns** to include: those of the list and, optionally, extra detail data (model, serial number, CPU, user, domain, uptime).",
          "Choose which **devices** to include (what the list shows, all, or only those with an alert), the page orientation, the title and optional remarks.",
          "Press **Generate PDF** and choose where to save it.",
        ],
      },
      { t: "h", x: "Report contents" },
      {
        t: "ul",
        x: [
          "**Cover** with the centre name, the town and the date of the data.",
          "**Executive summary** with four indicators: devices, active, queried and with an alert.",
          "**Table of contents.**",
          "**Section 01 · Device list** with the chosen columns, storage traffic light and legend.",
          "**«Disks with alert» section** (optional): every drive at 90 % or more, sorted from fullest to emptiest.",
          "**«Remarks» section** (if you wrote any).",
          "Header with the centre and title, and footer with the generation date and page number.",
        ],
      },
      {
        t: "note",
        x: "With more than five columns, the «Automatic» page option picks landscape so everything fits. Remember that the report contains data about your network: treat it as internal information.",
      },
    ],
  },
  {
    id: "seleccion",
    title: "Multi-select and bulk actions",
    blocks: [
      {
        t: "p",
        x: "Tick several devices with the checkboxes on the left (the header one ticks all **visible** devices, so combine it with the text or type filters). You can also use `Ctrl`+click to tick one and `Shift`+click to tick a range. `Esc` clears the selection. The selection bar has **Select visible** (`Ctrl+A`) and **Invert** (`Ctrl+I`) over the devices you can see.",
      },
      {
        t: "p",
        x: "When devices are ticked a bar appears with: **Reboot**, **Shut down**, **Cancel shutdown** and **Copy IPs**. Reboot and shut down ask for confirmation (with the list of devices) and run **after 30 seconds** with your Windows user, who must be an administrator of those devices. This computer is always excluded. If any fails, which one and why is shown, and it is written to the log.",
      },
    ],
  },
  {
    id: "remoto",
    title: "Remote actions (right-click)",
    blocks: [
      {
        t: "p",
        x: "With **right-click** on a device (or the **RDP** / **DameWare** buttons in the panel) you get these actions. All except DameWare only work on Windows:",
      },
      {
        t: "table",
        head: ["Action", "What it does"],
        rows: [
          ["Remote Desktop (RDP)", "Opens `mstsc` with the IP. If you typed a user and password in the panel, they are stored for 20 s in the Windows Credential Manager so they are not asked for, then deleted. Requires RDP enabled on the device."],
          ["DameWare", "Opens DameWare Mini Remote Control (`DWRCC.exe`) connecting to that device. It is detected automatically; if not, set its path in **⚙ Settings**."],
          ["Open in browser", "Opens `http://IP` in the default browser (printers, cameras, routers…)."],
          ["Open shared folder (C$)", "Opens `\\\\IP\\C$` in Explorer. Requires being an administrator of the device."],
          ["Continuous ping", "Opens a console with `ping -t` to that device. Close it to stop."],
          ["Reboot / Shut down device…", "Asks for confirmation and schedules the action **in 30 seconds** with your Windows user (needs administrator permissions on the device)."],
          ["Cancel shutdown/reboot", "Cancels a pending shutdown or reboot during those 30 seconds."],
        ],
      },
    ],
  },
  {
    id: "registro",
    title: "Error log",
    blocks: [
      {
        t: "p",
        x: "The application keeps a log at `%LOCALAPPDATA%\\SGIIPP-IPSCANER\\logs\\errores.log` (rotated at 1 MB): start and exit, scans, device queries, warnings, interface errors and internal failures (with their trace).",
      },
      {
        t: "ul",
        x: [
          "**View the log:** press **Log** in the footer, or ⚙ Settings → «View error log». There you can **Copy** the text or **Open folder**.",
          "**Unexpected exits:** if the program closes without warning, the log is shown automatically when you reopen it. The last lines before the «Previous session ended unexpectedly» mark show what it was doing.",
          "If there is a failure, send the last lines of the log so it can be fixed.",
        ],
      },
    ],
  },
  {
    id: "ajustes",
    title: "Settings and centre name",
    blocks: [
      {
        t: "p",
        x: "The **⚙** button opens the settings. It defines:",
      },
      {
        t: "ul",
        x: [
          "**Language:** Spanish or English. You can also switch instantly with the **ES/EN** button in the top bar. It affects the interface, this manual, the news and the PDF reports.",
          "**Centre name:** appears on the cover, the header and as the application name (top left).",
          "**Town:** shown on the cover and the header.",
          "**DameWare path (optional):** only if it is not detected by itself (`DWRCC.exe`).",
          "**DameWare authentication:** by default *Windows NT Challenge/Response* with the current credentials, so you do not have to pick it each time. If DameWare does not select it, use «Additional parameters» (the command used is written to the log).",
          "**Organisation (optional):** text shown at the foot of the cover.",
          "**Scan threads (10–500, default 100):** simultaneous pings. The scan is already parallel; raise it for large networks (/16) or lower it if the network or the computer suffers.",
          "**Automatic scan:** minutes between scans (0 = off). It works while the program is open; if new devices appear, a blue notice is shown under the bar.",
          "**Simultaneous detail queries (1–20, default 6):** devices queried at once to read OS, RAM and disks.",
        ],
      },
      {
        t: "p",
        x: "Settings are saved on this computer. The application also remembers the last range, the table order, the «Check disks» and «Only with alerts» options and the columns chosen for reports.",
      },
    ],
  },
  {
    id: "exportar",
    title: "Export and copy",
    blocks: [
      {
        t: "ul",
        x: [
          "**Export CSV:** saves the visible list to a `.csv` file (separator `;`, UTF-8 encoding) that opens directly in Excel.",
          "**Copy:** copies the visible list as tab-separated text to paste into a spreadsheet or an email.",
          "In both cases the current filter and order are respected.",
        ],
      },
    ],
  },
  {
    id: "atajos",
    title: "Keyboard shortcuts",
    blocks: [
      {
        t: "table",
        head: ["Key", "Action"],
        rows: [
          ["F5  ·  Ctrl+R", "Scan"],
          ["F1", "Open this manual"],
          ["Ctrl+F", "Go to the filter box"],
          ["↑  ↓", "Change device (opens its panel)"],
          ["Enter", "Open the panel of the focused row"],
          ["Esc", "Clear the filter, close the menu, the window or the panel (in that order)"],
          ["Right-click", "Row action menu"],
          ["Double-click", "Copy the value of a cell or field"],
        ],
      },
    ],
  },
  {
    id: "problemas",
    title: "Troubleshooting",
    blocks: [
      {
        t: "table",
        head: ["Symptom", "Likely cause and solution"],
        rows: [
          ["No devices appear", "Wrong range, devices switched off or ICMP blocked. Check the range and try a manual `ping` to a known device."],
          ["Devices with an orange dot", "They do not answer ping (firewall) but respond to ARP. This is normal."],
          ["Empty MAC", "The device is on another subnet or has no entry in the ARP table. The MAC is only obtained on the same local network."],
          ["«No access» and «—»", "The device responds, but its details could not be read: no administrator permissions, the firewall blocks WMI/RPC, or it is not a Windows PC (IP phones, printers…). Hover over «No access» or open the panel to see the exact reason."],
          ["My PC appears twice", "If your PC has several network cards (cable, wifi, docking station) it appears once per IP, with the same name and each card's MAC."],
          ["Empty name", "There is no reverse DNS record or NetBIOS name. Check the reverse DNS zone."],
          ["«Access denied»", "Your user is not an administrator of the device. Use «Use other credentials» in the panel."],
          ["«The RPC server is unavailable»", "The device is off, is not Windows, or the firewall blocks WMI/RPC."],
          ["«Timed out»", "Slow network or a device not answering WMI. Press ↻ to retry."],
          ["Everything «—» in OS, RAM and storage", "The check is off or there are no permissions. Turn on «Check disks» and press ↻ Recheck."],
          ["Cannot save the PDF or CSV", "No permissions in the chosen folder. Try Documents or the Desktop."],
        ],
      },
    ],
  },
  {
    id: "privacidad",
    title: "Privacy and security",
    blocks: [
      {
        t: "ul",
        x: [
          "SGIIPP-IPSCANER works **entirely on your computer**: it sends no data to the Internet or to any server.",
          "Alternative credentials are only kept in memory during the session and never written to disk.",
          "Reports and CSV files contain names, addresses and device data. Store and share them according to your organisation's security rules.",
          "Scan only networks you are authorised to scan.",
        ],
      },
    ],
  },
  {
    id: "acerca",
    title: "About",
    blocks: [
      { t: "p", x: `**SGIIPP-IPSCANER** · version ${__APP_VERSION__}` },
      {
        t: "p",
        x: "The version number follows the **MAJOR.MINOR.PATCH** format: the **patch** goes up when fixing bugs, the **minor** when adding new features and, every 10 minor versions, the **major** goes up.",
      },
      { t: "p", x: "Created by the **Servicio de Informática CIS Guillermo Miranda de Murcia**. Click the application name (top left) to see the credits." },
      { t: "p", x: "Desktop application for Windows built with Tauri 2, Rust and React. Click the version number in the footer to see the latest news. To read this manual at any time press `F1` or the **?** button." },
    ],
  },
];
