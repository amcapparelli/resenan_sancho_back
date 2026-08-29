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
 * Colors and fonts match theme.ts.
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
const FONT_HEADING = 'Georgia, \'Times New Roman\', Times, serif';
const FONT_BODY = 'Arial, Helvetica, sans-serif';

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
                  Recibes este email porque tienes una cuenta en
                  <a href="https://resenansancho.com" target="_blank" style="color:${COLORS.helperText}; text-decoration:underline;">resenansancho.com</a>
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
