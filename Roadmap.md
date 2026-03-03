# Roadmap.md - Future Enhancements & Backlog

**Last Updated**: 2026-03-01
**Current Version**: 2.1.0

---

## Backlog (Unprioritized)

These items are extracted from the original README and represent desired future capabilities. Prioritization TBD with stakeholders.

### Player & Roster Management
- [ ] Dynamic player roster management (add/remove/edit players without code changes) - First Name, Last Name, Position, Number
- [ ] Add ability to create teams
- [ ] Individual player match history (performance trends over time)
- [ ] Player performance trends and charts

### Match & Game Management
- [ ] Coaches Only Access to Stats
- [ ] Parents to help keep stats
- [ ] Parents Access to Games (no stats, records, upcoming games)
- [ ] Tournament bracket tracking
- [ ] Multi-team support (track stats for multiple teams)

### Seasons
- [ ] Ability to Archive a Season
- [ ] Ability to Add a New Season

### Analytics & Reporting
- [ ] Advanced analytics dashboard (charts and graphs)
- [ ] Season comparison (year over year)

### Technical Improvements
- [ ] Per-set player stats (currently only match-level aggregates)
- [ ] Soft deletes (add `deleted_at` column instead of hard deletes)
- [ ] User authentication (replace public RLS with user-scoped policies)
- [ ] CI/CD pipeline
- [ ] End-to-end testing (Playwright or Cypress)

---

## Completed Milestones

See [CHANGELOG.md](CHANGELOG.md) for detailed per-version changes.

| Version | Date | Highlights |
|---------|------|------------|
| v1.0.0 | Jan 2026 | Basic stat tracking, in-memory storage |
| v2.0.0 | Feb 2026 | Cloud database (Supabase), offline-first PWA, auto-save, resume matches |
| v2.1.0 | Feb-Mar 2026 | Analytics dashboard, match history, Excel export, serving stats, player modal, error tracking, match formats |

---

## Known Issues & Technical Debt

- Player roster is hardcoded in `volleyball-tracker.html` (12 players)
- ~~`player_stats` Supabase table lacks `serves`, `aces`, `serve_errors` columns~~ — **Resolved**: migration `supabase-migration-check-constraints.sql` adds these columns
- `database-schema-final.json` references old TIMESTAMPTZ match IDs (archived, superseded by Design.md)
- CSS is embedded inline in each HTML file (no shared stylesheet) — **revisit when page count exceeds 6** or when org/team/calendar management pages are added. At that point, extract `:root` variables, base reset, and shared component styles (buttons, cards, modals, tables) into a `shared.css` and add it to the service worker cache list.
- All page-specific JavaScript is inline in HTML files (no module extraction) — **revisit alongside CSS extraction** if shared UI components (e.g., filter panels, stat tables) start appearing across 3+ pages.
- RLS policies are fully permissive (public read/write — no authentication)

---

## Related Documentation

- [Product.md](Product.md) — Current feature inventory
- [CHANGELOG.md](CHANGELOG.md) — Detailed version history
- [Design.md](Design.md) — Technical architecture
- [Requirements.md](Requirements.md) — Functional requirements
