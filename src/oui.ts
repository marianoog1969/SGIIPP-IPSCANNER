/** Fabricante a partir de la MAC (lista parcial y orientativa de los más habituales en oficinas). */
const DB = new Map<string, string>();
const V = (vendor: string, prefixes: string) => {
  for (const p of prefixes.split(/\s+/).filter(Boolean)) DB.set(p.replace(/[:-]/g, "").toUpperCase(), vendor);
};

V("Dell", "00:14:22 18:03:73 B8:CA:3A F8:BC:12 14:FE:B5 D4:BE:D9 00:1A:A0 00:21:9B 00:24:E8 00:26:B9 34:17:EB 44:A8:42 54:9F:35 5C:26:0A 74:86:7A 78:45:C4 84:8F:69 90:B1:1C A4:BA:DB B0:83:FE BC:30:5B C8:1F:66 D0:67:E5 EC:F4:BB F0:1F:AF F4:8E:38 18:A9:9B 24:6E:96");
V("HP", "3C:52:82 00:1B:78 3C:D9:2B 00:1F:29 00:21:5A 00:23:7D 00:25:B3 00:26:55 10:1F:74 28:92:4A 2C:41:38 30:E1:71 38:EA:A7 3C:4A:92 40:B0:34 44:1E:A1 48:0F:CF 5C:B9:01 64:51:06 68:B5:99 6C:3B:E5 70:5A:0F 78:E7:D1 80:C1:6E 94:57:A5 9C:B6:54 A0:1D:48 A0:48:1C A0:D3:C1 B4:B5:2F C8:CB:B8 D0:BF:9C D4:C9:EF E4:11:5B EC:B1:D7 F4:39:09 FC:15:B4 00:0B:CD 00:0E:7F 00:11:0A 00:14:38 00:17:08 00:18:71 00:19:BB 00:1A:4B 00:1C:C4 00:1E:0B 00:22:64 00:30:6E 00:60:B0 08:00:09");
V("Lenovo", "28:D2:44 54:E1:AD 70:5A:B6 8C:16:45 98:FA:9B C8:5B:76 50:7B:9D 00:21:CC");
V("Intel", "00:02:B3 00:03:47 00:04:23 00:07:E9 00:0C:F1 00:0E:0C 00:0E:35 00:11:11 00:12:F0 00:13:02 00:13:20 00:13:CE 00:13:E8 00:15:00 00:16:6F 00:16:76 00:16:EA 00:18:DE 00:19:D1 00:19:D2 00:1B:21 00:1B:77 00:1C:BF 00:1D:E0 00:1E:64 00:1E:65 00:1F:3B 00:1F:3C 00:21:5C 00:21:5D 00:21:6A 00:21:6B 00:22:FA 00:22:FB 00:24:D6 00:24:D7 00:27:10 3C:A9:F4 48:51:B7 7C:7A:91 8C:8D:28 A4:4E:31");
V("Realtek", "00:E0:4C 52:54:00");
V("Apple", "00:03:93 00:05:02 00:0A:27 00:0A:95 00:0D:93 00:10:FA 00:11:24 00:14:51 00:16:CB 00:17:F2 00:19:E3 00:1B:63 00:1C:B3 00:1D:4F 00:1E:52 00:1E:C2 00:1F:5B 00:1F:F3 00:21:E9 00:22:41 00:23:12 00:23:32 00:23:6C 00:23:DF 00:24:36 00:25:00 00:25:4B 00:25:BC 00:26:08 00:26:4A 00:26:B0 00:26:BB");
V("Samsung", "00:00:F0 00:12:47 8C:77:12");
V("Microsoft", "00:03:FF 00:0D:3A 00:12:5A 00:17:FA 00:1D:D8 28:18:78 7C:1E:52 60:45:BD");
V("Hyper-V (virtual)", "00:15:5D");
V("VMware (virtual)", "00:05:69 00:0C:29 00:50:56 00:1C:14");
V("VirtualBox (virtual)", "08:00:27");
V("Raspberry Pi", "B8:27:EB DC:A6:32 E4:5F:01");
V("Cisco", "00:00:0C 00:01:42 00:01:43 00:0F:23 00:17:94");
V("TP-Link", "50:C7:BF 14:CC:20 98:DA:C4 F4:F2:6D EC:08:6B A0:F3:C1 60:E3:27 00:27:19 54:C8:0F 30:B5:C2");
V("Ubiquiti", "24:A4:3C 44:D9:E7 78:8A:20 80:2A:A8 F0:9F:C2 FC:EC:DA 00:27:22 B4:FB:E4 68:D7:9A 74:83:C2 DC:9F:DB 18:E8:29");
V("MikroTik", "00:0C:42 4C:5E:0C 64:D1:54 6C:3B:6B B8:69:F4 CC:2D:E0 D4:CA:6D E4:8D:8C");
V("Netgear", "00:09:5B 00:0F:B5 00:14:6C 00:1B:2F 00:1E:2A 00:1F:33 00:22:3F 00:24:B2 00:26:F2 A0:21:B7 C0:3F:0E");
V("D-Link", "00:05:5D 00:0D:88 00:0F:3D 00:11:95 00:13:46 00:15:E9 00:17:9A 00:19:5B 00:1B:11 00:1C:F0 00:1E:58 00:21:91 00:22:B0 00:24:01 00:26:5A");
V("Zyxel", "00:13:49 00:19:CB 00:23:F8");
V("Aruba / HPE", "00:0B:86 20:4C:03 24:DE:C6 6C:F3:7F");
V("Fortinet", "00:09:0F 08:5B:0E 90:6C:AC");
V("Huawei", "00:E0:FC 00:18:82 00:1E:10");
V("Synology", "00:11:32");
V("QNAP", "00:08:9B 24:5E:BE");
V("Brother", "00:1B:A9 00:80:77 30:05:5C");
V("Ricoh", "00:00:74");
V("Canon", "00:00:85");
V("Kyocera", "00:C0:EE");
V("Epson", "00:00:48 00:26:AB 64:EB:8C");
V("Konica Minolta", "00:20:6B");
V("Lexmark", "00:04:00");
V("Xerox", "00:00:AA");
V("Zebra", "00:A0:F8 00:07:4D");
V("Yealink", "00:15:65 80:5E:C0");
V("Grandstream", "00:0B:82");
V("Polycom", "00:04:F2 64:16:7F");
V("Hikvision", "C0:56:E3 28:57:BE 44:19:B6 BC:AD:28");
V("Dahua", "3C:EF:8C");

/** Los móviles y portátiles modernos usan MAC «privada» (aleatoria): el segundo dígito es 2, 6, A o E. */
export const isRandomMac = (mac: string) => {
  const m = mac.replace(/[^0-9a-fA-F]/g, "");
  return m.length >= 2 && "26AEae".includes(m[1]);
};

/** Devuelve el fabricante conocido, o «» si no está en la lista. */
export const vendorOf = (mac: string): string => {
  const m = mac.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (m.length < 6) return "";
  return DB.get(m.slice(0, 6)) ?? "";
};
