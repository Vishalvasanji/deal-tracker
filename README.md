# Deal Tracker

Self-hosted real estate development deal tracker. Kanban pipeline board, deal detail pages with markdown notes, cross-deal task views. Single-user, runs free on Vercel + Turso.

---

## Local dev

```bash
# 1. Install dependencies
npm install

# 2. Copy env and fill in values (defaults work for local dev)
cp .env.example .env.local
# Edit .env.local — defaults work out of the box for local SQLite

# 3. Push schema to local SQLite
npm run db:push

# 4. Seed demo deal + tasks
npm run seed

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000. Log in with the password set in `APP_PASSWORD` (default: `admin`).

**Default local credentials (`.env.local`):**
- Web password: `admin`
- API key: `dev-api-key`

---

## Deploy (Vercel + Turso free tier)

### 1. Create a Turso database (free, no card required)

```bash
# Install the Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Log in / sign up
turso auth login

# Create a database
turso db create deal-tracker

# Get the URL and token
turso db show deal-tracker --url   # → libsql://deal-tracker-<you>.turso.io
turso db tokens create deal-tracker  # → your auth token
```

### 2. Push schema to Turso

```bash
DATABASE_URL=libsql://deal-tracker-<you>.turso.io \
DATABASE_AUTH_TOKEN=<your-token> \
npm run db:push
```

### 3. Set env vars in Vercel

In your Vercel project → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `libsql://deal-tracker-<you>.turso.io` |
| `DATABASE_AUTH_TOKEN` | your Turso auth token |
| `API_KEY` | a long random string |
| `APP_PASSWORD` | your chosen password |
| `SESSION_SECRET` | a long random string (64+ chars) |

### 4. Deploy

```bash
# Push to GitHub, then connect the repo in Vercel UI
# Or deploy directly:
npx vercel --prod
```

### 5. Seed production data (optional)

```bash
DATABASE_URL=libsql://deal-tracker-<you>.turso.io \
DATABASE_AUTH_TOKEN=<your-token> \
npm run seed
```

---

## Using the notes API from Claude

The notes API lets Claude push deal updates from chat, voice memos, or automation.

### Find a deal

```bash
curl https://your-app.vercel.app/api/deals?name=riverside \
  -H "X-API-Key: YOUR_API_KEY"
# Returns: [{ id, deal_id, name, stage, ... }]
```

### Append a note

```bash
curl -X POST https://your-app.vercel.app/api/deals/DEAL-1/notes \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lender call recap",
    "body": "First Citizens confirmed 70% LTV on construction loan. Rate TBD at close.",
    "date": "2026-05-13"
  }'
```

`:id` accepts either the UUID or the human-readable ID like `DEAL-1`.

`date` is optional — defaults to today.

### One-liner prompt for Claude

> To push a note to a deal: first GET `https://your-app.vercel.app/api/deals?name=<name>` with header `X-API-Key: YOUR_API_KEY` to find the deal ID, then POST to `https://your-app.vercel.app/api/deals/<id>/notes` with the same API key header and a JSON body `{ "title": "optional title", "body": "your markdown note", "date": "YYYY-MM-DD" }`.

### Other API endpoints

```bash
# List all deals
GET /api/deals

# Get full deal (includes notes + overview)
GET /api/deals/DEAL-1

# Create a deal
POST /api/deals
  body: { name, stage, location, deal_type, size, budget, ... }

# Update a deal
PATCH /api/deals/DEAL-1
  body: { stage: "Construction", budget: 33000000 }

# List tasks
GET /api/tasks?deal_id=<uuid>&status=To+Do

# Create a task
POST /api/tasks
  body: { deal_id, title, priority, due_date }

# Update a task
PATCH /api/tasks/<uuid>
  body: { status: "Done" }
```

All API routes require `X-API-Key: YOUR_API_KEY` header.

---

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **DB:** SQLite via `@libsql/client` — local file in dev, Turso free tier in prod
- **ORM:** Drizzle ORM + drizzle-kit
- **UI:** Tailwind CSS v4 + shadcn/ui (base-ui components)
- **Auth:** Single password → HMAC-signed session cookie
- **Drag-and-drop:** @dnd-kit (kanban board)
