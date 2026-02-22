# Des Moines Eclipse Volleyball Stat Tracker

A comprehensive, real-time volleyball statistics tracking application with cloud database integration designed for the Des Moines Eclipse volleyball team. This progressive web app provides live match scoring, detailed player statistics, attack tracking capabilities, offline support, and multi-device synchronization.

**Live Site**: https://desmoineseclipsestats.netlify.app/

## Key Features

### Cloud Database Integration
- All data automatically synced to Supabase PostgreSQL database
- Multi-device access with real-time synchronization
- Auto-save on every action - never lose data on refresh
- Resume matches from any device

### Offline-First / PWA Support
- **Progressive Web App** - installable on home screen, works offline
- **Local-first architecture** - all data stored in browser localStorage first, then synced to Supabase when online
- **Service Worker** caching for app shell and CDN resources
- **Sync status indicator** (always visible at top of page):
  - Green: Online and synced
  - Orange/Yellow: Syncing or pending sync
  - Red: Offline (data preserved locally, will sync when connection returns)
- Works completely offline with no data loss

### Match Management
- **Start New Match**: Enter opponent and optional tournament name
- **Resume Match**: Continue in-progress matches from earlier today
- **Analyze Stats**: View team record and detailed match history
- **Auto-Save**: Scores saved instantly on every point
- **Set Status**: Distinguishes in-progress vs completed sets
- **Match History**: Track all matches throughout the season

### Live Stat Tracking
- Side-by-side team score display
- Scoring by method: Kills, Blocks, Serves, Errors
- Auto-advancing sets after completion
- Real-time player attack statistics
- Kill percentage and hitting percentage calculations
- **Undo support** for both team score actions and player stat actions (up to 5 actions)

### Player Statistics (10 Players)
Lexi, Anne, Cora, Amelie, Norah, Grace, Laura, Lila, Kjersten, Adelaide
- Expandable player cards with one-tap attack outcome recording
- Attack outcomes: Kill, Error, Block, In Play
- Attempts, Kills, Errors tracked per player per match
- Kill % and Hit % auto-calculated
- Compact mini stats displayed on player buttons
- Instant database sync

### Analytics & Reporting
- **Team Record**: Season win-loss record (counted by sets won/lost)
- **Team Selector**: Filter between Eclipse and opponent team views
- **Match History Table**: Comprehensive view of all completed matches
  - Tournament name and date (clickable to view full match details)
  - Match totals (cumulative stats across all sets)
  - Set-by-set scores and statistics
  - Both Eclipse and opponent stats displayed (K, S, B, E)
- **Match Viewing**: Click match dates to view or edit completed matches
- **Match Deletion**: Remove matches directly from the analytics page
- Desktop/tablet optimized viewing

---

## Database Schema

### Tables

#### `matches`
```sql
match_id        UUID PRIMARY KEY         -- Client-generated UUID
tournament      TEXT                     -- Optional tournament name
team1_name      TEXT                     -- Always "Des Moines Eclipse"
opponent_name   TEXT NOT NULL            -- Opponent team name
match_status    TEXT NOT NULL            -- 'in_progress' or 'completed'
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `set_scores`
```sql
set_id          UUID PRIMARY KEY
match_id        UUID FK                  -- References matches
set_number      INTEGER (1-3)            -- Set number
set_status      TEXT NOT NULL            -- 'in_progress' or 'completed'
team1_score     INTEGER
team1_kills     INTEGER
team1_blocks    INTEGER
team1_serves    INTEGER
team1_errors    INTEGER
team2_score     INTEGER
team2_kills     INTEGER
team2_blocks    INTEGER
team2_serves    INTEGER
team2_errors    INTEGER
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
UNIQUE(match_id, set_number)
```

#### `player_stats`
```sql
stat_id         UUID PRIMARY KEY
match_id        UUID FK                  -- References matches
player_name     TEXT NOT NULL
team_name       TEXT                     -- Default: "Des Moines Eclipse"
attempts        INTEGER
kills           INTEGER
errors          INTEGER
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
UNIQUE(match_id, player_name)
```

### Data Relationships
- Matches -> Sets (one-to-many, CASCADE delete)
- Matches -> Player Stats (one-to-many, CASCADE delete)
- Auto-updating `updated_at` timestamps via database triggers

### Calculated Fields (Client-side)
- **Kill %** = (kills / attempts) x 100
- **Hit %** = ((kills - errors) / attempts) x 100

---

## Setup & Deployment

### Prerequisites
- Supabase account (https://supabase.com)
- GitHub account
- Netlify account (https://netlify.com)

### 1. Database Setup

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Note your Project URL and anon key

2. **Run SQL Scripts**

   **Option A (Recommended)** - Single-step setup with v2 schema:
   ```sql
   -- In Supabase SQL Editor, run:
   supabase-setup-v2.sql
   ```

   **Option B** - Incremental setup from v1:
   ```sql
   -- In Supabase SQL Editor, run these in order:
   1. supabase-setup.sql (creates tables with TIMESTAMPTZ match IDs)
   2. supabase-update-set-status.sql (adds set_status column)
   ```

3. **Verify Tables**
   - Go to Table Editor
   - Confirm tables exist: `matches`, `set_scores`, `player_stats`

### 2. Configure Application

Update `config.js`:
```javascript
var SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_PROJECT_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

### 3. Run Locally

**Option A - Python HTTP Server**
```bash
cd /path/to/volleyball-tracker
python -m http.server 8000
# Open http://localhost:8000
```

**Option B - Node.js Serve**
```bash
npm install -g serve
cd /path/to/volleyball-tracker
serve
```

### 4. Deploy to Netlify

#### Via GitHub (Recommended)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/volleyball-tracker.git
git push -u origin main
```

Then in Netlify:
1. "New site from Git"
2. Connect GitHub repository
3. Build settings:
   - Build command: (empty)
   - Publish directory: `.`
4. Deploy!

#### Direct Upload
1. Go to Netlify dashboard
2. Drag and drop project folder
3. Wait for deployment

---

## User Guide

### Starting a New Match

1. Click **"Start a New Match"**
2. Enter opponent team name (required)
3. Enter tournament name (optional)
4. Click OK

### Tracking Scores

**Team Scoring:**
- Click buttons: Kill, Block, Serve, Error
- Scores update instantly
- Auto-saves to database

**Player Attacks:**
1. Click player name to expand their card
2. Select outcome: Kill, Error, Block, or In Play
3. Stats update and save automatically

**Undo:**
- Undo last team score action (up to 5 actions in history)
- Undo last player stat action (separate undo stack)

### Managing Sets

1. **During Set**: Scores auto-save with status "in progress"
2. **Complete Set**: Click "Save Set Score"
   - Marks set as completed
   - Shows in set history
   - Auto-advances to next set
3. **Switch Sets**: Click set badges (Set 1, Set 2, Set 3) to navigate between sets
4. **Continue**: Track next set

### Finishing Match

1. Complete desired number of sets
2. Click **"Finish Match"** (appears after Set 1 saved)
3. Match status changes to "completed"
4. Returns to home page

### Resuming a Match

1. Go to home page
2. "Resume a Match" section shows if matches exist from today
3. Each match shows:
   - Team names
   - Current set and score
   - Start time
4. Click match to continue tracking

### Analyzing Stats

1. Click **"Analyze Stats"** from home page
2. Use the **team selector** to filter between Eclipse and opponent views
3. View team statistics:
   - **Team Record**: Season win-loss record (counted by sets)
     - Each set counts as a win or loss
     - Only completed matches with saved sets are counted
   - **Match History**: Detailed table showing:
     - Tournament name and match date (click date to view full match)
     - Match totals (cumulative stats for all sets)
     - Set-by-set breakdown with scores
     - Eclipse and opponent statistics (K, S, B, E)
4. **Delete matches** directly from the analytics page
5. Best viewed on desktop or tablet

---

## Auto-Save System

### How It Works

**Every Action Auto-Saves:**
- Click Kill/Block/Serve/Error -> Instant save to localStorage, then synced to Supabase
- Record player attack -> Instant save to localStorage, then synced to Supabase
- Refresh browser -> Data reloads from local storage or database

### Set Status System

| Status | When | Visibility |
|--------|------|------------|
| `in_progress` | Auto-saved during tracking | Not in set history |
| `completed` | Click "Save Set Score" | Shows in set history |

### Match Status System

| Status | When | Visibility |
|--------|------|------------|
| `in_progress` | Currently tracking | Shows in "Resume" list |
| `completed` | Click "Finish Match" | Removed from "Resume" list |

---

## User Interface

### Home Page
```
+-------------------------------------+
|    Des Moines Eclipse Stat Tracker   |
|                                      |
|  +------------------------+         |
|  | Start a New Match      |         |
|  +------------------------+         |
|                                      |
|  +------------------------------+   |
|  | Resume a Match                |   |
|  +------------------------------+   |
|  | Eclipse vs Valley - Set 2: 12-8| |
|  | Started at 2:30 PM           |   |
|  +------------------------------+   |
|                                      |
|  +------------------------+         |
|  | Analyze Stats          |         |
|  +------------------------+         |
+-------------------------------------+
```

### Stat Tracker
```
+---------------------------------------------+
|        Set 1    Set 2    Set 3              |
|                                              |
| [SAVE SET] Set 1: 25-22 [FINISH MATCH]     |
+--------------------+------------------------+
| Des Moines         |  Valley High           |
| Eclipse            |                        |
|      15            |       12               |
| [Kill] [Block]     |  [Kill] [Block]       |
| [Serve] [Error]    |  [Serve] [Error]      |
+--------------------+------------------------+
| Player Attack Stats                         |
| [Lexi] [Anne] [Cora] [Amelie] [Norah]     |
| [Grace] [Laura] [Lila] [Kjersten] [Adelaide]|
|                                              |
| > Lexi (expanded)                           |
|   Att: 12  K: 5  E: 2  K%: 41.7  H%: 25.0 |
|   [Kill] [Error] [Block] [In Play]          |
+---------------------------------------------+
```

---

## Troubleshooting

### Common Issues

**Scores reset on refresh**
```
Problem: Auto-save not working
Solution:
1. Ensure you are using supabase-setup-v2.sql (includes set_status)
2. Check browser console for errors
3. Verify config.js credentials
```

**"Database not ready" error**
```
Problem: Can't connect to Supabase
Solution:
1. Verify config.js has correct URL and key
2. Check Supabase project is active
3. Hard refresh browser (Ctrl+Shift+R)
4. App will fall back to offline mode automatically
```

**Resume doesn't show matches**
```
Problem: No in-progress matches found
Solution:
1. Matches must be from today
2. Match status must be 'in_progress'
3. Check localStorage or Supabase Table Editor
```

**Can't create new match**
```
Problem: Database tables missing
Solution:
1. Run supabase-setup-v2.sql in SQL Editor
2. Verify tables in Table Editor
3. Check for SQL errors
```

**Sync status shows red/offline**
```
Problem: Cannot connect to Supabase
Solution:
1. Check internet connection
2. Data is safe in localStorage
3. Will auto-sync when connection returns
4. Avoid clearing browser data while offline
```

### Database Management

**Clear All Data:**
```sql
DELETE FROM player_stats;
DELETE FROM set_scores;
DELETE FROM matches;
```

**Delete Specific Match:**
```sql
-- CASCADE deletes related set_scores and player_stats
DELETE FROM matches
WHERE match_id = 'your-uuid-here';
```

**View Today's Matches:**
```sql
SELECT * FROM matches
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
```

---

## Project Structure

```
volleyball-tracker/
├── index.html                          # Landing page (start, resume, analyze)
├── volleyball-tracker.html             # Main stat tracker interface
├── analyze-stats.html                  # Analytics & match history dashboard
├── match-setup.html                    # Match creation page (alternate route)
├── config.js                           # Supabase configuration & service worker registration
├── offline-storage.js                  # localStorage API & Supabase sync engine
├── sw.js                               # Service worker for offline PWA support
├── manifest.json                       # PWA manifest (app name, icons, theme)
├── supabase-setup-v2.sql               # Current database schema (UUID match IDs)
├── supabase-setup.sql                  # Original database schema (v1)
├── supabase-update-set-status.sql      # Migration: adds set_status column (v1 -> v2)
├── database-schema-final.json          # Complete schema reference documentation
├── netlify.toml                        # Netlify deployment & security headers
├── README.md                           # This file
├── SETUP-GUIDE.md                      # Detailed setup instructions
└── FEATURE-VIEW-MATCH-HISTORY.md       # Match history feature documentation
```

---

## Future Enhancements

- [ ] Player performance trends over time
- [ ] Opponent scouting reports
- [ ] Multi-team support
- [ ] Dynamic player roster management
- [ ] Export to PDF/CSV
- [ ] Advanced analytics dashboard (charts and graphs)
- [ ] Rotation tracking
- [ ] Serving order management
- [ ] Tournament bracket tracking
- [ ] Season comparison (year over year)
- [ ] Individual player match history

---

## Technology Stack

**Frontend:**
- HTML5, CSS3, JavaScript (Vanilla)
- Google Fonts (Oswald, Barlow Condensed)
- Responsive design (mobile, tablet, desktop)
- Dark theme with CSS variables

**Offline & PWA:**
- Service Worker (cache-first for app, network-first for CDN)
- localStorage (offline-first data persistence)
- Web App Manifest (installable PWA)
- Online/offline detection with auto-sync

**Backend:**
- Supabase (PostgreSQL)
- Supabase JS Client v2 (via jsDelivr CDN)
- Row Level Security (RLS)
- Database triggers for auto-updating timestamps

**Deployment:**
- Netlify (static site hosting)
- GitHub (version control)
- CDN delivery (jsDelivr for Supabase JS)

**Browser Support:**
- Chrome/Edge
- Firefox
- Safari
- Mobile browsers

---

## Version History

### v2.1 (Current) - February 2026
- Analyze Stats page added
- Team Record display (set-based W-L calculation)
- Match History table with detailed statistics
- Match totals calculation (cumulative stats)
- Set-by-set breakdown with scores
- Tournament and date tracking in history
- Team selector for filtering views
- Match viewing and deletion from analytics
- Desktop/tablet optimized layout

### v2.0 - February 2026
- Cloud database integration (Supabase)
- Offline-first architecture with localStorage
- Progressive Web App (PWA) with service worker
- Auto-save functionality
- Resume in-progress matches
- Set status tracking (in_progress / completed)
- Match status tracking
- Side-by-side team display
- Player attack tracking with expandable cards
- Undo support for score and player actions
- Sync status indicator
- Smart Finish Match button

### v1.0 - Initial Release
- Basic stat tracking
- In-memory storage only
- Manual set saving

---

## Team

**Designed for**: Des Moines Eclipse Volleyball Team
**Location**: Waukee, Iowa, USA
**Deployed**: https://desmoineseclipsestats.netlify.app/

---

## License

Free to use and modify for personal and team purposes.

---

## Support

For issues or questions:
1. Review SETUP-GUIDE.md for detailed setup steps
2. Check the Troubleshooting section above
3. Check browser console (F12) for errors
4. Verify Supabase connection in config.js

---

**Last Updated**: February 13, 2026
**Version**: 2.1
**Status**: Production Ready
