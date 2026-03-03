# Design.md - Technical Architecture & Design

**Last Updated**: 2026-03-01
**Current Version**: 2.1.0

---

## 1. Architecture Overview

### Pattern
Static Progressive Web App (PWA) with offline-first data persistence.

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │index.html│  │tracker   │  │analyze   │      │
│  │          │  │.html     │  │-stats    │      │
│  │          │  │          │  │.html     │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │            │
│  ┌────┴──────────────┴──────────────┴──────┐    │
│  │           config.js (shared)             │    │
│  │        offline-storage.js (data)         │    │
│  └────────────┬──────────────┬─────────────┘    │
│               │              │                   │
│  ┌────────────▼──┐  ┌───────▼────────────┐     │
│  │  localStorage  │  │  Service Worker    │     │
│  │  (primary)     │  │  (sw.js cache)     │     │
│  └────────────┬──┘  └───────────────────┘     │
│               │                                  │
└───────────────┼──────────────────────────────────┘
                │ (when online)
    ┌───────────▼───────────────┐
    │  Supabase (PostgreSQL)    │
    │  via PostgREST API        │
    └───────────────────────────┘
```

### Key Principles
- **No build system** — files are served directly as static assets
- **Offline-first** — localStorage is the primary data store; Supabase is the sync target
- **Cache-first PWA** — service worker caches app shell for instant loading
- **Vanilla JS (ES5)** — no frameworks, no transpilation

---

## 2. File Structure

```
volleyball-stats/
├── index.html                 # Home page (start/resume/analyze)
├── match-setup.html           # Match creation form
├── volleyball-tracker.html    # Live stat tracking (85 KB, 2266 lines)
├── analyze-stats.html         # Analytics dashboard (89 KB, 2370 lines)
├── config.js                  # Shared config: version, Supabase, Google, SW registration
├── offline-storage.js         # Data persistence: localStorage + Supabase sync
├── app-mode.js                # Build-time mode: 'production' or 'demo'
├── sw.js                      # Service worker: caching strategies
├── manifest.json              # PWA manifest
├── netlify.toml               # Netlify build + security headers
├── eclipse-logo.png           # Team logo
├── package.json               # Dev dependencies only (Jest)
│
├── tests/                     # Unit tests (Jest + jsdom)
│   └── ...
│
├── archive/                   # Superseded documentation
│   ├── SETUP-GUIDE.md
│   ├── FEATURE-VIEW-MATCH-HISTORY.md
│   └── database-schema-final.json
│
├── supabase-setup-v2.sql      # Current DB schema (canonical)
├── supabase-setup.sql         # Original v1 schema
├── supabase-update-set-status.sql
├── supabase-migration-add-error-columns.sql
├── supabase-migration-add-match-format.sql
├── supabase-migration-check-constraints.sql
├── supabase-migration-error-tracking.sql
│
├── README.md
├── CLAUDE.md
├── Product.md
├── Roadmap.md
├── CHANGELOG.md
├── Requirements.md
├── Design.md                  # This file
├── Test.md
├── Plan.md
├── .cursorrules
└── .github/
    └── copilot-instructions.md
```

---

## 3. Data Model

### 3.1 Supabase Schema (PostgreSQL)

#### Table: `matches`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| match_id | UUID | PRIMARY KEY | (client-generated) |
| tournament | TEXT | CHECK len ≤ 100 | NULL |
| team1_name | TEXT | NOT NULL, CHECK len ≤ 100 | 'Des Moines Eclipse' |
| opponent_name | TEXT | NOT NULL, CHECK len ≤ 100 | |
| match_format | TEXT | NOT NULL, CHECK ('bracket_play' \| 'pool_play') | 'bracket_play' |
| scoring_format | TEXT | CHECK ('0_to_21' \| '4_to_25') | NULL |
| match_status | TEXT | NOT NULL, CHECK ('in_progress' \| 'completed') | 'in_progress' |
| created_at | TIMESTAMPTZ | | NOW() |
| updated_at | TIMESTAMPTZ | | NOW() (trigger) |

Indexes: `idx_matches_status`, `idx_matches_opponent`, `idx_matches_created`

#### Table: `set_scores`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| set_id | UUID | PRIMARY KEY | gen_random_uuid() |
| match_id | UUID | NOT NULL, FK → matches (CASCADE) | |
| set_number | INTEGER | NOT NULL, CHECK (1-3) | |
| set_status | TEXT | NOT NULL, CHECK ('in_progress' \| 'completed') | 'in_progress' |
| team1_score | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| team1_kills | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| team1_blocks | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| team1_serves | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| team1_errors | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| team2_score | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| team2_kills | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| team2_blocks | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| team2_serves | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| team2_errors | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| attack_errors | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| block_errors | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| serve_errors | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| pass_errors | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| penalty_errors | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| created_at | TIMESTAMPTZ | | NOW() |
| updated_at | TIMESTAMPTZ | | NOW() (trigger) |

Constraints: UNIQUE(match_id, set_number)
Indexes: `idx_set_scores_match`

#### Table: `player_stats`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| stat_id | UUID | PRIMARY KEY | gen_random_uuid() |
| match_id | UUID | NOT NULL, FK → matches (CASCADE) | |
| player_name | TEXT | NOT NULL, CHECK len ≤ 100 | |
| team_name | TEXT | NOT NULL, CHECK len ≤ 100 | 'Des Moines Eclipse' |
| attempts | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| kills | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| errors | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| serves | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| aces | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| serve_errors | INTEGER | NOT NULL, CHECK ≥ 0 | 0 |
| created_at | TIMESTAMPTZ | | NOW() |
| updated_at | TIMESTAMPTZ | | NOW() (trigger) |

Constraints: UNIQUE(match_id, player_name)
Indexes: `idx_player_stats_match`, `idx_player_stats_name`, `idx_player_stats_team`

#### Relationships
```
matches (1) ──── (N) set_scores     [ON DELETE CASCADE]
matches (1) ──── (N) player_stats   [ON DELETE CASCADE]
```

#### Shared Trigger
All tables use `update_updated_at_column()` — BEFORE UPDATE trigger that sets `updated_at = NOW()`.

#### RLS Policies
All tables: RLS enabled with permissive public access (FOR ALL, using (true), with check (true)).

### 3.2 localStorage Key Patterns

| Key | Structure | Purpose |
|-----|-----------|---------|
| `vb_matches` | `{ matchId: { match data + sync_status } }` | All match metadata |
| `vb_sets_{matchId}` | `{ setNumber: { set data } }` | Set scores per match |
| `vb_players_{matchId}` | `{ playerName: { stats } }` | Player stats per match |
| `vb_last_sync` | ISO timestamp string | Last successful sync time |
| `vb_cached_opponents` | JSON array of strings | Opponent name cache |
| `vb_cached_tournaments` | JSON array of strings | Tournament name cache |

### 3.3 Data Flow

```
User Action (tap button)
    │
    ▼
Update In-Memory State
    │
    ▼
Save to localStorage (instant)
    │
    ├── sync_status = 'pending'
    │
    ▼
Attempt Supabase Sync (if online)
    │
    ├── Success → sync_status = 'synced'
    │              (if completed, purge local copy)
    │
    └── Failure → remains 'pending'
                   (retry on next sync cycle or reconnect)
```

---

## 4. Page Architecture

### 4.1 index.html — Home Page (14 functions)

**Purpose:** Central hub — start match, resume match, navigate to analytics.

**Key Functions:**
- `updateSyncStatus()` — Updates sync bar based on online state and pending matches
- `attemptSync()` / `attemptPurge()` — Triggers sync and cleanup of verified matches
- `loadLocalInProgressMatches()` — Loads today's in-progress matches from localStorage
- `displayInProgressMatches(matches)` — Renders resume match cards
- `updateAnalyzeStatsButton()` — Enables/disables analytics link based on connectivity

**Navigation:** → match-setup.html, → volleyball-tracker.html?matchId={id}, → analyze-stats.html

**Sync Behavior:** 5-second delayed initial sync, then 30-second periodic sync check.

### 4.2 match-setup.html — Match Creation (19 functions)

**Purpose:** Form to configure a new match (team, opponent, tournament, format).

**Key Functions:**
- `loadOpponents()` — Fetches from Supabase, falls back to cache, merges local matches
- `loadTournaments()` — Fetches tournaments from past 3 days
- `selectFormat(card)` — Selects bracket/pool play; reveals scoring options for pool play
- `startMatch()` — Generates UUID, saves match to localStorage, syncs to Supabase, navigates

**Navigation:** ← index.html, → volleyball-tracker.html?matchId={id}

### 4.3 volleyball-tracker.html — Live Tracking (38 functions)

**Purpose:** Real-time point and player stat recording during a match.

**Key Functions:**
- `loadMatchData()` — Loads match/sets/players from Supabase (if online) then localStorage
- `scorePoint(team, method, errorType, skipUndo)` — Records a point with method and optional error type
- `showPlayerModal(player)` — Opens serve/attack outcome modal for a player
- `recordServe(player, outcome)` / `recordAttack(player, outcome)` — Records player actions
- `saveSet()` — Upserts set to Supabase, saves to localStorage
- `finishMatch()` — Marks match completed, syncs, navigates to analytics
- `undoLastAction()` — Reverts last score action from undo stack (max 5)
- `checkSetComplete()` — Auto-prompts save when winning score reached
- `renderStatsTable()` / `renderServeStatsTable()` — Renders sortable stat tables
- `showCompletedMatchBanner()` — Shows banner for completed match viewing

**Navigation:** ← index.html (finish/reset), ← analyze-stats.html (back button)
**URL Params Read:** `?matchId={id}` (required)

### 4.4 analyze-stats.html — Analytics Dashboard (43 functions)

**Purpose:** Post-match analytics with filtering, sorting, and export.

**Key Functions:**
- `loadAllData()` — Fetches all matches, sets, and player stats from Supabase
- `initFilters()` / `applyFilters()` — Initialize and apply team/tournament/opponent filters
- `readFiltersFromURL()` / `writeFiltersToURL()` — Persist filters in URL query params
- `renderTeamRecord(matches)` — Calculates and displays W-L record
- `renderGrandTotal(matches)` — Displays aggregate stats
- `displayMatchHistory(matches)` — Renders match list with expandable set details
- `renderPlayerStatsFromMatches(matches)` / `renderServeStatsFromMatches(matches)` — Aggregate stats
- `renderErrorTracking(matches)` — Error frequency analysis table
- `exportXLSX()` — Excel export using ExcelJS
- `deleteMatch(matchId)` / `viewMatch(matchId)` — Match management from analytics

**Navigation:** → volleyball-tracker.html?matchId={id} (view match), ← index.html
**URL Params:** Reads/writes `team`, `tournament`, `opponent` filter params

---

## 5. JavaScript Modules

### 5.1 config.js — Shared Configuration

**Global Variables:**
- `APP_VERSION` — Semantic version string (source of truth)
- `SUPABASE_CONFIG` — `{ url, anonKey }` for Supabase connection
- `supabaseClient` — Singleton Supabase client instance (null until initialized)
- `GOOGLE_CONFIG` — `{ clientId }` for Google Sheets OAuth

**Functions:**
- `initSupabase()` — Creates Supabase client from CDN library + config
- `tryInitSupabase()` — Safe wrapper that never throws
- `isDemoMode()` — Returns true if `APP_MODE === 'demo'`
- `registerServiceWorker()` — Registers sw.js on page load

### 5.2 offline-storage.js — Data Persistence Layer

Exposes a global `OfflineStorage` object. All localStorage and Supabase sync operations go through this module.

**Public API:**

| Category | Functions |
|----------|-----------|
| UUID | `generateUUID()` |
| Match CRUD | `saveMatch(match)`, `getMatch(matchId)`, `getAllMatches()`, `removeMatch(matchId)` |
| Match Queries | `getInProgressMatches()`, `getPendingMatches()` |
| Set CRUD | `saveSets(matchId, sets)`, `getSets(matchId)`, `saveSet(matchId, setNum, data)`, `getSet(matchId, setNum)` |
| Player Stats | `saveAllPlayerStats(matchId, stats)`, `getAllPlayerStats(matchId)`, `savePlayerStat(matchId, name, stat)` |
| Sync Status | `getLastSyncTime()`, `setLastSyncTime()`, `markMatchSynced(matchId)`, `markMatchPending(matchId)` |
| Sync Operations | `syncMatchToSupabase(db, matchId)`, `syncAllPending(db)`, `purgeVerifiedLocalStorage(db)` |
| Cache | `cacheOpponents(arr)`, `getCachedOpponents()`, `cacheTournaments(arr)`, `getCachedTournaments()` |
| Connectivity | `isOnline()` |

**Sync Process (syncMatchToSupabase):**
1. Upsert match → `matches` table (on conflict: match_id)
2. Upsert each set → `set_scores` table (on conflict: match_id + set_number)
3. Upsert each player → `player_stats` table (on conflict: match_id + player_name)
   - Includes serves, aces, serve_errors (fallback: retries without serve columns if they don't exist in schema)

**Purge Process (purgeVerifiedLocalStorage):**
1. Check no pending matches exist
2. For each completed match in localStorage, verify it exists in Supabase
3. If verified, remove local copy
4. Clear opponent/tournament caches

### 5.3 app-mode.js — Build-Time Configuration

Single variable: `var APP_MODE = 'production';`

Modified at deploy time by Netlify build command. Controls whether Supabase writes are enabled.

### 5.4 sw.js — Service Worker

**Cache Name:** `vb-tracker-v{APP_VERSION}` (must stay in sync with config.js)

**Caching Strategies:**
| Resource Type | Strategy | Fallback |
|---------------|----------|----------|
| App shell (HTML, JS, manifest) | Cache-first + background network update | Network fetch if not cached |
| CDN (Supabase JS, ExcelJS) | Network-first | Cache fallback, then 503 response |
| Supabase API calls | Always network (bypassed) | N/A |
| Unknown resources | Cache → Network | Custom offline HTML page |

**Query Parameter Handling:** Uses `ignoreSearch: true` so `volleyball-tracker.html?matchId=xxx` matches cached `volleyball-tracker.html`.

**Lifecycle:**
- Install: Pre-caches app shell, calls `skipWaiting()`
- Activate: Deletes old caches by name, calls `clients.claim()`

---

## 6. CSS Architecture

### 6.1 Design System

All CSS is embedded in `<style>` tags within each HTML page (no external stylesheet).

**CSS Custom Properties (consistent across all pages):**
```css
--bg-primary: #1a1a1a      /* Page background */
--bg-secondary: #2a2a2a    /* Section/card background */
--bg-card: #3a3a3a          /* Elevated card background */
--accent-primary: #dc2626   /* Primary red */
--accent-secondary: #ef4444 /* Lighter red */
--accent-green: #10b981     /* Success/online indicator */
--text-primary: #f5f5f5     /* Main text */
--text-secondary: #9ca3af   /* Muted text */
--border: #525252           /* Border color */
```

**Typography:**
- Headings: `'Oswald', sans-serif` (weights: 400, 600, 700)
- Body: `'Barlow Condensed', sans-serif` (weights: 400, 500, 600, 700)
- Loaded via Google Fonts CDN

### 6.2 Responsive Design

**Primary breakpoint:** `768px` (mobile vs. tablet/desktop)

All pages use a mobile-first approach with adjustments at the 768px breakpoint:
- Font sizes reduced on mobile
- Flex layouts switch to column on mobile
- Button sizes adjusted for touch targets
- Grid layouts adapt column counts

**volleyball-tracker.html** also has a `1200px` breakpoint for wide desktop layouts.

### 6.3 Theme

Dark theme throughout (dark backgrounds, light text, red accent). Designed for readability in gyms and outdoor courts.

---

## 7. Deployment

### Netlify Configuration (netlify.toml)

```toml
[build]
  command = "echo 'var APP_MODE = \"production\";' > app-mode.js"
  publish = "."

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer-when-downgrade"
```

- **Build command** overwrites `app-mode.js` with production mode
- **Publish directory** is root (`.`) — entire repo is static
- **Security headers** applied to all routes

### Environment Modes

| Mode | APP_MODE Value | Supabase Writes | Use Case |
|------|----------------|-----------------|----------|
| Production | `'production'` | Enabled | Live site |
| Demo | `'demo'` | Disabled (read-only) | Preview deployments |

---

## 8. External Dependencies

| Dependency | CDN URL | Used By |
|------------|---------|---------|
| Supabase JS v2 | `cdn.jsdelivr.net/npm/@supabase/supabase-js@2` | All pages |
| ExcelJS v4.4.0 | `cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js` | analyze-stats.html |
| Google Sign-In | `accounts.google.com/gsi/client` | analyze-stats.html (optional) |
| Google Fonts | `fonts.googleapis.com` | All pages (Oswald, Barlow Condensed) |

No npm dependencies for production. `package.json` is dev-only (Jest for testing).

---

## 9. Security

### Current Posture
- **Supabase RLS**: Enabled but fully permissive (public access) — suitable for single-team use without authentication
- **Anon Key**: Exposed in config.js (by design — Supabase anon keys are safe for client-side use when RLS is properly configured)
- **Netlify Headers**: DENY framing, nosniff content types, controlled referrer

### Considerations for Future
- Add user authentication if multi-team support is implemented
- Scope RLS policies to authenticated users
- Move Google OAuth client ID to environment variables

---

## Related Documentation

- [Requirements.md](Requirements.md) — What the system must do
- [Product.md](Product.md) — Feature descriptions and user workflows
- [Test.md](Test.md) — Testing strategy for this architecture
- [Roadmap.md](Roadmap.md) — Planned improvements
