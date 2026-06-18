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
