import { DeviceKind, kindLabel } from "./lib";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Icono del tipo de dispositivo (ordenador, servidor, impresora u otro). */
export default function DeviceIcon({ kind }: { kind: DeviceKind }) {
  return (
    <svg className={`devico ${kind}`} width="16" height="16" viewBox="0 0 24 24" aria-label={kindLabel(kind)}>
      <title>{kindLabel(kind)}</title>
      {kind === "pc" && (
        <g {...P}>
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M8 20h8M12 16v4" />
        </g>
      )}
      {kind === "server" && (
        <g {...P}>
          <rect x="4" y="3" width="16" height="7" rx="1.5" />
          <rect x="4" y="14" width="16" height="7" rx="1.5" />
          <path d="M8 6.5h.01M8 17.5h.01" />
        </g>
      )}
      {kind === "printer" && (
        <g {...P}>
          <path d="M7 9V3h10v6" />
          <rect x="3" y="9" width="18" height="8" rx="1.5" />
          <rect x="7" y="14" width="10" height="7" />
        </g>
      )}
      {kind === "router" && (
        <g {...P}>
          <rect x="3" y="13" width="18" height="7" rx="1.5" />
          <path d="M7 16.5h.01M11 16.5h.01M7 13V8M17 13V8M12 13v-4M9.5 5.5a3.5 3.5 0 0 1 5 0" />
        </g>
      )}
      {kind === "tv" && (
        <g {...P}>
          <rect x="3" y="5" width="18" height="12" rx="1.5" />
          <path d="M9 21h6M9 3l3 2 3-2" />
        </g>
      )}
      {kind === "phone" && (
        <g {...P}>
          <rect x="7" y="2.5" width="10" height="19" rx="2" />
          <path d="M11 18.5h2" />
        </g>
      )}
      {kind === "camera" && (
        <g {...P}>
          <path d="M3 8h13a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3zM17 11l4-2v6l-4-2" />
          <path d="M7 20h5" />
        </g>
      )}
      {kind === "other" && (
        <g {...P}>
          <circle cx="12" cy="12" r="8" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
        </g>
      )}
    </svg>
  );
}
