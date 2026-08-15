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

### `GET /api/home/highlights`

Devuelve ambos bloques en una sola respuesta, para evitar dos round-trips
desde `getServerSideProps` de home.

#### Response

```json
{
  "featuredBooks": [
    {
      "id": "...",
      "titulo": "...",
      "autor": "...",
      "genero": "novela-historica",
      "ejemplaresDisponibles": 8,
      "slug": "..."
    }
  ],
  "topGenres": [
    { "slug": "novela-historica", "nombre": "Novela histórica", "totalLibros": 142 },
    { "slug": "poesia", "nombre": "Poesía", "totalLibros": 98 },
    { "slug": "ensayo", "nombre": "Ensayo", "totalLibros": 76 }
  ],
  "cachedAt": "2026-08-15T10:00:00Z"
}
```

- `featuredBooks`: top 4 libros ordenados por `ejemplaresDisponibles desc`.
- `topGenres`: top 3 géneros ordenados por cantidad total de libros
  disponibles en ese género.
- `slug` en ambos bloques mapea directamente a rutas ya existentes en
  producción:
  - Libro → página de detalle (`/books/[id]`, SSR desde PR #64)
  - Género → `/libros/genero/<slug>`
- El mapping código interno → slug usa la tabla bidireccional ya definida en
  `src/data/genres.ts`. A decidir con `senior-backend`: si el backend
  mantiene su propia copia del mapping o si el frontend traduce el código
  interno (`genero`) al slug antes de construir el link — según dónde viva
  ya esa lógica en el código actual.

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

### Implementación de referencia

```js
let cache = { data: null, expiresAt: 0 };

async function getHomeHighlights() {
  const now = Date.now();
  if (cache.data && now < cache.expiresAt) {
    return cache.data;
  }

  const [featuredBooks, topGenres] = await Promise.all([
    getFeaturedBooks(),
    getTopGenres(),
  ]);

  cache.data = {
    featuredBooks,
    topGenres,
    cachedAt: new Date().toISOString(),
  };
  cache.expiresAt = now + 24 * 60 * 60 * 1000;

  return cache.data;
}
```

### Notas

- **Reinicio del dyno**: en Heroku Basic el dyno se recicla al menos una vez
  al día (cycling) y en cada deploy, así que la caché en memoria se refresca
  con esa cadencia natural. No hay riesgo real de quedarse con datos muy
  desactualizados.
- **Evolución futura**: si en algún momento las compras de servicios de
  promoción (`boost25`, `featuredWeek`) deben afectar a `featuredBooks` en
  tiempo real, se puede invalidar la caché puntualmente al confirmarse un
  pago (`cache.expiresAt = 0`). No es necesario para esta v1 — de momento el
  ranking de `featuredBooks` es puramente orgánico, por
  `ejemplaresDisponibles`.
- Si en el futuro se pasa a multi-dyno, esta caché en memoria dejaría de ser
  válida (cada dyno tendría su propia copia, recalculando de forma
  independiente al expirar su TTL) y habría que revisar la estrategia
  (Mongo o Redis compartido). No aplica mientras el plan sea Basic.

---

## Integración en frontend

En `getServerSideProps` de home:

- Una sola llamada a `GET /api/home/highlights`, en paralelo con cualquier
  otra data que ya se esté pidiendo en esa misma función (`Promise.all`).
- En el peor caso (caché backend fría), el usuario que dispara el
  recálculo paga el coste del aggregate — con un TTL de 24h esto es un
  evento rarísimo y no justifica loading states especiales.
- Los bloques de UI (`FeaturedBooks`, `TopGenres`) reciben los datos ya
  resueltos vía props, sin fetch adicional en cliente.

---

## Queries de referencia (MongoDB)

### `getFeaturedBooks()`

Ordenar por `ejemplaresDisponibles` descendente, limitar a 4, proyectar solo
los campos necesarios para la card (`titulo`, `autor`, `genero`,
`ejemplaresDisponibles`, `slug`/`id`).

### `getTopGenres()`

Aggregate agrupando por `genero`, contando documentos, ordenando por conteo
descendente, limitando a 3. Traducir el código interno de género a nombre
en español (ya existente en `src/data/genres.ts`) y a slug para el link.

Ambas queries son responsabilidad de `senior-backend` para definir los
índices necesarios (por ejemplo, índice sobre `ejemplaresDisponibles` si no
existe ya) antes de implementar.

---

## Checklist de implementación

- [ ] Definir si el mapping género→slug vive en backend o se traduce en
      frontend antes del render.
- [ ] Implementar `getFeaturedBooks()` y `getTopGenres()`.
- [ ] Implementar caché en memoria con TTL de 24h, entrada única.
- [ ] Exponer `GET /api/home/highlights`.
- [ ] Integrar en `getServerSideProps` de home con `Promise.all`.
- [ ] Verificar índices de Mongo necesarios para ambas queries.
- [ ] Confirmar con `frontend-reviewer` que los componentes de UI
      (`FeaturedBooks`, `TopGenres`) siguen el sistema de diseño ya
      establecido (`sistema-diseno-resenan-sancho.md`).
