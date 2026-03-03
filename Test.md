# Test.md - Testing Strategy & Test Plan

**Last Updated**: 2026-03-01
**Framework**: Jest + jsdom
**Current Version**: 2.1.0

---

## 1. Testing Philosophy

This project is a static PWA with no build system for production. Testing is introduced as a development-time concern only:

- **package.json** contains devDependencies (Jest) — not used in production
- **tests/** directory contains all test files
- Tests run via `npm test` in a Node.js + jsdom environment
- Production app remains pure static HTML/JS/CSS

---

## 2. Setup

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Watch Mode (during development)
```bash
npm test -- --watch
```

---

## 3. Directory Structure

```
tests/
├── setup.js                    # Jest setup: jsdom globals, localStorage mock
├── offline-storage.test.js     # Unit tests for offline-storage.js
├── config.test.js              # Unit tests for config.js
└── ...                         # Future test files
```

---

## 4. Test Categories

### 4.1 Unit Tests — offline-storage.js

The most critical and testable module. All functions are pure data operations on localStorage.

| Test Area | Functions | Priority |
|-----------|-----------|----------|
| UUID generation | `generateUUID()` | High |
| Match CRUD | `saveMatch`, `getMatch`, `getAllMatches`, `removeMatch` | High |
| Match queries | `getInProgressMatches`, `getPendingMatches` | High |
| Set CRUD | `saveSets`, `getSets`, `saveSet`, `getSet` | High |
| Player stats | `saveAllPlayerStats`, `getAllPlayerStats`, `savePlayerStat` | High |
| Sync status | `markMatchSynced`, `markMatchPending`, `getLastSyncTime` | Medium |
| Cache operations | `cacheOpponents`, `getCachedOpponents`, `cacheTournaments` | Medium |
| Connectivity | `isOnline` | Low |
| Supabase sync | `syncMatchToSupabase`, `syncAllPending` | Medium (requires mocking) |
| Storage purge | `purgeVerifiedLocalStorage` | Medium (requires mocking) |

### 4.2 Unit Tests — config.js

| Test Area | Functions | Priority |
|-----------|-----------|----------|
| Version defined | `APP_VERSION` exists and is semver | High |
| Supabase config | `SUPABASE_CONFIG` has url and anonKey | High |
| Demo mode | `isDemoMode()` returns false in production | Medium |
| Init safety | `tryInitSupabase()` returns null when library not loaded | Medium |

### 4.3 Integration Tests (Future)

| Test Area | Description | Priority |
|-----------|-------------|----------|
| Sync flow | Mock Supabase, verify localStorage → Supabase data flow | Medium |
| Offline/online toggle | Verify pending queue builds offline, syncs on reconnect | Medium |
| Purge verification | Verify completed matches purged only after Supabase confirmation | Low |

### 4.4 DOM/UI Tests (Future)

| Test Area | Page | Priority |
|-----------|------|----------|
| Score point updates display | volleyball-tracker.html | Medium |
| Undo reverts score | volleyball-tracker.html | Medium |
| Set completion auto-prompt | volleyball-tracker.html | Low |
| Filter cascading | analyze-stats.html | Low |
| Resume match list rendering | index.html | Low |

---

## 5. Test Case Inventory

### offline-storage.test.js

**UUID Generation**
- [ ] `generateUUID()` returns a string in UUID v4 format
- [ ] `generateUUID()` returns unique values on successive calls

**Match Operations**
- [ ] `saveMatch()` stores match in localStorage under `vb_matches`
- [ ] `getMatch()` retrieves a saved match by ID
- [ ] `getMatch()` returns null for non-existent match
- [ ] `getAllMatches()` returns all saved matches
- [ ] `getAllMatches()` returns empty object when no matches exist
- [ ] `removeMatch()` deletes match and associated sets and player stats
- [ ] `getInProgressMatches()` returns only in_progress matches, sorted newest first
- [ ] `getPendingMatches()` returns only pending-sync matches

**Set Operations**
- [ ] `saveSets()` stores all sets for a match
- [ ] `getSets()` retrieves all sets for a match
- [ ] `saveSet()` updates a specific set without affecting others
- [ ] `getSet()` retrieves a specific set by number
- [ ] `getSet()` returns null for non-existent set

**Player Stats**
- [ ] `saveAllPlayerStats()` stores all player stats for a match
- [ ] `getAllPlayerStats()` retrieves all player stats for a match
- [ ] `savePlayerStat()` updates a specific player without affecting others
- [ ] `getAllPlayerStats()` returns empty object when no stats exist

**Sync Status**
- [ ] `markMatchPending()` sets sync_status to 'pending'
- [ ] `markMatchSynced()` sets sync_status to 'synced'
- [ ] `markMatchSynced()` removes completed matches from localStorage
- [ ] `getLastSyncTime()` returns null initially
- [ ] `setLastSyncTime()` stores current time

**Cache**
- [ ] `cacheOpponents()` stores and retrieves opponent list
- [ ] `getCachedOpponents()` returns empty array when no cache exists
- [ ] `cacheTournaments()` stores and retrieves tournament list

### config.test.js

- [ ] `APP_VERSION` is defined and matches semver pattern
- [ ] `SUPABASE_CONFIG.url` is a valid URL string
- [ ] `SUPABASE_CONFIG.anonKey` is a non-empty string
- [ ] `isDemoMode()` returns false when APP_MODE is 'production'
- [ ] `isDemoMode()` returns true when APP_MODE is 'demo'
- [ ] `tryInitSupabase()` returns null when supabase library not loaded

---

## 6. Mocking Strategy

### localStorage
Jest + jsdom provides a built-in localStorage implementation. Tests use `localStorage.clear()` in `beforeEach` to ensure isolation.

### Supabase Client
For sync tests, mock the Supabase client:
```javascript
const mockDb = {
  from: jest.fn().mockReturnValue({
    upsert: jest.fn().mockResolvedValue({ error: null }),
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { match_id: 'test' }, error: null })
      })
    }),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null })
    })
  })
};
```

### navigator.onLine
```javascript
Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
```

---

## 7. Coverage Goals

Initial target: **Core data operations at > 80% coverage**

| Module | Target |
|--------|--------|
| offline-storage.js (localStorage operations) | > 80% |
| offline-storage.js (Supabase sync) | > 50% (requires mocking) |
| config.js | > 90% |
| Inline page JS | Best effort (future) |

---

## Related Documentation

- [Requirements.md](Requirements.md) — Requirements these tests validate
- [Design.md](Design.md) — Architecture being tested
- [CLAUDE.md](CLAUDE.md) — How to run tests
