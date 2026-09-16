# Sitio OEyV — Oficina de Eventos y Viajes (PUCP)

Landing institucional + formulario de registro de eventos ("Bitácora"), conectado a un
backend en Google Apps Script (Sheet + PDF + Excel + correos automáticos).

## Estructura del proyecto

```
oeyv-sitio/
├── index.html          → Landing page (Inicio). Punto de entrada del sitio.
├── bitacora.html        → Formulario de registro de eventos, ya conectado al backend.
└── backend/             → Todo lo que vive en Google (no se publica en GitHub Pages).
    ├── Code.gs               → Script de Apps Script (Sheet + PDF + Excel + correos).
    ├── appsscript.json       → Manifiesto de permisos del script.
    ├── PLANTILLA_FICHA.txt   → Contenido para la plantilla de Google Docs (genera el PDF).
    └── GUIA_DESPLIEGUE.md    → Pasos para desplegar el backend, uno por uno.
```

## Cómo funciona el flujo

1. Alguien entra a `index.html`, ve los servicios de la OEyV, y hace clic en
   **"¡Registra tu evento!"** (arriba) o **"Completa el brief de tu evento"** (en la portada
   o al final de la página).
2. Eso lo lleva a `bitacora.html`, donde completa el formulario de 6 secciones.
3. Al enviar, `bitacora.html` llama al Web App de Apps Script (carpeta `backend/`), que:
   - Guarda la solicitud en un Google Sheet.
   - Genera un PDF (desde la plantilla de Google Docs) y un Excel con el resumen.
   - Envía el correo interno a OEyV (con copia al equipo) y el correo de confirmación
     al solicitante.

El backend ya está desplegado y conectado (la URL del Web App y la clave del formulario
están dentro de `bitacora.html`). Si alguna vez necesitas volver a desplegarlo desde cero
—por ejemplo, en otra cuenta de Google— sigue `backend/GUIA_DESPLIEGUE.md`.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub y sube el contenido de esta carpeta (`index.html`,
   `bitacora.html`, `backend/`) tal cual, sin subcarpetas intermedias.
2. En el repositorio: **Settings → Pages**.
3. En "Build and deployment", elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. Guarda. GitHub te da una URL del tipo `https://tu-usuario.github.io/tu-repo/` — esa es
   la landing (`index.html`) ya publicada; la bitácora queda en
   `https://tu-usuario.github.io/tu-repo/bitacora.html`.

**Nota de seguridad:** si el repositorio es público, cualquiera puede ver el código fuente
de `bitacora.html`, incluida la clave del formulario y la URL del Web App. Esa clave es
solo un freno básico contra envíos automatizados de terceros, no una autenticación real —
si prefieres evitar esto por completo, sube el repositorio como **privado** (GitHub Pages
funciona igual en repos privados si tienes un plan que lo permite) o dime y vemos una
alternativa más robusta (por ejemplo, un pequeño proxy o reCAPTCHA).

## Pendientes conocidos

- Tres fotos todavía están como placeholder en `index.html` (seguidas de un ícono, con la
  etiqueta "Imagen pendiente"): **anfitriones**, **restaurantes (Museo Larco)** y
  **graduaciones PUCP**. En cuanto las tengas, se reemplazan igual que se hizo con la foto
  de portada.
- El enlace del botón de "Graduaciones PUCP" apunta genéricamente a `paideia.pucp.edu.pe`
  — falta el enlace específico a la página donde se documenta el trabajo de OEyV con las
  graduaciones, si es que existe una distinta a la plataforma general.
- El botón de "Solicitar anfitriones" usa un `mailto:` como solución temporal, hasta que se
  construya su propio sistema de registro (como el de la bitácora).
- El panel interno para ver el listado de solicitudes y el calendario (alimentado por el
  `doGet` del backend) todavía no está construido.
