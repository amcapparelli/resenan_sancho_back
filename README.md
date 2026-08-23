# Reseñan Sancho — Backend

## Requirements

- **Node.js 22 LTS** (see `.nvmrc`). With [nvm](https://github.com/nvm-sh/nvm):

  ```bash
  nvm install   # installs the version in .nvmrc on first run
  nvm use       # switches to Node 22 for this project
  ```

- A MongoDB instance, with `MONGOOSE_CONNECTION_STRING` (and the other variables
  listed in `CLAUDE.md`) set in a `.env` file.

## Install & run

```bash
npm install   # install dependencies
npm start     # start the server (defaults to port 9000)
npm test      # run the test suite
```

## Instagram autopost

When a book gets its first copies — and therefore becomes orderable — the
backend publishes a branded 1080x1350 image plus a Spanish caption on the
official Instagram account. Every flow that adds copies calls
`triggerInstagramPostIfEligible(book)` (`lib/instagram/trigger.js`) right after
the update is persisted: the free promo (`routes/promotions.js`) and the paid
one (`routes/paymentCheckout.js`). Only the first one publishes; the rest stop
at the `instagramPostedAt` guard inside `publishToInstagram`.

It runs after the response is sent, so it never delays nor breaks the request,
and any failure is only logged (prefix `[instagram-autopost]`). Full spec:
`docs/instagram-autopost-spec.md` plus
`docs/instagram-autopost-trigger-update-spec.md` for the trigger change.

### Environment variables

| Variable | Default | What it does |
|---|---|---|
| `SOCIAL_AUTOPOST_ENABLED` | `false` | Master switch. With `false` the feature does nothing. |
| `IG_DRY_RUN` | `true` | See below. `false` = really publish. |
| `IG_PAGE_ACCESS_TOKEN` | — | Long-lived page access token (secret). |
| `IG_BUSINESS_ACCOUNT_ID` | — | Instagram business account id (`ig-user-id`), not the `@handle`. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | — | Used to upload the generated image to the `instagram-posts/` folder; the Graph API needs a public URL. |

All of them are read at publish time, not at boot, so the feature can be turned
off or moved out of dry-run by changing a config var — no redeploy needed.

### Dry run

`IG_DRY_RUN=true` (the default, and what you want locally) exercises the whole
pipeline except the external calls: the image is generated and the caption is
built, but **nothing** is uploaded to Cloudinary and **no** Graph API call is
made. The image is written to:

```
tmp/ig-preview-<bookId>-<timestamp>.jpg
```

and the caption, that path and the `ig-user-id` that would have been used are
printed to the console. `instagramPostedAt` is **not** set, because nothing was
really published. In production (Heroku) the variable is `false`.

To review the layout without creating a book, render a sample straight into
`tmp/`:

```bash
node scripts/instagramPreview.js                 # sample book
node scripts/instagramPreview.js "Otro título" https://url/de/portada.jpg
```

### Fonts

The image is composited with `@napi-rs/canvas`, which ships no fonts: it falls
back to generic system faces (serif for the title, sans for the rest). Dropping
the brand `.ttf`/`.otf` files (Fraunces, Source Sans 3) into `assets/fonts/`
registers them automatically — no code change needed.

# Scripts

## Seed

Populates the database with mock data for local development and testing.

**Run it:**

```bash
npm run seed
```

Requires `MONGOOSE_CONNECTION_STRING` to be set in your `.env` file.

### What it creates

| Collection  | Count | Details                                                                 |
|-------------|-------|-------------------------------------------------------------------------|
| `users`     | 10    | Random names, unique emails, hashed password `Password123!`             |
| `books`     | 15    | Random titles, genres (codes), formats, page counts, and cover images   |
| `reviewers` | 6     | Subset of users with random genres, formats, and social platform links  |

**Warning:** the script **deletes all existing documents** in the three collections before inserting new data. Do not run it against a production database.

### Sample credentials

After seeding, three sample email/password pairs are printed to the console. All users share the same password:

```
Password123!
```
