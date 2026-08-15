# Home — Highlights (libros destacados + géneros top) · Especificación técnica

Documento de referencia para implementar el endpoint que alimenta dos bloques
de contenido en la home: **libros destacados** y **géneros más activos**.
Complementa `home-hero-spec.md` (diseño visual) y se integra en el trabajo de
S4 (home SSR + JSON-LD).

---

## Contexto y objetivo

La home tiene poco contenido sustancial, lo cual es un problema doble:

1. **SEO**: pocas señales semánticas de qué trata el sitio.
2. **Producto**: no se están mostrando los servicios de promoción para
   escritores ni la actividad real de la plataforma.

Este endpoint resuelve el segundo bloque de contenido: una sección de
"libros destacados" (con más ejemplares disponibles) y otra de "géneros más
activos" (con más libros disponibles por género), enlazando a rutas ya
existentes en producción.

---

## Endpoint

### `GET /home/highlights`

Devuelve ambos bloques en una sola respuesta, para evitar dos round-trips
desde `getServerSideProps` de home. Público, sin `verifyToken()`.

> El backend monta todas sus rutas en la raíz (`/books`, `/login`, `/version`);
> no existe prefijo `/api`. Si el frontend llama a `/api/home/highlights`, ese
> `/api` es el rewrite/proxy de Next, no parte del path del backend.

#### Response

```json
{
  "featuredBooks": [
    {
      "id": "...",
      "title": "...",
      "author": "Carlos Zafón",
      "genre": "HIF",
      "copies": 8
    }
  ],
  "topGenres": [
    { "code": "HIF", "totalBooks": 142 },
    { "code": "POE", "totalBooks": 98 },
    { "code": "ADV", "totalBooks": 76 }
  ],
  "cachedAt": "2026-08-15T10:00:00Z"
}
```

Las claves van en inglés, como el modelo y el resto de endpoints (`/books`).

- `featuredBooks`: top 4 libros ordenados por `copies desc` (con `create_at
  desc` como desempate, para que el orden sea determinista).
- `topGenres`: top 3 géneros ordenados por cantidad de libros disponibles en
  ese género.
- Ambos bloques cuentan **sólo libros con `copies > 0`**: un libro sin
  ejemplares no es solicitable, así que ni se destaca ni infla su género. Es el
  mismo criterio de disponibilidad que ya usa `routes/books.js`.
- `author` viene aplanado a un string de display (`name + lastName`); la card
  sólo necesita un nombre y así no se filtran internos del usuario.
- El libro no tiene `slug` en el modelo, y el destino del link es
  `/books/[id]` (SSR desde PR #64), así que se devuelve `id` a secas.

#### Mapping de género (decidido)

El backend devuelve el **código interno de 3 letras**
(`utils/constants/genres.js`: `HIF`, `POE`, `ADV`…) y el frontend lo traduce a
slug y a nombre en español con la tabla bidireccional que ya posee en
`src/data/genres.ts`. Así el mapping tiene una sola fuente de verdad y el
backend no duplica datos de presentación.

- Género → `/libros/genero/<slug>`, con el slug resuelto en frontend.
- **Ojo**: hay 17 códigos en `utils/constants/genres.js`. Antes de construir
  los links conviene verificar que `src/data/genres.ts` los cubre todos — los
  ejemplos originales de este documento (`ensayo`, `novela-historica`) no
  corresponden uno a uno con esos códigos.

---

## Caché

Dado que ninguno de los dos bloques cambia con frecuencia, y el dyno
contratado es **Heroku Basic (single dyno)**, no hay problema de
consistencia entre procesos: una caché en memoria del proceso Express es
suficiente y evita añadir Redis o un documento de caché en Mongo.

### Parámetros

- **TTL: 24 horas** para ambos bloques (`featuredBooks` y `topGenres`).
- **Una única entrada de caché**, no por-usuario ni por-request — ambos
  bloques son iguales para todo el mundo. La home no debería tocar Mongo
  salvo, como mucho, una vez al día.
- **Sin invalidación activa** en esta v1.

### Implementación

Vive en `lib/homeHighlights.js`, que expone `getHomeHighlights()` y
`invalidateHomeHighlights()`. Sigue el esquema de referencia con dos matices
añadidos al implementarlo:

- **De-duplicación de misses concurrentes**: se guarda la promesa en vuelo, de
  forma que una caché fría (arranque de dyno) dispara una sola ronda de
  queries y no una por request simultánea.
- **Los errores no se cachean**: si una query falla no se guarda nada, así que
  el siguiente request reintenta en vez de servir una caché envenenada. La ruta
  responde `500` con mensaje en español.

`invalidateHomeHighlights()` no se usa desde la API en esta v1 (no hay
invalidación activa); queda como gancho para el caso futuro descrito más abajo
y lo usan los tests para partir de caché fría.

### Notas

- **Reinicio del dyno**: en Heroku Basic el dyno se recicla al menos una vez
  al día (cycling) y en cada deploy, así que la caché en memoria se refresca
  con esa cadencia natural. No hay riesgo real de quedarse con datos muy
  desactualizados.
- **Evolución futura**: si en algún momento las compras de servicios de
  promoción (`boost25`, `featuredWeek`) deben afectar a `featuredBooks` en
  tiempo real, se puede invalidar la caché puntualmente al confirmarse un
  pago — para eso está `invalidateHomeHighlights()`. No es necesario para esta
  v1: de momento el ranking de `featuredBooks` es puramente orgánico, por
  `copies`.
- Si en el futuro se pasa a multi-dyno, esta caché en memoria dejaría de ser
  válida (cada dyno tendría su propia copia, recalculando de forma
  independiente al expirar su TTL) y habría que revisar la estrategia
  (Mongo o Redis compartido). No aplica mientras el plan sea Basic.

---

## Integración en frontend

En `getServerSideProps` de home:

- Una sola llamada a `GET /home/highlights` (ver nota sobre el prefijo `/api`
  más arriba), en paralelo con cualquier otra data que ya se esté pidiendo en
  esa misma función (`Promise.all`).
- En el peor caso (caché backend fría), el usuario que dispara el
  recálculo paga el coste del aggregate — con un TTL de 24h esto es un
  evento rarísimo y no justifica loading states especiales.
- Los bloques de UI (`FeaturedBooks`, `TopGenres`) reciben los datos ya
  resueltos vía props, sin fetch adicional en cliente.

---

## Queries (MongoDB)

Los nombres de campo de este documento eran provisionales; el modelo real
(`models/book.js`) usa `title`, `author`, `genre` y `copies`. `copies` **es**
el número de ejemplares disponibles: `routes/orderBook.js` lo decrementa con
`$inc` en cada solicitud.

### `getFeaturedBooks()`

```js
Book.find({ copies: { $gt: 0 } })
  .sort({ copies: -1, create_at: -1 })
  .limit(4)
  .select('title genre copies')
  .populate('author', 'name lastName')
  .lean();
```

### `getTopGenres()`

```js
Book.aggregate([
  { $match: { copies: { $gt: 0 } } },
  { $group: { _id: '$genre', totalBooks: { $sum: 1 } } },
  { $sort: { totalBooks: -1, _id: 1 } },
  { $limit: 3 },
]);
```

### Índices

No existía índice ni sobre `copies` ni sobre `genre`. Se añaden dos en
`models/book.js`:

- `{ copies: -1, create_at: -1 }` — cubre el match por rango y el sort de
  `getFeaturedBooks()`.
- `{ copies: 1, genre: 1 }` — permite que el aggregate agrupe desde el índice
  sin traer los documentos.

---

## Checklist de implementación

Backend (hecho, v3.4.0):

- [x] Definir si el mapping género→slug vive en backend o se traduce en
      frontend antes del render → **frontend**, ver arriba.
- [x] Implementar `getFeaturedBooks()` y `getTopGenres()`
      (`lib/homeHighlights.js`).
- [x] Implementar caché en memoria con TTL de 24h, entrada única.
- [x] Exponer `GET /home/highlights` (`routes/homeHighlights.js`, ruta
      registrada en `lib/namedRoutes.js` + `routes/router.js`).
- [x] Verificar índices de Mongo necesarios para ambas queries.
- [x] Tests (`tests/homeHighlights.test.js`): forma de la respuesta,
      argumentos de query y aggregate, proyección, autor borrado, hit de
      caché, invalidación y error sin envenenar la caché.

Frontend (pendiente):

- [ ] Integrar en `getServerSideProps` de home con `Promise.all`.
- [ ] Traducir `code` → slug + nombre en español con `src/data/genres.ts`, y
      comprobar que cubre los 17 códigos de `utils/constants/genres.js`.
- [ ] Confirmar con `frontend-reviewer` que los componentes de UI
      (`FeaturedBooks`, `TopGenres`) siguen el sistema de diseño ya
      establecido (`sistema-diseno-resenan-sancho.md`).
