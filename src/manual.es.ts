export type Block =
  | { t: "p"; x: string }
  | { t: "h"; x: string }
  | { t: "ul"; x: string[] }
  | { t: "ol"; x: string[] }
  | { t: "note"; x: string }
  | { t: "warn"; x: string }
  | { t: "table"; head: string[]; rows: string[][] };

export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

export const SECTIONS_ES: Section[] = [
  {
    id: "intro",
    title: "Qué es SGIIPP-IPSCANER",
    blocks: [
      {
        t: "p",
        x: "SGIIPP-IPSCANER descubre los equipos conectados a una red local y muestra de cada uno su **nombre**, su **dirección IP** y su **dirección MAC**. En los equipos Windows consulta además el **sistema operativo**, la **memoria RAM** y el estado de los **discos duros**, y avisa cuando alguno está a punto de llenarse.",
      },
      {
        t: "ul",
        x: [
          "Escaneo rápido de un rango de direcciones (por ejemplo, toda una red /24).",
          "Ficha detallada de cada equipo: modelo, nº de serie, procesador, usuario conectado, tiempo encendido…",
          "Semáforo de almacenamiento y alertas de disco casi lleno.",
          "Informes PDF con el nombre de tu centro y las columnas que elijas.",
          "Exportación a CSV y copia rápida al portapapeles.",
        ],
      },
      {
        t: "warn",
        x: "Utiliza la herramienta únicamente en redes de tu organización y con la debida autorización. El escaneo genera tráfico (ping y consultas WMI) que los sistemas de seguridad pueden registrar.",
      },
    ],
  },
  {
    id: "inicio",
    title: "Primeros pasos",
    blocks: [
      {
        t: "ol",
        x: [
          "Al abrir la aplicación se detectan las redes de tu equipo y se propone la principal (por ejemplo `192.168.1.0/24`). Puedes elegir otra en el desplegable **Mis redes…** o escribir un rango a mano.",
          "Pulsa **Escanear** (o la tecla `F5`). Los equipos van apareciendo en la tabla a medida que responden; la barra superior y el porcentaje del botón indican el avance. Con **Detener** puedes interrumpir el escaneo.",
          "Al terminar, si «Comprobar discos» está activado, la aplicación consulta en segundo plano el sistema, la RAM y los discos de los equipos activos (6 a la vez). Mientras tanto verás barras grises pulsantes en esas celdas.",
          "Haz clic en un equipo para abrir su **ficha** en el panel derecho.",
        ],
      },
      { t: "h", x: "Formatos de rango admitidos" },
      {
        t: "table",
        head: ["Ejemplo", "Significado"],
        rows: [
          ["192.168.1.0/24", "Toda la red (254 equipos). El prefijo puede ir de /16 a /32."],
          ["192.168.1.1-192.168.1.50", "Desde la primera IP hasta la segunda."],
          ["192.168.1.1-50", "Forma abreviada: solo cambia el último número."],
          ["192.168.1.7", "Un único equipo."],
          ["192.168.1.0/24, 192.168.2.0/24", "Varias redes a la vez: separa los rangos con comas o puntos y comas. En «Mis redes…» también hay «Todas mis redes»."],
        ],
      },
      { t: "note", x: "El máximo es de 65.536 direcciones por escaneo. Un rango /24 suele tardar unos segundos." },
    ],
  },
  {
    id: "listado",
    title: "El listado de equipos",
    blocks: [
      {
        t: "table",
        head: ["Columna", "Qué muestra"],
        rows: [
          ["Estado (punto)", "Verde: responde a ping o a algún puerto TCP habitual (445, 135, 139, 3389, 22, 80, 443, 515, 631, 9100…), así que se detectan también equipos con el ping bloqueado. Naranja: no responde a ping ni a puertos, pero contesta al ARP activo o figura en la tabla ARP (el equipo existe, normalmente muy protegido por cortafuegos)."],
          ["Icono de tipo", "A la izquierda del nombre: ordenador, servidor, impresora, router/red, TV, móvil/teléfono, cámara u otro. Se deduce, por este orden, del sistema operativo, de la puerta de enlace y los puertos abiertos (135/445 = Windows; 9100/515/631 = impresora; 53 = router; 8008/8009/8001/8002 = TV; 554 = cámara), del nombre (iphone, tv, router, tel…) y de la MAC privada (típica de móviles). Es una estimación: al pasar el ratón se lee el tipo."],
          ["Filtro de tipo", "Botones con icono en la barra superior: Todos, Ordenadores (incluye servidores), Impresoras, Routers y red, TV y multimedia, Móviles y teléfonos u Otros (incluye cámaras), con el número de equipos de cada tipo. Se recuerda entre sesiones."],
          ["Etiqueta «Nuevo»", "Equipo que no estaba en el escaneo completado anterior. El pie indica cuántos son nuevos y cuántos de los anteriores ya no aparecen (al pasar el ratón, su IP)."],
          ["Nombre del equipo", "Se obtiene por DNS inverso y, si no hay registro, por NetBIOS. Queda en «—» si no se puede resolver."],
          ["Dirección IP", "Dirección del equipo."],
          ["Dirección MAC", "Se lee de la tabla ARP. Solo está disponible para equipos de tu misma subred."],
          ["Último usuario", "Usuario que inició sesión por última vez en el equipo (el actual si hay sesión abierta), sin el dominio. Se lee del registro de Windows (LogonUI) y de WMI."],
          ["Sistema operativo", "Versión de Windows detectada (requiere la consulta de equipos)."],
          ["RAM", "Memoria instalada, redondeada a GB."],
          ["Almacenamiento", "Semáforo según el disco más lleno del equipo y su porcentaje de ocupación."],
          ["Latencia", "Tiempo de respuesta al ping en milisegundos."],
        ],
      },
      { t: "h", x: "Trabajar con la tabla" },
      {
        t: "ul",
        x: [
          "**Ordenar:** haz clic en el título de una columna; otro clic invierte el orden.",
          "**Filtrar:** escribe en el cuadro «Filtrar por nombre, IP, MAC o usuario». Con `Ctrl+F` saltas a él.",
          "**Solo con alertas:** muestra únicamente los equipos con algún disco en rojo.",
          "**Copiar:** doble clic en una celda copia su valor; el botón **Copiar** copia todo el listado visible (se pega bien en Excel).",
          "**Clic derecho** sobre una fila: copiar IP, nombre, MAC o la fila completa, y ver o actualizar la ficha.",
          "**Columnas (▦):** muestra u oculta columnas, cámbialas de orden con ▲▼ y arrastra el borde derecho de un título para ensanchar. Se recuerda entre sesiones; «Restablecer columnas» vuelve a lo normal.",
          "**Resumen clicable:** bajo la barra aparecen avisos (discos críticos, equipos nuevos, sin acceso); pulsa uno para ver solo esos equipos y otra vez para quitarlo.",
          "**☰ Vistas:** guarda el filtro, el tipo y los avisos activos con un nombre y recupéralos con un clic. Incluye vistas listas: «Discos en rojo», «Nuevos desde el escaneo anterior», «Sin acceso», «Impresoras» y «Routers y red».",
          "**⇄ Comparar escaneos:** se guardan los últimos 10 escaneos completados. Elige dos y verás los equipos nuevos, los que ya no aparecen y los cambios de IP o de nombre (los equipos se emparejan por MAC). Se puede exportar a CSV.",
          "**↻ Recomprobar:** vuelve a consultar sistema, RAM y discos de todos los equipos sin repetir el escaneo.",
        ],
      },
    ],
  },
  {
    id: "semaforo",
    title: "Semáforo y alertas de almacenamiento",
    blocks: [
      {
        t: "p",
        x: "La columna **Almacenamiento** valora cada equipo por su disco más lleno:",
      },
      {
        t: "table",
        head: ["Color", "Ocupación", "Significado"],
        rows: [
          ["Verde", "menos del 75 %", "Espacio suficiente."],
          ["Naranja", "del 75 % al 89 %", "Conviene vigilarlo y planificar una limpieza o ampliación."],
          ["Rojo", "90 % o más", "Capacidad crítica. El equipo muestra además el icono ⚠ junto al nombre."],
          ["—", "sin datos", "El equipo no se ha podido consultar o no tiene discos fijos."],
        ],
      },
      {
        t: "ul",
        x: [
          "Al pasar el ratón sobre el semáforo o el ⚠ aparece el detalle de cada disco (ocupación y espacio libre).",
          "El pie de la ventana cuenta cuántos equipos tienen discos casi llenos.",
          "Solo se evalúan los **discos fijos** locales; no se incluyen unidades de red, USB ni lectores.",
        ],
      },
    ],
  },
  {
    id: "ficha",
    title: "Ficha del equipo",
    blocks: [
      {
        t: "p",
        x: "Al hacer clic en un equipo se abre el panel de detalle. Se cierra con la ✕ o con `Esc`, y con las flechas `↑` `↓` pasas de un equipo a otro.",
      },
      {
        t: "ul",
        x: [
          "**Datos de red:** MAC, latencia y estado.",
          "**Equipo:** sistema operativo y versión, modelo, nº de serie, procesador, usuario conectado, dominio y tiempo encendido.",
          "**Memoria RAM y CPU:** barras de uso en el momento de la consulta (la CPU es una lectura instantánea).",
          "**Discos duros:** una barra por unidad con su porcentaje y el espacio libre.",
          "**Historial:** por cada equipo (por MAC) se anota cuándo se vio por primera y última vez y los nombres e IP que ha tenido.",
          "**Notas:** ubicación (planta, despacho…) y una nota libre por equipo. Se guardan en `notas.json` asociadas a la MAC, así que siguen al equipo aunque cambie de IP. En Ajustes puedes indicar una carpeta compartida para usarlas desde varios puestos. Se pueden mostrar como columna «Ubicación y nota», buscar en el filtro e incluir en los informes PDF.",
        ],
      },
      {
        t: "ul",
        x: [
          "**⧉** copia la ficha completa al portapapeles (útil para tickets o inventario).",
          "**↻** vuelve a consultar ese equipo.",
          "Doble clic sobre cualquier dato lo copia.",
        ],
      },
      {
        t: "note",
        x: "«Usuario conectado» muestra la sesión de consola. Puede aparecer vacío si nadie ha iniciado sesión o solo hay conexiones de escritorio remoto.",
      },
    ],
  },
  {
    id: "permisos",
    title: "Requisitos de la consulta de equipos",
    blocks: [
      {
        t: "p",
        x: "La ficha (sistema, RAM, CPU, discos…) se obtiene mediante **WMI** a través de PowerShell. Para que funcione en un equipo remoto:",
      },
      {
        t: "ul",
        x: [
          "El equipo debe ser **Windows** y estar encendido.",
          "El usuario con el que ejecutas SGIIPP-IPSCANER debe ser **administrador local** del equipo consultado (por ejemplo, un administrador de dominio o el grupo de soporte).",
          "El cortafuegos del equipo debe permitir **WMI** («Instrumental de administración de Windows») y **RPC** (TCP 135 y puertos dinámicos).",
          "Se consulta por **nombre de equipo** cuando se conoce, porque con la autenticación Kerberos de dominio es más fiable que por IP.",
        ],
      },
      {
        t: "p",
        x: "Impresoras, equipos Linux, teléfonos y otros dispositivos no devuelven estos datos: aparecerán con «—». La consulta de cada equipo tiene un tiempo máximo de unos 40 segundos.",
      },
      { t: "h", x: "Usar otras credenciales" },
      {
        t: "p",
        x: "Si tu usuario no tiene permisos, abre la ficha del equipo, despliega **Usar otras credenciales**, escribe `DOMINIO\\usuario` y la contraseña y pulsa **Consultar con estas credenciales**. Los datos se usan solo para esa consulta: no se guardan en disco ni se envían a ningún sitio.",
      },
    ],
  },
  {
    id: "informes",
    title: "Informes PDF",
    blocks: [
      {
        t: "ol",
        x: [
          "Escanea la red y espera a que termine la consulta de equipos (el pie indica «Leyendo SO, RAM, discos y usuario…»).",
          "Si quieres, filtra la tabla (por texto o con «Solo con alertas»).",
          "Pulsa **Informe PDF**.",
          "Elige las **columnas** que quieres ver en el informe: las del listado y, opcionalmente, datos extra de la ficha (modelo, nº de serie, CPU, usuario, dominio, tiempo encendido).",
          "Indica qué **equipos** incluir (lo que muestra el listado, todos o solo los que tienen alerta), la orientación de la página, el título y unas observaciones opcionales.",
          "Pulsa **Generar PDF** y elige dónde guardarlo.",
        ],
      },
      { t: "h", x: "Contenido del informe" },
      {
        t: "ul",
        x: [
          "**Portada** con el nombre del centro, la localidad y la fecha de los datos.",
          "**Síntesis ejecutiva** con cuatro indicadores: equipos, activos, consultados y con alerta.",
          "**Índice de contenidos.**",
          "**Apartado 01 · Listado de equipos** con las columnas elegidas, semáforo de almacenamiento y leyenda.",
          "**Apartado «Discos con alerta»** (opcional): cada unidad al 90 % o más, ordenada de mayor a menor ocupación.",
          "**Apartado «Observaciones»** (si has escrito alguna).",
          "Cabecera con el centro y el título, y pie con la fecha de generación y el número de página.",
        ],
      },
      {
        t: "note",
        x: "Con más de cinco columnas, la opción de página «Automática» elige formato horizontal para que quepa todo. Recuerda que el informe contiene datos de tu red: trátalo como información interna.",
      },
    ],
  },
  {
    id: "seleccion",
    title: "Selección múltiple y acciones en bloque",
    blocks: [
      {
        t: "p",
        x: "Marca varios equipos con las casillas de la izquierda (la de la cabecera marca todos los **visibles**, así que combínala con los filtros de texto o de tipo). También puedes usar `Ctrl`+clic para marcar uno y `Mayús`+clic para marcar un rango. `Esc` quita la selección. La barra de selección tiene **Marcar visibles** (`Ctrl+A`) e **Invertir** (`Ctrl+I`) sobre los equipos que se ven.",
      },
      {
        t: "p",
        x: "Al marcar equipos aparece una barra con: **Reiniciar**, **Apagar**, **Cancelar apagado** y **Copiar IPs**. Reiniciar y apagar piden confirmación (con la lista de equipos) y se ejecutan **a los 30 segundos** con tu usuario de Windows, que debe ser administrador de esos equipos. Este propio equipo se excluye siempre. Si alguno falla, se indica cuál y el motivo, y queda en el registro.",
      },
    ],
  },
  {
    id: "remoto",
    title: "Acciones remotas (clic derecho)",
    blocks: [
      {
        t: "p",
        x: "Con **clic derecho** sobre un equipo (o con los botones **RDP** / **DameWare** de la ficha) tienes estas acciones. Todas, salvo DameWare, solo funcionan en Windows:",
      },
      {
        t: "table",
        head: ["Acción", "Qué hace"],
        rows: [
          ["Escritorio remoto (RDP)", "Abre `mstsc` con la IP. Si has escrito usuario y contraseña en la ficha, se guardan 20 s en el Administrador de credenciales de Windows para no pedirlos y se borran. Exige RDP activado en el equipo."],
          ["DameWare", "Abre DameWare Mini Remote Control (`DWRCC.exe`) conectando a ese equipo. Se detecta solo; si no, indica su ruta en **⚙ Ajustes**."],
          ["Abrir en el navegador", "Abre `http://IP` en el navegador predeterminado (impresoras, cámaras, routers…)."],
          ["Abrir recurso compartido (C$)", "Abre `\\\\IP\\C$` en el Explorador. Necesita ser administrador del equipo."],
          ["Ping continuo", "Abre una consola con `ping -t` a ese equipo. Ciérrala para pararlo."],
          ["Reiniciar / Apagar equipo…", "Pide confirmación y programa la acción **en 30 segundos** con tu usuario de Windows (necesita permisos de administrador en el equipo)."],
          ["Cancelar apagado/reinicio", "Anula un apagado o reinicio pendiente durante esos 30 segundos."],
        ],
      },
    ],
  },
  {
    id: "registro",
    title: "Registro de errores",
    blocks: [
      {
        t: "p",
        x: "La aplicación guarda un registro en `%LOCALAPPDATA%\\SGIIPP-IPSCANER\\logs\\errores.log` (se rota al llegar a 1 MB): inicio y cierre, escaneos, consultas a equipos, avisos, errores de la interfaz y fallos internos (con su traza).",
      },
      {
        t: "ul",
        x: [
          "**Ver el registro:** pulsa **Registro** en el pie, o ⚙ Ajustes → «Ver registro de errores». Allí puedes **Copiar** el texto o **Abrir carpeta**.",
          "**Cierres inesperados:** si el programa se cierra sin avisar, al volver a abrirlo se muestra el registro automáticamente. Las últimas líneas anteriores a la marca «La sesión anterior terminó de forma inesperada» indican qué estaba haciendo.",
          "Si hay un fallo, envía las últimas líneas del registro para poder corregirlo.",
        ],
      },
    ],
  },
  {
    id: "ajustes",
    title: "Ajustes y nombre del centro",
    blocks: [
      {
        t: "p",
        x: "Con el botón **⚙** abres los ajustes. Allí se define:",
      },
      {
        t: "ul",
        x: [
          "**Idioma:** español o inglés. También puedes cambiarlo al instante con el botón **ES/EN** de la barra superior. Afecta a la interfaz, este manual, las novedades y los informes PDF.",
          "**Nombre del centro:** aparece en la portada, la cabecera y el nombre de la aplicación (arriba a la izquierda).",
          "**Localidad:** se muestra en la portada y la cabecera.",
          "**Ruta de DameWare (opcional):** solo si no se detecta solo (`DWRCC.exe`).",
          "**Autenticación de DameWare:** por defecto *Windows NT Challenge/Response* con las credenciales actuales, para no tener que elegirla cada vez. Si DameWare no la selecciona, usa «Parámetros adicionales» (el comando usado queda en el registro).",
          "**Organismo (opcional):** texto que se muestra al pie de la portada.",
          "**Hilos de escaneo (10–500, por defecto 100):** pings simultáneos. El escaneo ya es paralelo; súbelo para redes grandes (/16) o bájalo si la red o el equipo se resienten.",
          "**Escaneo automático:** minutos entre escaneos (0 = desactivado). Funciona mientras el programa está abierto; si aparecen equipos nuevos, muestra un aviso azul bajo la barra.",
          "**Consultas de detalle simultáneas (1–20, por defecto 6):** equipos consultados a la vez para leer SO, RAM y discos.",
        ],
      },
      {
        t: "p",
        x: "Los ajustes se guardan en este equipo. La aplicación también recuerda el último rango, el orden de la tabla, las opciones «Comprobar discos» y «Solo con alertas» y las columnas elegidas para los informes.",
      },
    ],
  },
  {
    id: "exportar",
    title: "Exportar y copiar",
    blocks: [
      {
        t: "ul",
        x: [
          "**Exportar CSV:** guarda el listado visible en un archivo `.csv` (separador `;`, codificación UTF-8) que se abre directamente con Excel.",
          "**Copiar:** copia el listado visible como texto tabulado para pegarlo en una hoja de cálculo o un correo.",
          "En ambos casos se respetan el filtro y el orden actuales.",
        ],
      },
    ],
  },
  {
    id: "atajos",
    title: "Atajos de teclado",
    blocks: [
      {
        t: "table",
        head: ["Tecla", "Acción"],
        rows: [
          ["F5  ·  Ctrl+R", "Escanear"],
          ["F1", "Abrir este manual"],
          ["Ctrl+F", "Ir al cuadro de filtro"],
          ["↑  ↓", "Cambiar de equipo (abre su ficha)"],
          ["Intro", "Abrir la ficha de la fila enfocada"],
          ["Esc", "Borrar el filtro, cerrar el menú, la ventana o el panel (por ese orden)"],
          ["Clic derecho", "Menú de acciones de la fila"],
          ["Doble clic", "Copiar el valor de una celda o dato"],
        ],
      },
    ],
  },
  {
    id: "problemas",
    title: "Solución de problemas",
    blocks: [
      {
        t: "table",
        head: ["Síntoma", "Causa probable y solución"],
        rows: [
          ["No aparece ningún equipo", "Rango incorrecto, equipos apagados o ICMP bloqueado. Comprueba el rango y prueba un `ping` manual a un equipo conocido."],
          ["Equipos con punto naranja", "No contestan al ping (cortafuegos) pero responden a ARP. Es normal."],
          ["MAC vacía", "El equipo está en otra subred o no tiene entrada en la tabla ARP. La MAC solo se obtiene en la misma red local."],
          ["«Sin acceso» y «—»", "El equipo responde, pero no se pudo leer su ficha: no hay permisos de administrador, el cortafuegos bloquea WMI/RPC o no es un PC Windows (teléfonos IP, impresoras…). Pasa el ratón sobre «Sin acceso» o abre la ficha para ver el motivo exacto."],
          ["Mi PC sale repetido", "Si tu PC tiene varias tarjetas de red (cable, wifi, base de conexión) aparece una vez por cada IP, con el mismo nombre y la MAC de cada tarjeta."],
          ["Nombre vacío", "No hay registro DNS inverso ni nombre NetBIOS. Revisa la zona inversa del DNS."],
          ["«Acceso denegado»", "Tu usuario no es administrador del equipo. Usa «Usar otras credenciales» en la ficha."],
          ["«El servidor RPC no está disponible»", "El equipo está apagado, no es Windows o el cortafuegos bloquea WMI/RPC."],
          ["«Tiempo de espera agotado»", "Red lenta o equipo que no responde a WMI. Pulsa ↻ para reintentar."],
          ["Todo «—» en SO, RAM y almacenamiento", "La comprobación está desactivada o no hay permisos. Activa «Comprobar discos» y pulsa ↻ Recomprobar."],
          ["No se puede guardar el PDF o el CSV", "No hay permisos en la carpeta elegida. Prueba con Documentos o el Escritorio."],
        ],
      },
    ],
  },
  {
    id: "privacidad",
    title: "Privacidad y seguridad",
    blocks: [
      {
        t: "ul",
        x: [
          "SGIIPP-IPSCANER funciona **íntegramente en tu equipo**: no envía datos a Internet ni a ningún servidor.",
          "Las credenciales alternativas solo se mantienen en memoria durante la sesión y nunca se escriben en disco.",
          "Los informes y los CSV contienen nombres, direcciones y datos de equipos. Guárdalos y compártelos según las normas de seguridad de tu organización.",
          "Escanea solo redes sobre las que tengas autorización.",
        ],
      },
    ],
  },
  {
    id: "acerca",
    title: "Acerca de",
    blocks: [
      { t: "p", x: `**SGIIPP-IPSCANER** · versión ${__APP_VERSION__}` },
      {
        t: "p",
        x: "El número de versión sigue el formato **MAYOR.MENOR.PARCHE**: el **parche** sube al corregir errores, el **menor** al añadir novedades y, cada 10 versiones menores, sube el **mayor**.",
      },
      { t: "p", x: "Creado por el **Servicio de Informática CIS Guillermo Miranda de Murcia**. Pulsa el nombre de la aplicación (arriba a la izquierda) para ver los créditos." },
      { t: "p", x: "Aplicación de escritorio para Windows desarrollada con Tauri 2, Rust y React. Pulsa el número de versión del pie para ver las últimas novedades. Para consultar este manual en cualquier momento pulsa `F1` o el botón **?**." },
    ],
  },
];

