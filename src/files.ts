import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

const toBase64 = (bytes: Uint8Array) => {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
};

/** Pide dónde guardar y escribe el fichero. Devuelve la ruta, o null si se cancela. */
export async function saveBytes(
  defaultName: string,
  filterName: string,
  ext: string,
  bytes: Uint8Array
): Promise<string | null> {
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: filterName, extensions: [ext] }],
  });
  if (!path) return null;
  await invoke("save_file", { path, dataBase64: toBase64(bytes) });
  return path;
}
