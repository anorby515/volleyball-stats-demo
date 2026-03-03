# Changelog

All notable changes to the Des Moines Eclipse Volleyball Stat Tracker are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-03-01

### Added
- Documentation architecture: Product.md, Roadmap.md, CHANGELOG.md, Requirements.md, Design.md, Test.md, Plan.md
- AI tool configs: .cursorrules, .github/copilot-instructions.md
- Version reconciliation (config.js + sw.js aligned to 2.1.0)

### Changed
- README.md streamlined — detailed content moved to dedicated docs
- CLAUDE.md rewritten as tool-independent AI/developer instructions
- Old docs (SETUP-GUIDE.md, FEATURE-VIEW-MATCH-HISTORY.md, database-schema-final.json) moved to archive/

---

## [2.0.1] - 2026-02 (formerly labeled 1.1.0 in config.js)

### Added
- App versioning system (APP_VERSION in config.js, CACHE_NAME in sw.js)
- Auto-save unsaved sets when finishing a match

### Changed
- Version bump from 1.0.0 to 1.1.0 (internal)

---

## [2.0.0] - 2026-02 (formerly labeled v2.0/v2.1 in README)

### Added
- Supabase cloud database integration (PostgreSQL)
- Offline-first architecture with localStorage
- Progressive Web App (PWA) with service worker
- Auto-save on every action
- Resume in-progress matches
- Set status tracking (in_progress / completed)
- Match status tracking (in_progress / completed)
- Sync status indicator (green/orange/red)
- Undo support for team score actions (up to 5 history)
- Player attack tracking with expandable cards
- Side-by-side team score display
- Smart Finish Match button
- Analyze Stats page with team record display
- Match History table with detailed statistics
- Match totals calculation (cumulative stats across sets)
- Set-by-set breakdown with scores
- Team selector for filtering views (Eclipse vs opponent)
- Match viewing from analytics (clickable dates)
- Match deletion from analytics page
- Tournament and date tracking
- Excel export (ExcelJS)
- Google Sheets export (OAuth, optional)
- No-cache meta tags for browser refresh
- "Ace, Ace Baby" banner on aces
- Player action modal (serve/attack outcomes)
- Serving stats tracking (aces, in-play, errors)
- Grand Total Points card on analytics
- Match format selection (Pool Play / Bracket Play)
- Pool play scoring formats (0-to-21, 4-to-25)
- Error type tracking (pass vs penalty errors)
- Error tracking table on analytics
- Sortable player stats and serve stats tables
- Filter by team/tournament/opponent with cascading dropdowns
- Filter persistence via URL query parameters
- Completed match banner when viewing historical matches
- Back to Analytics navigation button
- Opponent and tournament auto-suggest (cached from Supabase)
- Match setup page with team/opponent/tournament/format selection
- Database migrations for error columns, match format, set status
- Supabase schema v2 with UUID match IDs

### Changed
- Match ID format from TIMESTAMPTZ to UUID (client-generated)
- Player modal redesigned for better mobile usability
- Modal font and button sizes adjusted
- Attack tracking player buttons shrunk to ~60% for mobile
- Score tracking buttons reordered to 3-column grid
- Block outcome added to attack tracking
- Stats percentage format updated
- Service worker cache versioning aligned with APP_VERSION

### Fixed
- Team 1 serve counter only increments on aces (not all serves)
- Supabase queries work before serve columns are added (graceful fallback)
- Match sync: await Supabase sync before page navigation
- Missing match_format column migration and sync debug logging
- Missing error-type columns in set_scores schema
- Stale opponent/tournament cache persisting after all matches deleted
- Data persistence issues on page refresh

---

## [1.0.0] - 2026-01

### Added
- Basic volleyball stat tracking interface
- In-memory storage only
- Manual set saving
- Player statistics for 10 players
- Kill and hit percentage calculations

---

## Version Note

Prior to v2.0.1, the project did not have a formal versioning system in code.
The version labels (v1.0, v2.0, v2.1) in the original README were narrative
milestones. The formal `APP_VERSION` in `config.js` was introduced at commit
`c34906b` and set to 1.0.0, then bumped to 1.1.0. This changelog reconciles
both numbering systems by setting the current version to 2.1.0.
