# MyHabitTracker — Architecture

## Scope (v1)

Create habits, log values against them, view a year heatmap with completion
percentages. Single local user, no auth. The shareable "In-Review" card is v2.

## Stack

| Layer    | Choice                                    |
| -------- | ----------------------------------------- |
| App      | Next.js 15 (App Router) + TypeScript      |
| Styling  | Tailwind v4                               |
| Server   | Route handlers in `app/api/*`             |
| DB       | Postgres (local now, Supabase later)      |
| Access   | Drizzle ORM, server-side only             |
| Client   | TanStack Query, optimistic mutations      |

Everything runs from one `npm run dev`. Data access is server-side only — the
browser never holds a database credential and never talks to Postgres directly.

**Currently pointed at local Postgres 16**, not Supabase, because that was
available without credentials. It is the same Postgres and the same Drizzle
schema, so switching is a one-line change to `DATABASE_URL` in `.env.local`
followed by `npm run db:push && npm run db:seed`.

## Data model

Two tables. A `users` row exists from day one, seeded with a single dev user, so
that adding auth later is a login screen rather than a migration.

```sql
create table users (
  id         uuid primary key,
  email      text unique,
  timezone   text not null default 'Europe/Lisbon',
  week_start smallint not null default 1   -- 1 = Monday, ISO-8601
);

-- Binary and quantitative habits are the same thing.
-- A binary habit is simply target_value = 1, unit = 'times'.
create table habits (
  id            uuid primary key,
  user_id       uuid not null references users(id),
  name          text not null,          -- "Drink Water"
  unit          text not null,          -- 'cups' | 'steps' | 'pages' | 'minutes' | 'times'
  target_value  numeric not null,       -- 8, 10000, 200, 1
  target_period text not null,          -- 'day' | 'week'
  active_days   smallint not null default 127,  -- Mon..Sun bitmask; drives the denominator
  color         text not null,          -- hex, the habit's base hue
  started_on    date not null,
  archived_on   date,
  sort_order    int not null
);

create table entries (
  habit_id   uuid not null references habits(id) on delete cascade,
  on_date    date not null,             -- the user's LOCAL date
  value      numeric not null,
  updated_at timestamptz not null default now(),
  primary key (habit_id, on_date)       -- natural upsert key, no surrogate id
);
```

### Why these shapes

**Unified habit type.** Collapsing binary into quantitative removes a second
completion formula, a second render path, and a second set of edge cases. The UI
still shows a checkbox when `target_value === 1`; that is a presentation
decision, not a data one.

**`on_date` is a `date`, not a timestamp.** This is the classic habit-tracker
bug. Bucketing a UTC timestamp by day puts a 00:30 Lisbon entry on the previous
square, and travelling shifts the entire grid. The client computes the local date
from `users.timezone` and sends it explicitly.

**Composite primary key on `entries`.** `(habit_id, on_date)` is the real
identity of a log entry, which makes every write a plain upsert and makes
duplicate entries structurally impossible.

**`active_days` bitmask.** Determines which days count toward the completion
denominator. A weekday-only habit shouldn't be punished for Saturdays.

**`double precision`, not `numeric`.** Drizzle returns `numeric` columns as
strings, which would push string-to-number coercion into every call site.
Habit values are counts and durations, not money, so float precision is fine.

## Derived values

Computed on read. A year of one habit is 371 rows; streaks and percentages are a
single pass. Denormalize into a rollup table only if the review page measurably
slows, which it will not at this scale.

**Daily ratio** — `min(value / target, 1)`, clamped. Capping at 1 matters: a
30,000-step day must not paper over three missed ones.

**Completion %** — `sum(daily ratio) / count(elapsed days matching active_days
since started_on)`. The denominator is *elapsed* scheduled days, not 365, so a
percentage shown in March reflects the year so far.

**Weekly targets** — entries remain daily; the ratio is computed per ISO week
against `users.week_start`, and all seven cells in a week render at the week's
ratio. Reading 200 pages on Sunday therefore shows a solid band rather than one
dark cell and six empty ones, which is what a weekly goal actually means.

**Heatmap intensity** — the ratio bucketed into 5 steps against the habit's base
colour. Partial credit is visible, which is the point of the design.

## Layout

```
src/
├── app/
│   ├── page.tsx                  # today — logging view
│   ├── review/[year]/page.tsx    # the year grid
│   └── api/
│       ├── habits/route.ts       # GET list, POST create
│       ├── habits/[id]/route.ts  # PATCH, DELETE (archive)
│       └── entries/route.ts      # GET range, PUT upsert
├── components/
│   ├── YearGrid.tsx              # the SVG heatmap
│   ├── HabitRow.tsx
│   └── LogControl.tsx            # checkbox or stepper, per target_value
├── domain/                       # pure functions, zero I/O
│   ├── calendar.ts               # local dates, week bounds, active_days
│   ├── completion.ts             # ratios, percentages, denominators
│   ├── streaks.ts
│   └── types.ts
├── db/
│   ├── schema.ts                 # drizzle
│   ├── client.ts
│   └── seed.ts
└── lib/queries.ts                # TanStack Query hooks
```

`domain/` is the structural commitment worth holding to: every rule that is
easy to get wrong — week boundaries, timezone-local dates, partial credit,
denominators — lives in pure functions with no database access, and is unit
tested directly. The route handlers fetch rows and call into it. Nothing in
`app/` should compute a percentage.

## Rendering

One `<svg>` per habit, 371 `<rect>` elements, opacity stepped off the habit's
base colour. SVG rather than DOM nodes because the v2 In-Review card needs a
PNG export, and SVG → canvas → PNG is trivial where screenshotting DOM is not.

## Deferred, with the seam already in place

- **Auth.** `users` and `habits.user_id` already exist. Adding Supabase Auth
  means a login screen and reading the user id from the session instead of a
  constant.
- **Row Level Security.** Not enabled in v1 because access is server-side only
  and single-user. Must be enabled in the same change that adds auth.
- **Connection pooling.** Local dev is a long-lived Node process, so a direct
  connection (port 5432) is correct. Deploying to serverless means switching
  `DATABASE_URL` to the Supabase pooler (port 6543) and keeping the direct URL
  for migrations.
- **Offline logging.** Entries are last-write-wins on `(habit_id, on_date)` and
  effectively never conflict, so a PWA with an IndexedDB write queue can be
  retrofitted without a sync engine.
- **Auto-tracked habits** (steps from HealthKit/Google Fit) fit the existing
  `entries` shape; they need only a provenance column.
```
