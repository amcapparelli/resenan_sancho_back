# Email de nuevo libro — Plantilla de marca (`newBookTemplate`)

**Agente destino:** senior-backend
**Toca base de datos:** no. Cambio aislado sobre el HTML de un email.

---

## Objetivo

Sustituir el HTML sin maquetar de `newBookTemplate` por un email con la
identidad de marca de Reseñan Sancho, y crear una capa reutilizable
(`emailLayout.js`) para que el resto de plantillas de email se migren
después, una a una.

## Contexto

- El envío de emails se hace con Nodemailer. Cada plantilla es una función
  que devuelve `{ from, to, subject, html }`.
- Hasta ahora el HTML de las plantillas no tenía ningún estilo (texto plano
  con `<p>`/`<b>`, sin maquetación).
- Este cambio toca **solo** `newBookTemplate`. El resto de plantillas (aviso
  a reseñador, solicitud de ejemplar, etc.) se abordan en tareas
  posteriores, reutilizando `emailLayout.js` — no las toques en esta tarea.

## Restricciones técnicas del email

Estas reglas son específicas del HTML de email y **no aplican** al resto del
código del proyecto (React/Next sí puede usar CSS moderno con normalidad):

- **Sin CSS externo ni `@font-face`.** Outlook de escritorio renderiza con el
  motor de Word: no soporta fuentes web, flexbox ni grid. Todo el maquetado
  usa tablas (`<table role="presentation">`) y estilos **inline**.
- **Tipografías:** pila de fuentes de sistema (`Georgia, 'Times New Roman',
  serif` para titulares, `Arial, Helvetica, sans-serif` para cuerpo) que
  imita el par Fraunces/Source Sans 3, porque las fuentes web no son fiables
  en clientes de correo.
- **Colores:** los mismos tokens que `theme.ts` (tinta `#3D3A35`, mostaza
  `#F2B705`, teja `#C75B22`, crema `#FBF1D8`, marrón `#6B4A16`). El botón CTA
  usa teja con texto blanco, igual que en la web.
- **Botón "a prueba de balas":** el color de fondo se fija tanto por CSS como
  por el atributo HTML `bgcolor` en el `<td>`, para que sobreviva en Outlook
  aunque ignore el CSS.
- `<meta name="color-scheme" content="light">` evita que Gmail/Apple Mail
  inviertan automáticamente la paleta cálida en modo oscuro.
- El SVG del logo (navbar) **no se usa aquí**: el soporte de SVG en email es
  muy inconsistente entre clientes. El email usa el wordmark en texto.

## Archivos a crear/modificar

Ubica el archivo actual de `newBookTemplate` dentro del repo backend
(junto al resto de plantillas de email) y coloca `emailLayout.js` como
**hermano** en la misma carpeta, para que el `require('./emailLayout')`
relativo funcione. Ajusta la ruta de import si la estructura real difiere.

1. **Nuevo** — `emailLayout.js`: capa de marca reutilizable (cabecera con
   wordmark, franja de acento, pie, helper de botón CTA).
2. **Modificado** — `newBookTemplate.js`: mismo contenido y textos que la
   versión actual, ahora maquetado a través de `emailLayout.js`.

### `emailLayout.js`

```javascript
/**
 * Shared branded wrapper for all Reseñan Sancho transactional emails.
 *
 * Email clients (especially Outlook desktop, which renders with Word's
 * engine) don't support modern CSS: no flexbox/grid, unreliable border-radius,
 * no external stylesheets, no @font-face. Everything structural is
 * table-based and every style is inlined. This keeps the visual language
 * consistent across every email without repeating boilerplate in each
 * template.
 *
 * Colors and fonts match theme.ts (see sistema-diseno-resenan-sancho.md).
 */

const COLORS = {
  tinta: '#3D3A35',
  mostaza: '#F2B705',
  teja: '#C75B22',
  crema: '#FBF1D8',
  marron: '#6B4A16',
  white: '#FFFFFF',
  border: '#e8dfc8',
  helperText: '#9a8c7e',
  bgOuter: '#FAF6EC',
};

// Web-safe fallbacks: Fraunces / Source Sans 3 aren't reliably supported by
// email clients (no @font-face in Outlook desktop), so we fall back to
// system fonts that echo the same serif/sans-serif pairing.
const FONT_HEADING = "Georgia, 'Times New Roman', Times, serif";
const FONT_BODY = "Arial, Helvetica, sans-serif";

/**
 * Bulletproof CTA button: the background color is set both as a CSS style
 * AND as an HTML bgcolor attribute on the <td>, so it survives Outlook's
 * stripped-down renderer even where the CSS is ignored.
 */
const button = (label, url) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px auto 8px;">
    <tr>
      <td align="center" bgcolor="${COLORS.teja}" style="background-color:${COLORS.teja}; border-radius: 8px;">
        <a href="${url}"
           target="_blank"
           style="display: inline-block; padding: 14px 32px; font-family: ${FONT_BODY};
                  font-size: 16px; font-weight: 700; color: ${COLORS.white};
                  text-decoration: none; border-radius: 8px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

/**
 * Wraps a template's inner body HTML in the full branded email shell:
 * preheader, header with wordmark, content card, optional CTA, footer.
 *
 * @param {Object} params
 * @param {string} [params.preheader] - Short preview text shown next to the subject in the inbox list (not visible inside the email body).
 * @param {string} params.bodyHtml - The template-specific content (paragraphs, callouts, etc). Should NOT include <html>/<body> tags.
 * @param {string} [params.ctaLabel] - Optional CTA button label.
 * @param {string} [params.ctaUrl] - Optional CTA button destination. Required if ctaLabel is set.
 */
const buildBrandedEmail = ({ preheader = '', bodyHtml, ctaLabel, ctaUrl }) => `
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: ${COLORS.bgOuter}; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${COLORS.bgOuter};">
  ${preheader ? `
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${preheader}
    ${'&zwnj;&nbsp;'.repeat(15)}
  </div>` : ''}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bgOuter};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:600px; max-width:600px; background-color:${COLORS.white}; border-radius:12px; border:1px solid ${COLORS.border};">

          <!-- Header -->
          <tr>
            <td class="email-padding" align="center" style="padding: 32px 32px 20px;">
              <div style="font-family:${FONT_HEADING}; font-size:22px; font-weight:700; color:${COLORS.tinta};">
                Reseñan, Sancho.
              </div>
              <div style="font-family:${FONT_BODY}; font-size:12px; color:${COLORS.marron}; margin-top:4px;">
                Señal que somos escritores.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px;">
              <div style="height:3px; line-height:3px; font-size:0; background-color:${COLORS.teja}; border-radius:2px;">&nbsp;</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-padding" style="padding: 28px 32px 8px; font-family:${FONT_BODY}; font-size:16px; line-height:1.6; color:${COLORS.tinta};">
              ${bodyHtml}
              ${ctaLabel && ctaUrl ? button(ctaLabel, ctaUrl) : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-padding" style="padding: 24px 32px 32px;">
              <div style="border-top: 1px solid ${COLORS.border}; padding-top: 20px; text-align:center;">
                <div style="font-family:${FONT_HEADING}; font-size:14px; font-weight:700; color:${COLORS.tinta};">
                  RESEÑAN SANCHO
                </div>
                <div style="font-family:${FONT_BODY}; font-size:12px; color:${COLORS.helperText}; margin-top:6px;">
                  Recibes este email porque tienes una cuenta en resenansancho.com
                </div>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

module.exports = { buildBrandedEmail, COLORS, FONT_BODY, FONT_HEADING };
```

### `newBookTemplate.js`

```javascript
const { buildBrandedEmail, COLORS, FONT_BODY } = require('./emailLayout');

const newBookTemplate = (authorEmail, authorName, bookTitle) => {
  const from = 'resenansancho-no-reply@resenansancho.com';
  const to = authorEmail;
  const subject = `¡No te olvides de agregar ejemplares de ${bookTitle}!`;

  const ctaUrl = `${process.env.FRONTEND_URL}/account?section=books`;

  const bodyHtml = `
    <p style="margin:0 0 16px;">Hola ${authorName},</p>
    <p style="margin:0 0 16px;">
      ¡Enhorabuena, ya has dado el primer paso para promocionar tu libro
      <strong style="color:${COLORS.tinta};">${bookTitle}</strong>!
    </p>
    <p style="margin:0 0 16px;">
      Esto es lo que puedes hacer ahora para <strong>acelerar la promoción de tu libro</strong>:
    </p>
    <p style="margin:0 0 20px;">
      Desde tu área privada, en la sección <strong>Mis libros</strong>, podrás añadir
      ejemplares que aparecerán como disponibles para que los reseñadores literarios
      te los soliciten.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px;">
      <tr>
        <td style="background-color:${COLORS.crema}; border-left:4px solid ${COLORS.teja}; padding:16px 20px; font-family:${FONT_BODY}; font-size:15px; color:${COLORS.tinta};">
          🔖 Empieza utilizando la opción <strong>Promocionar</strong> y selecciona
          <strong>la oferta para añadir 2 ejemplares gratuitos</strong> para probar el servicio.
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;">
      Si quieres añadir más ejemplares, podrás hacerlo todas las veces que quieras
      con las opciones de pago.
    </p>
    <p style="margin:0;">
      Si algún reseñador literario solicita un ejemplar, te lo notificaremos por email.
      ¡Mucha suerte con la promoción de tu libro!
    </p>
  `;

  const html = buildBrandedEmail({
    preheader: `Añade ejemplares de ${bookTitle} y consigue que los reseñadores literarios lo descubran.`,
    bodyHtml,
    ctaLabel: 'Ir a Mis libros',
    ctaUrl,
  });

  return { from, to, subject, html };
};

module.exports = newBookTemplate;
```

## Variables de entorno

La URL del CTA se construye así:

```
${process.env.FRONTEND_URL}/account?section=books
```

Verifica que `FRONTEND_URL` es el nombre real de la config var en este
proyecto (Heroku). Si el proyecto usa otro nombre para la URL base del
frontend, es la única línea de `newBookTemplate.js` que hay que tocar.

## Módulos: CommonJS

El código está escrito en CommonJS (`require`/`module.exports`), por ser lo
habitual en el resto del backend. Si alguna parte del proyecto ya usa ESM,
adapta el `import`/`export` sin cambiar el resto del archivo.

## Cómo probar en local (antes de tocar producción)

1. Genera el HTML de una llamada de ejemplo (`newBookTemplate('tu-email@dominio.com', 'Nombre de prueba', 'Título de prueba')`)
   y guárdalo en un `.html` local para una primera revisión visual rápida en
   el navegador. **Esto no sustituye** la prueba en un cliente real: el
   navegador no reproduce las peculiaridades de renderizado de Outlook.
2. Con el transporte de Nodemailer que ya existe en el proyecto, envía un
   email de prueba real a dos o tres direcciones propias en proveedores
   distintos (por ejemplo, Gmail y Outlook/Hotmail).
3. Revisa especialmente: que el botón se ve con fondo teja y texto blanco
   (no como enlace azul subrayado sin estilo), que el texto no se corta en
   móvil, y que el preheader no muestra "Hola {nombre}," en crudo junto al
   asunto.
4. Sigue el flujo habitual del proyecto (rama `feature/`, commit corto,
   despliegue tras verificar).

## Fuera de alcance (tareas futuras, no abordar aquí)

- Migrar el resto de plantillas de email a `emailLayout.js`.
- Añadir el logo real como imagen. Si en el futuro se quiere el logo (no solo
  el wordmark en texto), habría que generar un PNG y subirlo a Cloudinary,
  igual que las imágenes de Instagram — el SVG del navbar no es una opción
  fiable en email.

---

*Para implementar este cambio, delegar en el agente `senior-backend` con
este documento como contexto.*
