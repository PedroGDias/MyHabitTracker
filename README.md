# MyHabitTracker

Habit logging with a year heatmap. See [ARCHITECTURE.md](./ARCHITECTURE.md) for
the design and the reasoning behind the data model.

## Running it

Postgres must be up. It is installed via Homebrew but not registered as a
service, so start it explicitly (the `LC_ALL` is required — without it Postgres
16 on macOS fails with "postmaster became multithreaded during startup"):

```bash
LC_ALL=C pg_ctl -D /opt/homebrew/var/postgresql@16 -l /tmp/pg-habittracker.log start
```

Then:

```bash
npm run dev
```

http://localhost:3000 — Today (logging), and In-Review (the year grid).

To stop Postgres later:

```bash
pg_ctl -D /opt/homebrew/var/postgresql@16 stop
```

## Scripts

| Command           | Does                                              |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Dev server on :3000                               |
| `npm test`        | Domain unit tests (calendar, completion, streaks) |
| `npm run db:push` | Apply `src/db/schema.ts` to the database          |
| `npm run db:seed` | Wipe and regenerate demo data                     |

## Switching to Supabase

Replace `DATABASE_URL` in `.env.local` with your project's URI (dashboard →
Settings → Database → URI, direct connection on port 5432), then:

```bash
npm run db:push && npm run db:seed
```

Nothing else changes — it is the same Postgres and the same schema.

## Layout

- `src/domain/` — pure functions, no I/O. Week boundaries, local dates, partial
  credit, completion denominators, streaks. All the logic that is easy to get
  wrong lives here and is unit tested directly.
- `src/server/repo.ts` — the only module that touches the database.
- `src/app/api/` — route handlers, thin wrappers over the repo.
- `src/app/` — pages. Nothing here computes a percentage.
