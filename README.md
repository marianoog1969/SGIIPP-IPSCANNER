# SGIIPP-IPSCANNER

Escáner de red (Tauri 2 + Rust + React). Muestra nombre, IP, MAC, sistema operativo, RAM y discos de los equipos de una red.

## Compilar (solo .exe, sin bundle)

```
npm install
npm run tauri build -- --no-bundle
```

El ejecutable queda en `src-tauri\target\release\SGIIPP-IPSCANNER.exe`.

Versionado y cambios: ver [CHANGELOG.md](CHANGELOG.md).

## Compilar

- Solo el `.exe` (sin instalador): `npm run tauri build -- --no-bundle` → `src-tauri/target/release/SGIIPP-IPSCANNER.exe`
- Instalador (NSIS, español, instalación por usuario o para todos): `npm run instalador` → `src-tauri/target/release/bundle/nsis/SGIIPP-IPSCANNER_<versión>_x64-setup.exe`
  (la primera vez descarga NSIS de GitHub, hace falta conexión).
