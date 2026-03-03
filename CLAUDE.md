# Project Instructions

> This file provides coding instructions and project context for AI assistants and developers.
> It is tool-agnostic — usable with Claude Code, Cursor, GitHub Copilot, or any AI coding tool.

---

## Project Overview

Des Moines Eclipse Volleyball Stat Tracker — a static PWA (HTML/JS/CSS) with localStorage for offline support and Supabase for cloud sync. Deployed via Netlify.

**Current Version**: 2.1.0

---

## Documentation Index

| Document | What It Covers |
|----------|---------------|
| [Product.md](Product.md) | Features, user workflows, player roster |
| [Design.md](Design.md) | Architecture, data model, file structure, CSS system |
| [Requirements.md](Requirements.md) | Functional & non-functional requirements |
| [Roadmap.md](Roadmap.md) | Backlog, known issues, technical debt |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [Test.md](Test.md) | Test strategy, test cases, how to run |
| [Plan.md](Plan.md) | Current initiative tracking |

---

## Architecture Quick Reference

- **No build system** — pure static files served as-is
- `config.js` is loaded by every HTML page (shared config: version, Supabase, Google)
- `offline-storage.js` handles all localStorage operations and Supabase sync
- `app-mode.js` is modified at deploy time by Netlify (`production` vs `demo`)
- `sw.js` uses cache-first for app files, network-first for CDN resources
- All CSS is embedded in `<style>` tags within each HTML file (no external stylesheets)
- All page-specific JavaScript is inline in HTML files
- Player roster (12 players) is hardcoded in `volleyball-tracker.html`

---

## Coding Standards

### JavaScript
- **ES5 syntax only** — `var` not `let`/`const`, `function` not arrow functions
- No modules, imports, or exports — use global variables and IIFEs
- No frameworks (React, Vue, etc.) — vanilla DOM manipulation
- `offline-storage.js` exposes a global `OfflineStorage` object
- `config.js` exposes global variables (`APP_VERSION`, `SUPABASE_CONFIG`, etc.)

### HTML / CSS
- Each HTML page contains its own `<style>` block — no external CSS files
- Use CSS custom properties defined in `:root` (see Design.md for full list)
- Fonts: Oswald (headings), Barlow Condensed (body) — loaded from Google Fonts CDN
- Mobile-first responsive design with `768px` breakpoint

### General
- No `package.json` dependencies for production — only dev dependencies (Jest)
- Test files go in `tests/` directory
- SQL migration files are kept in project root for reference

---

## App Versioning

### Version Locations
- **Source of truth**: `APP_VERSION` in `config.js`
- **Service worker**: `CACHE_NAME` in `sw.js` must stay in sync (format: `vb-tracker-vX.Y.Z`)
- **Display**: Shown in bottom-right corner of `index.html`
- **Data**: Stamped as `app_version` on new match records in `match-setup.html`

### Semantic Versioning Rules
- **Major (X.0.0)**: Breaking schema changes — renamed/removed columns or tables, changed localStorage key formats, changes that require old clients to update before syncing
- **Minor (X.Y.0)**: New features, additive schema changes (new columns with defaults, new constraints, new tables) — existing data and older clients continue to work
- **Patch (X.Y.Z)**: Bug fixes, styling tweaks, cache-busting, text changes

### Version Bump Checklist
When changing the version, update ALL of these:
1. `APP_VERSION` in `config.js`
2. `CACHE_NAME` in `sw.js` (format: `vb-tracker-vX.Y.Z`)

### Version Suggestion Requirement
After completing any code change, assess whether a version bump is needed and suggest the appropriate level (major/minor/patch) with a brief reason. Wait for user confirmation before applying the bump.

---

## Testing

### Run Tests
```bash
npm install    # First time only
npm test       # Run all tests
npm test -- --coverage    # With coverage report
```

### Test Structure
- Framework: Jest + jsdom
- Tests in `tests/` directory
- See [Test.md](Test.md) for full test plan and test case inventory

---

## Key Data Patterns

### localStorage Keys
| Key | Content |
|-----|---------|
| `vb_matches` | All match metadata + sync status |
| `vb_sets_{matchId}` | Set scores per match |
| `vb_players_{matchId}` | Player stats per match |
| `vb_last_sync` | Last sync timestamp |
| `vb_cached_opponents` | Cached opponent names |
| `vb_cached_tournaments` | Cached tournament names |

### Supabase Tables
- `matches` — Match metadata (UUID PK, opponent, format, status)
- `set_scores` — Per-set scores and stats (FK → matches, CASCADE delete)
- `player_stats` — Per-player match totals (FK → matches, CASCADE delete)

### Sync Flow
1. User action → save to localStorage immediately
2. If online → upsert to Supabase (match → sets → players)
3. If offline → mark as pending, sync on reconnect
4. Completed + synced matches → purged from localStorage after verification

---

## Common Tasks

### Add a new player
1. Add a player button in `volleyball-tracker.html` (search for existing player buttons)
2. The player will automatically be tracked in localStorage and Supabase

### Add a new stat type
1. Add UI buttons in `volleyball-tracker.html`
2. Update `scorePoint()` or create new recording function
3. Add columns to relevant Supabase table (create migration SQL)
4. Update `offline-storage.js` sync logic to include new fields
5. Update `analyze-stats.html` to display the new stat
6. Bump minor version

### Modify database schema
1. Create a new migration SQL file named `supabase-migration-<description>.sql`
2. Migration must be **idempotent** — use `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, or named constraints so it can be safely re-run
3. Update `supabase-setup-v2.sql` to reflect the final canonical schema (this is the "from scratch" script)
4. Update sync code in `offline-storage.js` with **fallback for missing columns** (e.g., `ps.serves || 0`) so the app works against databases that haven't run the migration yet
5. Update `analyze-stats.html` if the change affects displayed data
6. Update Design.md data model section and file tree
7. Determine version bump:
   - **Major** if the change is breaking (renamed/removed columns, changed types)
   - **Minor** if the change is additive (new columns with defaults, new constraints, new tables)
