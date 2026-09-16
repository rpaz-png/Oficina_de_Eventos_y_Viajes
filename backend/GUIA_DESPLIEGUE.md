# Guía de despliegue — Backend de la Bitácora de Eventos

Todo esto se hace una sola vez, desde la cuenta **rvpaz@pucp.edu.pe** (que va a ser la dueña
del Sheet, del script, y la remitente de los correos). Toma unos 10-15 minutos.

## 1. Crear el Google Sheet ("la base de datos")

1. Entra a Google Drive con rvpaz@pucp.edu.pe → **Nuevo → Hoja de cálculo de Google**.
2. Nómbrala, por ejemplo, **"Bitácora de Eventos — Registros"**.
3. Renombra la pestaña de abajo (donde dice "Hoja 1") a **`Solicitudes`** (el nombre importa,
   el script busca exactamente ese nombre).
4. En la fila 1, pega estos encabezados, uno por columna, **en este orden exacto**:

   ```
   Fecha de registro | Unidad solicitante | Evento solicitado por | Nombre del coordinador | Celular del coordinador | Correo del coordinador | Nombre del evento | Tipo de evento | Fecha del evento | Horario | Descripción | Público objetivo | N.° de invitados esperados | Espacio propuesto | Notas del espacio | Requerimientos marcados | Observaciones | Estado
   ```

   (Son 18 columnas, de la A a la R.)

## 2. Crear la plantilla del PDF

1. En Drive, crea un **Documento de Google** nuevo, nómbralo **"Plantilla Ficha Evento"**.
2. Pega ahí todo el contenido del archivo `PLANTILLA_FICHA.txt` que te adjunté — dale el
   formato que quieras (negritas en los títulos de sección, el logo de la OEyV arriba, etc.),
   los marcadores `{{como_este}}` deben quedar exactamente como están, sin negrita a medias
   ni espacios extra dentro de las llaves.
3. Copia el **ID del documento** de la URL: `https://docs.google.com/document/d/`**`ESTE_ID`**`/edit`.

## 3. Pegar el script

1. En el Google Sheet del paso 1: **Extensiones → Apps Script**.
2. Borra el contenido de `Código.gs` y pega todo el contenido del archivo `Code.gs` que te adjunté.
3. Dentro del script, reemplaza estas tres líneas con tus propios valores:
   - `PLANTILLA_DOC_ID` → el ID que copiaste en el paso 2.
   - `CLAVE_FORMULARIO` → una clave cualquiera que tú inventes (ej. una frase larga sin espacios).
   - `CLAVE_PANEL` → otra clave distinta, para proteger el panel interno más adelante.
4. Click en el ícono de engranaje (**Configuración del proyecto**) → marca **"Mostrar el archivo
   de manifiesto 'appsscript.json' en el editor"**. Abre el archivo `appsscript.json` que
   aparece y reemplaza su contenido por el del archivo `appsscript.json` que te adjunté (fija
   los permisos que el script necesita, incluyendo el de exportar a Excel — sin esto, la
   exportación falla con un error 500).
5. Guarda (ícono de disquete o Ctrl+S).

## 4. Probar antes de conectar el formulario

1. En el editor de Apps Script, arriba selecciona la función **`pruebaManual`** en el desplegable.
2. Presiona **Ejecutar**. La primera vez te va a pedir autorización:
   - "Revisar permisos" → elige tu cuenta rvpaz@pucp.edu.pe.
   - Te va a decir "Google no verificó esta app" — es normal, es tu propio script. Click en
     **Avanzado** → **Ir a [nombre del proyecto] (no seguro)** → **Permitir**.
3. Si todo salió bien: revisa que apareció una fila nueva en "Solicitudes", y que llegaron los
   dos correos (el interno a eventos@pucp.edu.pe y el de confirmación a tu propio correo, ya
   que la prueba usa tu cuenta como "solicitante").
4. Si algo falla, en el editor ve a **Ejecuciones** (ícono de reloj a la izquierda) para ver el
   error exacto.

## 5. Publicar como Web App

1. En el editor de Apps Script: **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Configuración:
   - **Ejecutar como:** Yo (rvpaz@pucp.edu.pe)
   - **Quién tiene acceso:** Cualquier usuario
4. **Implementar**. Copia la **URL de la aplicación web** que te da (termina en `/exec`).
5. Guárdala — es la que pegamos en la Bitácora en el siguiente paso.

## 6. Conectar la Bitácora

En el archivo `bitacora.html` que te dejo actualizado, busca esta línea cerca del final del
`<script>` y reemplaza los dos valores:

```js
const WEBAPP_URL = 'PEGA_AQUI_LA_URL_DE_TU_WEB_APP';
const CLAVE_FORMULARIO = 'CAMBIA-ESTA-CLAVE-1'; // debe ser IDÉNTICA a la del Code.gs
```

Guarda y vuelve a publicar la página. Llena el formulario de prueba y confirma que:
- Aparece una fila nueva en el Sheet.
- Llega el correo interno a eventos@pucp.edu.pe (con copia a las tres personas).
- Llega el correo de confirmación solo al correo del coordinador que registraste.

## Solución de problemas

**Error `Request failed for https://docs.google.com ... returned code 500` en `pruebaManual`:**
Significa que al script le faltó el permiso para exportar el Excel (pasa incluso si el resto
del flujo —Sheet, PDF, correos— funcionó bien, porque usan permisos distintos). Solución: repite
el paso 4 de la sección 3 de arriba (pegar el `appsscript.json` con los `oauthScopes`) y vuelve
a ejecutar `pruebaManual` — te pedirá autorizar de nuevo porque cambiaron los permisos.

**Error `Specified permissions are not sufficient to call Session.getActiveUser()`:**
Al fijar los permisos manualmente en `appsscript.json`, el script deja de recibir automáticamente
cualquier permiso que no esté en esa lista — y `pruebaManual` usa tu correo (`Session.getActiveUser()`)
para simular al solicitante. Ya está incluido en el `appsscript.json` que te dejo, pero si en el
futuro agregas una función nueva que use un servicio distinto de Google, es probable que necesites
sumar su permiso correspondiente a esa misma lista.

## Notas y límites a tener en cuenta

- **Cuota de Gmail:** con una cuenta @pucp.edu.pe (Google Workspace), el límite es de
  alrededor de 1,500 correos salientes por día — muy por encima de lo que esta bitácora
  generará.
- **Quién puede escribir:** el Web App queda con acceso "Cualquier usuario" para que el
  formulario público pueda llamarlo sin que el visitante inicie sesión en Google. La clave
  `CLAVE_FORMULARIO` es una primera barrera contra envíos automatizados de terceros, pero no
  es un login real — si más adelante quieres algo más robusto (reCAPTCHA, por ejemplo),
  se puede agregar.
- **El panel interno (`doGet`)** ya está listo para que la vista de calendario/lista lea las
  solicitudes vía `TU_URL/exec?key=CLAVE_PANEL` — dime cuándo quieres que construya esa página
  y la conectamos.
