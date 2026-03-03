# Requirements.md - Functional & Non-Functional Requirements

**Last Updated**: 2026-03-01
**Current Version**: 2.1.0

These requirements are reverse-engineered from the current codebase and represent the implemented behavior.

---

## 1. Functional Requirements

### 1.1 Match Management

| ID | Requirement | Status |
|----|-------------|--------|
| FR-M1 | User can create a new match by selecting team, opponent, and match format | Implemented |
| FR-M2 | User can optionally specify a tournament name for a match | Implemented |
| FR-M3 | Match formats supported: Bracket Play (race to 25) and Pool Play | Implemented |
| FR-M4 | Pool Play scoring formats: 0-to-21 or 4-to-25 | Implemented |
| FR-M5 | Each match receives a client-generated UUID as its identifier | Implemented |
| FR-M6 | Match status transitions: in_progress → completed | Implemented |
| FR-M7 | User can resume in-progress matches from earlier today | Implemented |
| FR-M8 | User can finish a match, which auto-saves any unsaved sets | Implemented |
| FR-M9 | User can delete a match and all associated data (cascading) | Implemented |
| FR-M10 | Opponent names are auto-suggested from previous matches (cached) | Implemented |
| FR-M11 | Tournament names are auto-suggested from matches in the last 3 days | Implemented |

### 1.2 Set Scoring

| ID | Requirement | Status |
|----|-------------|--------|
| FR-S1 | Each match supports up to 3 sets | Implemented |
| FR-S2 | Each set tracks scores for both teams (Eclipse and opponent) | Implemented |
| FR-S3 | Points are scored by method: Kill, Block, Serve (Ace), Error | Implemented |
| FR-S4 | Kills, blocks, serves, and errors are tracked per team per set | Implemented |
| FR-S5 | Set status: in_progress → completed (saved when user clicks Save Set) | Implemented |
| FR-S6 | Auto-prompt to save set when either team reaches the winning score | Implemented |
| FR-S7 | User can switch between sets using set badges | Implemented |
| FR-S8 | Set history displays completed sets with scores | Implemented |
| FR-S9 | User can undo the last 5 team score actions | Implemented |
| FR-S10 | Error types tracked: pass errors and penalty errors | Implemented |
| FR-S11 | Error tracking table displayed per set | Implemented |

### 1.3 Player Statistics

| ID | Requirement | Status |
|----|-------------|--------|
| FR-P1 | 12 players are tracked: Lexi, Anne, Cora, Amelie, Norah, Grace, Laura, Lila, Kjersten, Adelaide, Greta, Hannah | Implemented |
| FR-P2 | Tapping a player name opens an action modal | Implemented |
| FR-P3 | Serve outcomes: Ace, In Play, Error | Implemented |
| FR-P4 | Attack outcomes: Kill, In Play, Block, Error | Implemented |
| FR-P5 | Kill % calculated as (kills / attempts) x 100 | Implemented |
| FR-P6 | Hit % calculated as ((kills - errors) / attempts) x 100 | Implemented |
| FR-P7 | Player stats accumulate across all sets in a match (match-level totals) | Implemented |
| FR-P8 | Player stats tables are sortable by column | Implemented |
| FR-P9 | Players with zero stats are skipped during sync | Implemented |

### 1.4 Analytics & Reporting

| ID | Requirement | Status |
|----|-------------|--------|
| FR-A1 | Display team record as win-loss (counted by sets won/lost) | Implemented |
| FR-A2 | Display Grand Total stats (aggregate kills, blocks, serves, errors) | Implemented |
| FR-A3 | Match history table shows all matches with tournament, date, stats | Implemented |
| FR-A4 | Set-by-set breakdown within each match | Implemented |
| FR-A5 | Team selector: view Eclipse stats or opponent stats | Implemented |
| FR-A6 | Filter by team, tournament, opponent (cascading dropdowns) | Implemented |
| FR-A7 | Active filters persist in URL query parameters | Implemented |
| FR-A8 | Click match date to navigate to match viewer/editor | Implemented |
| FR-A9 | Delete matches directly from analytics page (with confirmation) | Implemented |
| FR-A10 | Export filtered data to Excel (.xlsx) | Implemented |
| FR-A11 | Export to Google Sheets via OAuth (optional) | Implemented (stub) |
| FR-A12 | Error tracking table: pass vs penalty error frequency | Implemented |
| FR-A13 | Sortable player stats and serve stats tables | Implemented |

### 1.5 Data Persistence & Sync

| ID | Requirement | Status |
|----|-------------|--------|
| FR-D1 | All data saved to localStorage immediately on every action | Implemented |
| FR-D2 | Data synced to Supabase when online (3-step: match → sets → players) | Implemented |
| FR-D3 | Sync uses upsert (insert or update on conflict) for idempotency | Implemented |
| FR-D4 | Pending matches tracked with sync_status = 'pending' | Implemented |
| FR-D5 | Batch sync of all pending matches when connectivity returns | Implemented |
| FR-D6 | Completed + synced matches purged from localStorage after verification | Implemented |
| FR-D7 | Sync status indicator visible on home page | Implemented |
| FR-D8 | Periodic sync check every 30 seconds when online | Implemented |
| FR-D9 | Demo mode skips all Supabase writes | Implemented |
| FR-D10 | Graceful fallback when Supabase columns are missing (e.g., serve stats) | Implemented |

---

## 2. Non-Functional Requirements

### 2.1 Performance
| ID | Requirement |
|----|-------------|
| NFR-P1 | App loads instantly from service worker cache (cache-first strategy) |
| NFR-P2 | Every user action (score, attack) saves in < 100ms to localStorage |
| NFR-P3 | Background cache updates don't block user interaction |

### 2.2 Availability
| ID | Requirement |
|----|-------------|
| NFR-A1 | App works fully offline — no internet required for core tracking |
| NFR-A2 | Data is never lost on page refresh, browser close, or network failure |
| NFR-A3 | Auto-sync when connectivity returns — no manual intervention needed |

### 2.3 Usability
| ID | Requirement |
|----|-------------|
| NFR-U1 | Mobile-first responsive design (primary use case: courtside phone) |
| NFR-U2 | Tablet and desktop layouts for analytics viewing |
| NFR-U3 | Dark theme with high contrast for outdoor/gym readability |
| NFR-U4 | One-tap stat recording (minimal interaction for live tracking) |
| NFR-U5 | PWA installable on mobile home screen |

### 2.4 Compatibility
| ID | Requirement |
|----|-------------|
| NFR-C1 | Chrome/Edge, Firefox, Safari, mobile browsers |
| NFR-C2 | ES5-compatible JavaScript (no transpilation needed) |
| NFR-C3 | No build system required — pure static files |

### 2.5 Security
| ID | Requirement |
|----|-------------|
| NFR-S1 | Supabase RLS enabled on all tables (currently public access) |
| NFR-S2 | X-Frame-Options: DENY (prevent clickjacking) |
| NFR-S3 | X-Content-Type-Options: nosniff (prevent MIME sniffing) |
| NFR-S4 | Referrer-Policy: no-referrer-when-downgrade |

### 2.6 Data Integrity & Migrations
| ID | Requirement |
|----|-------------|
| NFR-D1 | Database migrations must be idempotent — safe to run multiple times without error or data loss |
| NFR-D2 | App sync code must gracefully handle missing database columns (use fallback defaults) so the app works against databases that haven't yet run the latest migration |
| NFR-D3 | `supabase-setup-v2.sql` must always reflect the canonical final schema (the "from scratch" script) |
| NFR-D4 | Additive schema changes (new columns with defaults, new constraints) are minor version bumps; breaking changes (renamed/removed columns) are major version bumps |
| NFR-D5 | All integer stat columns must have CHECK (>= 0) constraints at the database level |
| NFR-D6 | All user-facing text columns must have char_length() constraints at the database level |

---

## 3. Constraints

| ID | Constraint |
|----|------------|
| C1 | Vanilla JavaScript only — no frameworks (React, Vue, etc.) |
| C2 | No build system or bundler — files served as-is |
| C3 | Static hosting only (Netlify) — no server-side code |
| C4 | Supabase is the sole backend (PostgreSQL + PostgREST API) |
| C5 | Player roster is hardcoded (12 players in HTML) |
| C6 | Maximum 3 sets per match |
| C7 | Team name "Des Moines Eclipse" is hardcoded |
| C8 | package.json used only for dev tooling (Jest) — not for production |

---

## Related Documentation

- [Product.md](Product.md) — Feature descriptions and user workflows
- [Design.md](Design.md) — Technical architecture implementing these requirements
- [Test.md](Test.md) — Test cases validating these requirements
