# Nuevos canales de reseñas: TikTok y Podcast — Spec delta v1

Añade dos canales a la sección de canales del área personal
(`account-spec.md`, Sección 4, Bloque 1) y a las tarjetas del listado público
(`reviewers-spec.md`, "Canales literarios"). Todo lo no mencionado aquí sigue
como está en esas specs.

Canales tras el cambio (7): **Amazon · Goodreads · Instagram · TikTok ·
Booktube · Blog · Podcast**

Mailchimp no se toca: solo sincroniza géneros, formatos y país.

---

## Fase 1 — Backend: aceptar los nuevos canales

Los canales se guardan en MongoDB y son una lista cerrada. Hay que añadir
`tiktok` y `podcast` en todos los sitios donde se define o se recorre esa
lista.

### Qué hacer

1. Localizar dónde se definen los canales: schema de Mongoose del usuario,
   validación del endpoint que guarda los canales y cualquier constante o
   enum compartido.
2. Añadir `tiktok` y `podcast` con la misma forma que los existentes (nombre
   del perfil + URL), ambos opcionales.
3. **Revisar la lógica que decide si alguien tiene perfil de reseñas.** Hoy
   alguien pasa a ser "reseñador" cuando añade al menos un canal, y eso lo
   da de alta en la lista "Reseñadores" de Mailchimp y lo muestra en el
   listado. Si esa comprobación enumera los canales uno a uno (por ejemplo
   un `$or` sobre campos concretos), debe incluir los dos nuevos. Una persona
   que solo tenga TikTok o solo Podcast tiene que contar como perfil de
   reseñas.
4. Revisar también los endpoints del listado público de perfiles y la ficha
   del perfil: que devuelvan los nuevos canales al frontend.

No hace falta migración: los documentos existentes simplemente no tienen
esos campos.

No se añade validación de URL en la API, igual que en el resto de canales.

### Criterios de prueba (Fase 1)

Tests que deben fallar antes del cambio:

- [ ] Guardar un usuario con canal `tiktok` → 200 y el canal persiste en
      MongoDB.
- [ ] Ídem con `podcast`.
- [ ] Usuario con **solo** TikTok aparece en el endpoint del listado de
      perfiles de reseñas.
- [ ] Usuario con **solo** Podcast se sincroniza con la lista "Reseñadores"
      de Mailchimp (probar con un contacto de prueba, nunca en lote).
- [ ] Usuarios existentes sin los campos nuevos se leen y guardan sin error.

---

## Fase 2 — Frontend: formulario de la cuenta

### Orden de los canales

De menor a mayor esfuerzo, para transmitir que no hace falta blog:

1. Amazon
2. Goodreads
3. Instagram
4. TikTok
5. Booktube
6. Blog
7. Podcast

Si el orden vive en una constante compartida con el listado público, usar
el mismo orden en los dos sitios.

### Filas nuevas

Mismo componente y estilos que las filas existentes (toggle + campos
revelables "Nombre del perfil" y "URL").

| Canal | Etiqueta | Icono (SVG inline, 18px, `currentColor`) | Placeholder nombre | Placeholder URL |
| --- | --- | --- | --- | --- |
| TikTok | TikTok | Nota musical | `@tuusuario` | `https://www.tiktok.com/@tuusuario` |
| Podcast | Podcast | Micrófono | `Nombre del podcast` | `https://open.spotify.com/show/…` |

Iconos genéricos, no logotipos de marca, igual que el resto de canales.

### Validación (solo cliente)

- **TikTok:** el host debe ser `tiktok.com`, `www.tiktok.com` o
  `vm.tiktok.com`. Si no, error: `Este enlace no parece de TikTok.`
- **Podcast:** cualquier URL válida (los podcasts se alojan en muchas
  plataformas: Spotify, iVoox, Apple Podcasts, web propia…). Solo se aplica
  la validación de formato URL que ya tienen los demás canales.
- Mismo estado de error que el resto de campos (`account-spec.md`).
- Se valida en blur y al guardar, como los demás.

### Criterios de prueba (Fase 2)

- [ ] Aparecen 7 canales en el orden indicado, en escritorio y en móvil.
- [ ] Activar TikTok, rellenar y guardar → al recargar sigue activo con sus
      datos.
- [ ] Ídem con Podcast.
- [ ] URL de TikTok con otro dominio → error y guardado bloqueado.
- [ ] URL de Podcast de iVoox y de Spotify → se acepta.
- [ ] Toggles nuevos accesibles igual que los existentes (`role="switch"`,
      teclado, `aria-expanded`).

---

## Fase 3 — Frontend: listado público y perfil

En la tarjeta de perfil (`reviewers-spec.md`, "Canales literarios") y en
cualquier otro sitio donde se pinten los chips de canal:

- Chip de TikTok: icono nota musical (12px) + `TikTok`.
- Chip de Podcast: icono micrófono (12px) + `Podcast`.
- Mismo estilo que el resto de chips de canal; mismo orden que en el
  formulario.
- El enlace se abre en pestaña nueva con `rel="noopener noreferrer"`, igual
  que los demás.

### Criterios de prueba (Fase 3)

- [ ] Perfil con TikTok y Podcast muestra ambos chips con su icono y enlace
      correcto.
- [ ] Perfil con solo TikTok aparece en el listado y su tarjeta muestra el
      chip.
- [ ] Los perfiles sin canales nuevos se ven igual que antes.

---

## Archivos afectados (orientativo)

```
backend: schema de usuario (canales), validación del endpoint de canales,
         lógica "tiene perfil de reseñas" (listado + sync Mailchimp)
frontend: constante/lista de canales (orden, etiqueta, icono, placeholder)
          AccountPage/sections/SpacesSection.tsx
          componente de chips de canal del listado (reviewers-spec.md)
          iconos nuevos: nota musical, micrófono
```

---

*Fase 1 con `senior-backend`; Fases 2–3 con `senior-frontend`, revisando cada
una con `frontend-reviewer`. Desplegar la Fase 1 antes que la 2: si el
frontend envía canales que el backend no acepta, el guardado fallará.
Contexto: `account-spec.md`, `reviewers-spec.md`.*
