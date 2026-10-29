# SGIIPP-IPSCANER · Historial de versiones

## Reglas de versionado (MAYOR.MENOR.PARCHE)

- **PARCHE** (`0.9.1` → `0.9.2`): corrección de errores.
- **MENOR** (`0.9.1` → `1.0.0`): novedades o mejoras. El parche vuelve a 0.
- **MAYOR**: sube automáticamente cada **10 versiones menores** (tras `0.9.x` viene `1.0.0`; tras `1.9.x`, `2.0.0`) o a mano en un cambio de calado.

Para subir versión (actualiza `package.json`, `package-lock.json`, `tauri.conf.json` y `Cargo.toml`):

```
npm run version:patch    # errores
npm run version:minor    # novedades
npm run version:major    # cambio mayor
```

## 2.2.0
- Nuevo: selección múltiple de equipos (casillas, Ctrl+clic, Mayús+clic) con barra de acciones en bloque: reiniciar, apagar, cancelar apagado y copiar IPs. Confirmación con la lista de equipos; este equipo se excluye.
- Mejorado: las acciones remotas se ejecutan en segundo plano y no bloquean la ventana.

## 2.1.0
- Nuevo: DameWare se abre con la autenticación «Windows NT Challenge/Response» por defecto (configurable en Ajustes, con parámetros adicionales).
- Nuevo: el filtro de texto también busca por usuario.

## 2.0.1
- «Acerca de»: créditos simplificados, «Creado por Servicio de Informática CIS Guillermo Miranda de Murcia».

## 2.0.0
- Nuevo: ventana «Acerca de» con créditos (autor, centro, organismo y tecnologías), que se abre pulsando el nombre de la aplicación. Los créditos se editan en `src/credits.ts`.

## 1.9.1
- Mejorado: el pie explica la segunda fase del escaneo: «Leyendo SO, RAM, discos y usuario: X de Y».

## 1.9.0
- Nuevo: columna «Último usuario» en el listado (sin el dominio), también en la ficha y en los informes PDF. Se lee del registro de Windows (LogonUI) y WMI.

## 1.8.1
- Nuevo: registro de errores (`%LOCALAPPDATA%\\SGIIPP-IPSCANER\\logs\\errores.log`): fallos internos con traza, errores de la interfaz, acciones y consultas. Se detectan los cierres inesperados y se muestra el registro al volver a abrir. Botón «Registro» en el pie.

## 1.8.0
- Nuevo: más tipos de dispositivo con icono y filtro: router/red (puerta de enlace, switches, AP), TV/multimedia, móvil/teléfono y cámara IP, además de ordenador, servidor e impresora. Detección por puerta de enlace, puertos, nombre y MAC privada.

## 1.7.0
- Nuevo: detección de cambios entre escaneos. Etiqueta «Nuevo» en los equipos que no estaban la vez anterior y, en el pie, contador de nuevos y de los que ya no aparecen.

## 1.6.0
- Nuevo: más acciones en el clic derecho: abrir en el navegador, abrir recurso compartido (C$), ping continuo, reiniciar, apagar (con confirmación y 30 s de margen) y cancelar apagado. RDP usa las credenciales de la ficha si las hay.

## 1.5.1
- Corregido: el botón DameWare de la ficha quedaba cortado.

## 1.5.0
- Nuevo: control remoto desde el clic derecho (y la ficha): **Escritorio remoto (RDP)** y **DameWare**. DameWare se detecta automáticamente o se indica su ruta en Ajustes.

## 1.4.0
- Nuevo: al abrir la aplicación se muestran las 4 últimas novedades (se pueden desactivar con «No mostrar al iniciar»; se reabren pulsando el número de versión del pie).

## 1.3.0
- Mejorado: detección. Nuevo ARP activo (SendARP, Windows) para equipos de la misma subred que bloquean ping y puertos; más puertos de sondeo (telnet, WSD, VNC, RTSP, SIP, 8443…).

## 1.2.1
- Corregido: el filtro por tipo se cortaba en ventanas estrechas y los botones de la barra se partían en dos líneas.

## 1.2.0
- Mejorado: detección de equipos que no aparecían. Si no responden al ping se prueban puertos TCP habituales y, en rangos de hasta 1024 IP, un segundo ping más paciente. Los que solo estaban en ARP siguen apareciendo en naranja.

## 1.1.2
- Mejorado: contador «N mostrados» con cualquier filtro y botón «Quitar filtros» cuando ninguno coincide.

## 1.1.1
- Mejorado: el filtro por tipo usa botones con icono (ordenador, impresora, otros) en lugar de un desplegable.

## 1.1.0
- Nuevo: filtro por tipo (todos / ordenadores / impresoras / otros) con contador, en la barra superior.

## 1.0.0
- Nuevo: icono de tipo de dispositivo junto al nombre (ordenador, servidor, impresora, otro) y columna «Tipo» disponible en los informes PDF.
- Detección por sistema operativo, puertos abiertos (9100/515/631 impresora; 135/445 Windows) y nombre.
- Nuevo: ajustes de rendimiento — hilos de escaneo (10–500) y consultas de detalle simultáneas (1–20).

## 0.9.1
- Corregido: el propio equipo salía sin MAC (ahora se lee la de cada tarjeta de red).
- Corregido: los equipos con punto naranja no se consultaban; ahora también se comprueban.
- Las celdas de equipos que no se pueden consultar muestran «Sin acceso» con el motivo al pasar el ratón.
- Añadido el número de versión (pie de la ventana, informes PDF y manual).

## 0.9.0
- Renombrada la aplicación a **SGIIPP-IPSCANER**.

## 0.8.0
- Informes PDF con el estilo institucional del CIS (portada, síntesis ejecutiva, índice, apartados).
- Ajustes: nombre del centro, localidad y organismo.
- Manual de usuario integrado (F1).

## 0.7.0
- Mejoras de usabilidad: atajos de teclado, menú contextual, avisos, recordar preferencias, barra de carga.

## 0.6.0
- Columna **Almacenamiento** con semáforo (verde / naranja / rojo).

## 0.5.0
- Columnas **Sistema operativo** y **RAM** en el listado.

## 0.4.0
- Icono de alerta ⚠ en el listado para discos casi llenos y comprobación automática en segundo plano.

## 0.3.0
- Ficha completa del equipo: sistema, RAM, CPU, modelo, nº de serie, usuario, dominio y tiempo encendido.

## 0.2.0
- Detalle del equipo con sus discos duros y porcentaje de ocupación.

## 0.1.0
- Escaneo de red: nombre del equipo, IP y MAC. Compilación sin bundle (solo .exe).
