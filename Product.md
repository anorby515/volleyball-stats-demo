# Product.md - Des Moines Eclipse Volleyball Stat Tracker

**Last Updated**: 2026-03-01
**Current Version**: 2.1.0

---

## Product Vision

A real-time volleyball statistics tracking application designed specifically for the Des Moines Eclipse volleyball team. The app enables coaches, parents, and stat keepers to record live match data from any device — even without internet — and view analytics after the fact.

**Live Site**: https://desmoineseclipsestats.netlify.app/

---

## Target Users

| User | Role | Primary Use |
|------|------|-------------|
| **Stat Keeper** | Person tracking stats during a match | Start match, record points, track player attacks, save sets |
| **Coach** | Head or assistant coach | Review analytics, player performance, match history between games |
| **Parent/Spectator** | Team supporter | View live match from another device (if online) |

---

## Feature Inventory

### Match Management
- **Start New Match** — Select team, opponent, tournament (optional), match format
- **Match Formats** — Bracket play (race to 25) or Pool play (configurable: 0-to-21 or 4-to-25)
- **Resume Match** — Continue in-progress matches from earlier today
- **Finish Match** — Mark match as completed, auto-save unsaved sets
- **Delete Match** — Remove match and all associated data (cascading delete)

### Live Stat Tracking
- **Team Scoring** — Side-by-side score display for both teams
- **Scoring Methods** — Kill, Block, Serve (Ace), Error buttons for each team
- **Error Type Tracking** — Pass errors vs. penalty errors distinguished
- **Set Management** — Up to 3 sets per match, auto-advance after set completion
- **Set History** — Visual badges showing completed set scores
- **Undo Support** — Revert last 5 team score actions

### Player Statistics
- **Player Action Modal** — Tap player name to open serve/attack recording modal
- **Serve Tracking** — Ace, In Play, Error outcomes per player
- **Attack Tracking** — Kill, In Play, Block, Error outcomes per player
- **Calculated Stats** — Kill % and Hit % auto-calculated per player
- **Sortable Tables** — Player stats and serve stats tables with column sorting
- **"Ace, Ace Baby" Banner** — Fun visual feedback on aces

### Analytics & Reporting
- **Team Record** — Season win-loss record (counted by sets won/lost)
- **Grand Total Stats** — Aggregate kills, blocks, serves, errors across filtered matches
- **Match History Table** — All matches with tournament, date, and stats breakdown
- **Set-by-Set Breakdown** — Detailed stats per set within each match
- **Team Selector** — Filter between Eclipse and opponent team views
- **Advanced Filters** — Filter by team, tournament, and opponent with cascading dropdowns
- **Filter Persistence** — Filters saved in URL query parameters
- **Error Tracking Table** — Pass vs. penalty error frequency analysis
- **Match Viewing** — Click match date to view/edit completed match details
- **Match Deletion** — Remove matches directly from analytics page
- **Excel Export** — Export filtered data to .xlsx file (ExcelJS)
- **Google Sheets Export** — Push data to Google Sheets via OAuth (optional)

### Offline-First / PWA
- **Progressive Web App** — Installable on mobile home screen
- **Offline Capable** — Full functionality without internet connection
- **Local-First Storage** — All data saved to localStorage immediately
- **Service Worker** — App shell cached for instant loading
- **Sync Status Indicator** — Color-coded connection status:
  - Green: Online and synced
  - Orange: Syncing or pending
  - Red: Offline (data safe locally)
- **Background Sync** — Automatic sync to Supabase when connectivity returns
- **Periodic Sync Check** — Every 30 seconds when online
- **Storage Purge** — Verified cleanup of synced local data

---

## Current Player Roster

12 players (hardcoded in volleyball-tracker.html):

| # | Player |
|---|--------|
| 1 | Lexi |
| 2 | Anne |
| 3 | Cora |
| 4 | Amelie |
| 5 | Norah |
| 6 | Grace |
| 7 | Laura |
| 8 | Lila |
| 9 | Kjersten |
| 10 | Adelaide |
| 11 | Greta |
| 12 | Hannah |

---

## User Workflows

### Start and Track a Match
```
Home Page → Start New Match → Match Setup Form
  → Select Team (Eclipse 16/17u)
  → Select/Add Opponent
  → Select/Add Tournament (optional)
  → Select Format (Bracket/Pool Play)
  → Start Match
    → Live Tracker
      → Record team points (Kill/Block/Serve/Error)
      → Tap player → Record serve/attack outcomes
      → Save Set when complete (auto-prompted at winning score)
      → Repeat for Sets 2, 3
      → Finish Match
        → Returns to Home Page
```

### Resume an In-Progress Match
```
Home Page → Resume a Match section
  → Shows today's in-progress matches
  → Click match card
    → Live Tracker (loads saved state)
```

### Analyze Past Matches
```
Home Page → Analyze Stats
  → Analytics Dashboard
    → View team record (W-L)
    → Filter by team/tournament/opponent
    → View match history table
    → Click match date → View/edit match details
    → Export to Excel or Google Sheets
```

---

## UI Layout (ASCII Wireframes)

### Home Page
```
+-------------------------------------+
|  [Sync Status Bar]                  |
|                                      |
|    Des Moines Eclipse Stat Tracker   |
|                                      |
|  +----------------------------+     |
|  | Start a New Match          |     |
|  +----------------------------+     |
|                                      |
|  +----------------------------+     |
|  | Resume a Match             |     |
|  | Eclipse vs Valley - Set 2  |     |
|  | Started 2:30 PM            |     |
|  +----------------------------+     |
|                                      |
|  +----------------------------+     |
|  | Analyze Stats              |     |
|  +----------------------------+     |
|                                      |
|                          v2.1.0     |
+-------------------------------------+
```

### Live Stat Tracker
```
+---------------------------------------------+
| [Set 1] [Set 2] [Set 3]                    |
| [SAVE SET] Set 1: 25-22 [FINISH MATCH]     |
+--------------------+------------------------+
| Des Moines Eclipse |  Valley High           |
|       15           |       12               |
| [Kill] [Block]     |  [Kill] [Block]       |
| [Serve] [Error]    |  [Serve] [Error]      |
|              [UNDO]                         |
+---------------------------------------------+
| Player Attack Stats                         |
| [Lexi] [Anne] [Cora] [Amelie] [Norah]     |
| [Grace] [Laura] [Lila] [Kjersten]          |
| [Adelaide] [Greta] [Hannah]                |
+---------------------------------------------+
| Tracker Stats Table (sortable)              |
| Serve Stats Table (sortable)                |
+---------------------------------------------+
```

---

## Related Documentation

- [Design.md](Design.md) — Technical architecture and data model
- [Requirements.md](Requirements.md) — Functional and non-functional requirements
- [Roadmap.md](Roadmap.md) — Future enhancements and backlog
- [CHANGELOG.md](CHANGELOG.md) — Version history
- [Test.md](Test.md) — Testing strategy and test cases
