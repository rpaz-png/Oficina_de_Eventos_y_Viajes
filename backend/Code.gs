/**
 * BITÁCORA DE EVENTOS — OEyV PUCP
 * Backend en Google Apps Script.
 *
 * Qué hace:
 *  1. Recibe el registro del formulario (doPost).
 *  2. Lo guarda como una fila nueva en la hoja "Solicitudes".
 *  3. Genera un PDF (desde la plantilla de Google Docs) y un Excel (.xlsx) con el resumen.
 *  4. Envía el correo interno a OEyV (con copia) y el correo de confirmación al solicitante.
 *  5. Expone doGet para que el panel interno pueda listar las solicitudes guardadas.
 *
 * INSTALACIÓN: ver GUIA_DESPLIEGUE.md — resumen rápido:
 *  - Este script debe vivir DENTRO de la Hoja de cálculo (Extensiones > Apps Script).
 *  - Reemplaza PLANTILLA_DOC_ID por el ID de tu documento plantilla (ver PLANTILLA_FICHA.txt).
 *  - Cambia CLAVE_FORMULARIO y CLAVE_PANEL por tus propias claves antes de desplegar.
 *  - Despliega como Web App: "Ejecutar como: Yo (rvpaz@pucp.edu.pe)" / "Acceso: Cualquier usuario".
 */

// ====================== CONFIGURACIÓN ======================

const SHEET_NAME = 'Solicitudes';

const CORREO_OEYV = 'eventos@pucp.edu.pe';
const CORREO_CC = [
  'katherine.chipana@pucp.edu.pe',
  'romero.ag@pucp.edu.pe',
  'eliana.chiclayo@pucp.pe'
];

// ID del documento de Google Docs que sirve de plantilla del PDF (ver PLANTILLA_FICHA.txt).
// Se obtiene de la URL del doc: https://docs.google.com/document/d/ESTE_ES_EL_ID/edit
const PLANTILLA_DOC_ID = 'PEGA_AQUI_EL_ID_DE_TU_PLANTILLA_DE_GOOGLE_DOCS';

// Clave simple que el formulario debe enviar junto con los datos (evita envíos automatizados
// de terceros, ya que el Web App queda con acceso "Cualquier usuario"). Cambia este valor y
// usa el mismo en bitacora.html (constante CLAVE_FORMULARIO del script).
const CLAVE_FORMULARIO = 'CAMBIA-ESTA-CLAVE-1';

// Clave para el panel interno (doGet). Cambia este valor y úsalo como ?key=... al consultar.
const CLAVE_PANEL = 'CAMBIA-ESTA-CLAVE-2';

// Orden de columnas en la hoja "Solicitudes" — debe coincidir con la fila de encabezados
// que pegues en la fila 1 (ver GUIA_DESPLIEGUE.md).
const CAMPOS = [
  'fecha_registro',
  'unidad_solicitante',
  'evento_solicitado_por',
  'nombre_coordinador',
  'celular_coordinador',
  'correo_coordinador',
  'nombre_evento',
  'tipo_evento',
  'fecha_evento',
  'horario',
  'descripcion',
  'publico_objetivo',
  'num_invitados',
  'espacio',
  'notas_espacio',
  'requerimientos',
  'observaciones',
  'estado'
];

const ETIQUETAS_CAMPOS = {
  fecha_registro: 'Fecha de registro',
  unidad_solicitante: 'Unidad solicitante',
  evento_solicitado_por: 'Evento solicitado por',
  nombre_coordinador: 'Nombre del coordinador',
  celular_coordinador: 'Celular del coordinador',
  correo_coordinador: 'Correo del coordinador',
  nombre_evento: 'Nombre del evento',
  tipo_evento: 'Tipo de evento',
  fecha_evento: 'Fecha del evento',
  horario: 'Horario',
  descripcion: 'Descripción',
  publico_objetivo: 'Público objetivo',
  num_invitados: 'N.° de invitados esperados',
  espacio: 'Espacio propuesto',
  notas_espacio: 'Notas del espacio',
  requerimientos: 'Requerimientos marcados',
  observaciones: 'Observaciones',
  estado: 'Estado'
};

// ====================== PUNTOS DE ENTRADA ======================

function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);

    if (datos.clave !== CLAVE_FORMULARIO) {
      return respuestaJSON({ ok: false, error: 'Clave inválida' });
    }
    if (!datos.nombre_evento || !datos.correo_coordinador) {
      return respuestaJSON({ ok: false, error: 'Faltan campos obligatorios' });
    }

    datos.fecha_registro = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
    datos.estado = 'Enviado';

    guardarEnSheet(datos);

    const docTemporal = generarDocDesdeMarcadores(datos);
    const pdfBlob = docTemporal.getAs(MimeType.PDF).setName(`Ficha - ${datos.nombre_evento}.pdf`);
    const xlsxBlob = generarExcelResumen(datos);

    enviarCorreoInterno(datos, pdfBlob, xlsxBlob);
    enviarCorreoConfirmacion(datos, pdfBlob);

    DriveApp.getFileById(docTemporal.getId()).setTrashed(true);

    return respuestaJSON({ ok: true });
  } catch (err) {
    return respuestaJSON({ ok: false, error: String(err) });
  }
}

// Panel interno: GET .../exec?key=CLAVE_PANEL  -> devuelve todas las solicitudes en JSON.
function doGet(e) {
  if (!e.parameter.key || e.parameter.key !== CLAVE_PANEL) {
    return respuestaJSON({ ok: false, error: 'No autorizado' });
  }
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const filas = hoja.getDataRange().getValues();
  filas.shift(); // quita la fila de encabezados legibles
  const registros = filas.map(fila => {
    const obj = {};
    CAMPOS.forEach((campo, i) => (obj[campo] = fila[i]));
    return obj;
  });
  return respuestaJSON({ ok: true, registros });
}

function respuestaJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ====================== GUARDADO ======================

function guardarEnSheet(datos) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const fila = CAMPOS.map(campo => datos[campo] || '');
  hoja.appendRow(fila);
}

// ====================== GENERACIÓN DE PDF ======================

function generarDocDesdeMarcadores(datos) {
  const copia = DriveApp.getFileById(PLANTILLA_DOC_ID).makeCopy(`Ficha - ${datos.nombre_evento}`);
  const doc = DocumentApp.openById(copia.getId());
  const cuerpo = doc.getBody();
  CAMPOS.forEach(campo => {
    cuerpo.replaceText(`{{${campo}}}`, escaparParaDoc(datos[campo]));
  });
  doc.saveAndClose();
  return DriveApp.getFileById(copia.getId());
}

// replaceText de Apps Script usa expresiones regulares: escapamos el contenido del usuario
// para que caracteres como ( ) . * no rompan el reemplazo, y evitamos strings vacíos.
function escaparParaDoc(valor) {
  const texto = (valor === undefined || valor === null || valor === '') ? '—' : String(valor);
  return texto.replace(/\$/g, '$$$$');
}

// ====================== GENERACIÓN DE EXCEL ======================

function generarExcelResumen(datos) {
  const hojaTemp = SpreadsheetApp.create(`Ficha - ${datos.nombre_evento}`);
  const hoja = hojaTemp.getSheets()[0];

  const filas = CAMPOS.map(campo => [ETIQUETAS_CAMPOS[campo] || campo, datos[campo] || '—']);
  hoja.getRange(1, 1, filas.length, 2).setValues(filas);
  hoja.getRange(1, 1, filas.length, 1).setFontWeight('bold');
  hoja.autoResizeColumns(1, 2);
  SpreadsheetApp.flush();
  Utilities.sleep(1500); // margen para que el archivo recién creado quede indexado antes de exportarlo

  const url = `https://docs.google.com/spreadsheets/d/${hojaTemp.getId()}/export?format=xlsx`;
  const respuesta = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });

  if (respuesta.getResponseCode() !== 200) {
    DriveApp.getFileById(hojaTemp.getId()).setTrashed(true);
    throw new Error(
      `No se pudo exportar el Excel (código ${respuesta.getResponseCode()}). ` +
      `Revisa que appsscript.json tenga el alcance "https://www.googleapis.com/auth/drive" y vuelve a autorizar el script.`
    );
  }

  const blob = respuesta.getBlob().setName(`Ficha - ${datos.nombre_evento}.xlsx`);
  DriveApp.getFileById(hojaTemp.getId()).setTrashed(true);
  return blob;
}

// ====================== CORREOS ======================

function enviarCorreoInterno(datos, pdfBlob, xlsxBlob) {
  const asunto = `Solicitud de evento registrada — ${datos.nombre_evento}`;
  const cuerpo =
`Estimados,

Se registró una nueva solicitud de evento a través de la Bitácora de Eventos de la OEyV. Estos son los datos principales:

Evento: ${datos.nombre_evento}
Unidad solicitante: ${datos.unidad_solicitante}
Coordinador: ${datos.nombre_coordinador} · ${datos.celular_coordinador} · ${datos.correo_coordinador}
Tipo: ${datos.tipo_evento}
Fecha: ${datos.fecha_evento} · Horario: ${datos.horario}
N.° de invitados esperados: ${datos.num_invitados}
Espacio propuesto: ${datos.espacio}

Se adjunta el resumen completo en Excel y PDF.

Este correo se generó automáticamente al completarse el formulario.

Oficina de Eventos y Viajes`;

  GmailApp.sendEmail(CORREO_OEYV, asunto, cuerpo, {
    cc: CORREO_CC.join(','),
    attachments: [pdfBlob, xlsxBlob],
    name: 'Oficina de Eventos y Viajes'
  });
}

function enviarCorreoConfirmacion(datos, pdfBlob) {
  const asunto = `Recepción de solicitud de evento — ${datos.nombre_evento}`;
  const cuerpo =
`Hola ${datos.nombre_coordinador},

Confirmamos la recepción de tu solicitud para el evento "${datos.nombre_evento}", registrada el ${datos.fecha_registro} a través de la Bitácora de Eventos de la Oficina de Eventos y Viajes (OEyV).

Adjuntamos un resumen en PDF con los datos que registraste. En los próximos días, el equipo de OEyV se pondrá en contacto contigo para coordinar los siguientes pasos.

Si necesitas hacer alguna corrección o tienes alguna consulta mientras tanto, puedes responder directamente a este correo.

Saludos cordiales,
Oficina de Eventos y Viajes
Pontificia Universidad Católica del Perú`;

  GmailApp.sendEmail(datos.correo_coordinador, asunto, cuerpo, {
    attachments: [pdfBlob],
    name: 'Oficina de Eventos y Viajes'
  });
}

// ====================== PRUEBA MANUAL ======================
// Selecciona esta función en el editor de Apps Script y presiona "Ejecutar" para probar
// todo el flujo (guardado + PDF + Excel + correos) sin necesitar el formulario todavía.
function pruebaManual() {
  const datosDePrueba = {
    clave: CLAVE_FORMULARIO,
    unidad_solicitante: 'Dirección Académica del Profesorado (DAP)',
    evento_solicitado_por: 'Nombre Apellido de prueba',
    nombre_coordinador: 'Nombre Apellido de prueba',
    celular_coordinador: '+51 999 999 999',
    correo_coordinador: Session.getActiveUser().getEmail(),
    nombre_evento: 'Evento de prueba',
    tipo_evento: 'Presencial',
    fecha_evento: '2026-03-26',
    horario: '6:00 PM – 8:00 PM',
    descripcion: 'Descripción de prueba para validar el flujo completo.',
    publico_objetivo: 'Profesores, Administrativos',
    num_invitados: '180',
    espacio: 'Auditorio de Humanidades',
    notas_espacio: 'Sin notas',
    requerimientos: 'Audiovisuales, Mobiliario',
    observaciones: 'Este es un envío de prueba, ignorar.'
  };
  const resultado = doPost({ postData: { contents: JSON.stringify(datosDePrueba) } });
  Logger.log(resultado.getContent());
}
