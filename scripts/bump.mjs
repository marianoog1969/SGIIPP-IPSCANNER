// Versionado MAYOR.MENOR.PARCHE
//   patch → corrección de errores            (0.9.1 → 0.9.2)
//   minor → novedad / mejora                  (0.9.2 → 0.10 → pasa a 1.0.0)
//   major → cambio mayor manual               (0.4.3 → 1.0.0)
//   set X.Y.Z → fija una versión concreta
// Regla: cada 10 «minor» sube el «major» (el minor vuelve a 0).
import fs from "node:fs";

const [kind, arg] = process.argv.slice(2);
const read = (f) => fs.readFileSync(f, "utf8");
const pkg = JSON.parse(read("package.json"));
let [M, m, p] = pkg.version.split(".").map(Number);

if (kind === "patch") p++;
else if (kind === "minor") {
  m++;
  p = 0;
  if (m >= 10) {
    M++;
    m = 0;
  }
} else if (kind === "major") {
  M++;
  m = 0;
  p = 0;
} else if (kind === "set" && /^\d+\.\d+\.\d+$/.test(arg ?? "")) {
  [M, m, p] = arg.split(".").map(Number);
} else {
  console.error("Uso: node scripts/bump.mjs patch | minor | major | set X.Y.Z");
  process.exit(1);
}
const v = `${M}.${m}.${p}`;

pkg.version = v;
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

if (fs.existsSync("package-lock.json")) {
  const lock = JSON.parse(read("package-lock.json"));
  lock.version = v;
  if (lock.packages?.[""]) lock.packages[""].version = v;
  fs.writeFileSync("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
}

const conf = "src-tauri/tauri.conf.json";
fs.writeFileSync(conf, read(conf).replace(/"version":\s*"[^"]*"/, `"version": "${v}"`));

const cargo = "src-tauri/Cargo.toml";
fs.writeFileSync(cargo, read(cargo).replace(/^version = ".*"$/m, `version = "${v}"`));

console.log(v);
