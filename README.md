# Des Moines Eclipse Volleyball Stat Tracker

A real-time volleyball statistics tracking PWA for the Des Moines Eclipse volleyball team. Track live match scores, player attacks, and serving stats from any device — even offline. Data syncs automatically to the cloud when connected.

**Live Site**: https://desmoineseclipsestats.netlify.app/
**Version**: 2.1.0

---

## Key Features

- **Live Stat Tracking** — Score points by method (Kill, Block, Serve, Error) with one-tap recording
- **Player Statistics** — Track attacks and serves per player with auto-calculated Kill % and Hit %
- **Offline-First** — Works without internet; data syncs to Supabase when connected
- **PWA** — Installable on mobile home screen, cached for instant loading
- **Analytics Dashboard** — Team record, match history, player stats, error tracking
- **Excel Export** — Export filtered stats to .xlsx files
- **Match Management** — Start, resume, and finish matches with up to 3 sets

---

## Quick Start

### Run Locally
```bash
# Clone the repository
git clone https://github.com/anorby515/volleyball-stats.git
cd volleyball-stats

# Serve with Python
python -m http.server 8000

# Or with Node.js
npx serve
```

Open http://localhost:8000

### Run Tests
```bash
npm install    # Install dev dependencies (Jest)
npm test       # Run unit tests
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES5) |
| Data (local) | localStorage (offline-first) |
| Data (cloud) | Supabase (PostgreSQL + PostgREST) |
| PWA | Service Worker, Web App Manifest |
| Hosting | Netlify (static) |
| CDN | jsDelivr (Supabase JS, ExcelJS) |
| Testing | Jest + jsdom (dev only) |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Product.md](Product.md) | Product vision, features, user workflows, player roster |
| [Design.md](Design.md) | Technical architecture, data model, file structure, CSS system |
| [Requirements.md](Requirements.md) | Functional & non-functional requirements |
| [Roadmap.md](Roadmap.md) | Future enhancements and backlog |
| [CHANGELOG.md](CHANGELOG.md) | Version history (all releases) |
| [Test.md](Test.md) | Testing strategy, test cases, how to run |
| [Plan.md](Plan.md) | Current initiative tracking |
| [CLAUDE.md](CLAUDE.md) | AI/developer coding instructions and conventions |

---

## Project Structure

```
volleyball-stats/
├── index.html              # Home page
├── match-setup.html        # Match creation form
├── volleyball-tracker.html # Live stat tracking
├── analyze-stats.html      # Analytics dashboard
├── config.js               # Shared config (version, Supabase, Google)
├── offline-storage.js      # Data persistence + sync engine
├── sw.js                   # Service worker
├── app-mode.js             # Build-time mode (production/demo)
├── manifest.json           # PWA manifest
├── netlify.toml            # Deployment config + security headers
├── package.json            # Dev dependencies (Jest)
├── tests/                  # Unit tests
├── supabase-setup-v2.sql   # Current database schema
└── archive/                # Superseded documentation
```

---

## Team

**Built for**: Des Moines Eclipse Volleyball Team
**Location**: Waukee, Iowa, USA

---

## License

Free to use and modify for personal and team purposes.
