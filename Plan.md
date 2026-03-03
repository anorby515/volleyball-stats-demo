# Plan.md - Data Storage Audit: Prioritized Findings & Improvements

**Date**: 2026-03-01
**Scope**: localStorage operations, Supabase sync, offline/online transitions, security
**Method**: 4 parallel code audits (race conditions, sync failures, data stranding, security)

---

## Priority 1 — Data Loss Risks (Fix First)

### P1-1: Stored XSS via innerHTML with Unescaped Data
**Risk: HIGH | Remotely Exploitable | Effort: Low**

`analyze-stats.html` interpolates `opponent_name`, `tournament`, and `player_name` directly into `innerHTML` without escaping. Combined with fully open Supabase RLS policies, an attacker can insert a match with a malicious opponent name via the public API and execute JavaScript in every user's browser.

Also affects: `index.html` (resume match display), `volleyball-tracker.html` (stats tables).

**Fix**: Create a reusable `escapeHTML()` function. Apply to all data-sourced values before `innerHTML` insertion. The `populateDropdown()` function in analyze-stats.html already escapes correctly — extend this pattern everywhere.

---

### P1-2: markMatchSynced() Deletes Local Data Without Verification
**Risk: HIGH | Data Loss | Effort: Low**

When `syncMatchToSupabase()` returns `true` for a completed match, `markMatchSynced()` immediately calls `removeMatch()`, deleting the match, sets, and player stats from localStorage. There is no re-read verification that all data actually arrived in Supabase.

The safer `purgeVerifiedLocalStorage()` function exists and checks Supabase before deleting — but `markMatchSynced()` bypasses it entirely.

**Fix**: Remove the `removeMatch()` call from `markMatchSynced()`. Defer all local deletion to `purgeVerifiedLocalStorage()`, which already verifies data exists in Supabase. Strengthen purge to also verify set_scores and player_stats row counts (currently only checks match row).

---

### P1-3: deleteMatch() in Analytics Doesn't Clean localStorage
**Risk: MEDIUM | Data Resurrection / Purge Blocking | Effort: Low**

`analyze-stats.html`'s `deleteMatch()` removes the match from Supabase but never calls `OfflineStorage.removeMatch()`. If the match exists in localStorage:
- If `sync_status === 'pending'`: `syncAllPending()` will re-upsert it to Supabase, **undeleting** the match
- If `sync_status === 'synced'` + `match_status === 'completed'`: `purgeVerifiedLocalStorage()` will fail verification (match gone from Supabase), aborting purge for **all** matches

**Fix**: Add `OfflineStorage.removeMatch(matchId)` to the `deleteMatch()` function.

---

### P1-4: No QuotaExceededError Handling
**Risk: MEDIUM | Silent Data Loss | Effort: Low**

`setJSON()` catches `QuotaExceededError` but only logs it. All callers assume writes succeed. If localStorage fills up (5MB limit), in-memory state diverges from what's persisted. The user continues tracking with no indication that saves are silently failing. On page refresh, all unsaved data is lost.

**Fix**: Make `setJSON()` return a boolean. Show a user-facing warning ("Storage full — please sync to free space") when writes fail.

---

## Priority 2 — Multi-Tab & Race Conditions

### P2-1: No Cross-Tab Coordination (Root Cause of Multiple Races)
**Risk: HIGH architectural | Effort: Medium**

The app has no mechanism to prevent two tabs from editing the same match. All localStorage operations use a read-modify-write pattern on shared JSON objects (`vb_matches` contains ALL matches in one key). Two tabs reading, modifying, and writing the same key will silently overwrite each other's changes.

Concrete scenarios:
- Tab A scores a point, Tab B scores, Tab A saves, Tab B saves — Tab A's point is lost
- Tab A finishes match, Tab B still scoring — Tab A purges local data, Tab B's subsequent saves create orphaned keys

**Fix**: Add a localStorage-based lock (`vb_lock_{matchId}` with tab ID + timestamp). If a second tab tries to open the same match, warn the user and block it. Optionally listen for the `storage` event to detect external modifications.

---

### P2-2: Concurrent Sync and Purge Can Interleave
**Risk: MEDIUM | Effort: Low**

The `syncInProgress` flag is cleared before `attemptPurge()` runs. The 30-second interval or `online` event can trigger a new `attemptSync()` while purge is still deleting localStorage entries.

**Fix**: Extend the `syncInProgress` flag to cover both sync and purge phases.

---

## Priority 3 — Data Stranding Scenarios

### P3-1: Offline Matches Invisible in Analytics
**Risk: HIGH likelihood, HIGH impact | Effort: Medium**

`analyze-stats.html` reads only from Supabase. Matches completed offline exist only in localStorage and are invisible on the analytics page. The only recovery is returning to `index.html` while online and waiting for the 30-second sync cycle.

**Fix**: Show local-only matches inline in the analytics page with a "Local Only" badge.

---

### P3-2: In-Progress Matches Accumulate Forever
**Risk: HIGH likelihood, MEDIUM impact | Effort: Low**

Abandoned in-progress matches are never cleaned up. No age-based expiration, no bulk-delete UI. Worse: pending in-progress matches **block `purgeVerifiedLocalStorage()`** entirely, preventing cleanup of all completed matches too.

**Fix**: Add age-based warning and a "Clear Abandoned Matches" option on the home page.

---

### P3-3: No beforeunload Warning for Unsaved State
**Risk: MEDIUM | Effort: Low**

`volleyball-tracker.html` has no `beforeunload` handler. A user can close the tab mid-match with no warning. No final sync attempt when the page loses visibility.

**Fix**: Add a `beforeunload` handler during active tracking. Optionally trigger a sync attempt on `visibilitychange`.

---

### P3-4: Demo Mode Silently Discards All Sync
**Risk: LOW likelihood, HIGH impact | Effort: Low**

If a user accidentally uses a Netlify preview URL (`APP_MODE = 'demo'`), all Supabase writes are silently skipped and the sync status bar is completely hidden.

**Fix**: Show a visible "DEMO MODE" indicator on all pages when `isDemoMode()` returns true.

---

## Priority 4 — Security Hardening

### P4-1: Fully Open Supabase RLS Policies
**Risk: HIGH | Effort: Medium**

All three tables have `FOR ALL USING (true) WITH CHECK (true)` policies. Anyone with the anon key can read, write, or delete ALL data.

**Fix (short-term)**: Add Supabase Auth with a shared team PIN. Restrict write/delete to authenticated users. **Fix (immediate)**: Enable Supabase database backups / Point-in-Time Recovery.

---

### P4-2: Missing Security Headers
**Risk: MEDIUM | Effort: Low**

No Content-Security-Policy, HSTS, or Permissions-Policy headers.

**Fix (immediate)**: Add to `netlify.toml`:
```
Strict-Transport-Security = "max-age=31536000; includeSubDomains"
Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

---

### P4-3: No Input Validation on Opponent/Tournament Names
**Risk: MEDIUM | Effort: Low**

No length limits, no character restrictions — only `.trim()` and empty-string check.

**Fix**: Add max length (100 chars). Strip HTML special characters. Add Supabase CHECK constraints.

---

### P4-4: Missing Database CHECK Constraints
**Risk: LOW | Effort: Low**

No `CHECK (score >= 0)` on integer columns. No `char_length()` limits on text columns.

**Fix**: Add constraints in a migration.

---

## Summary Matrix

| ID | Finding | Risk | Effort | Category |
|----|---------|------|--------|----------|
| P1-1 | Stored XSS via innerHTML | HIGH | Low | Security |
| P1-2 | markMatchSynced deletes without verification | HIGH | Low | Data Loss |
| P1-3 | deleteMatch doesn't clean localStorage | MEDIUM | Low | Data Integrity |
| P1-4 | No QuotaExceededError handling | MEDIUM | Low | Data Loss |
| P2-1 | No cross-tab coordination | HIGH | Medium | Race Condition |
| P2-2 | Concurrent sync/purge interleave | MEDIUM | Low | Race Condition |
| P3-1 | Offline matches invisible in analytics | HIGH | Medium | Data Stranding |
| P3-2 | In-progress matches accumulate forever | HIGH | Low | Data Stranding |
| P3-3 | No beforeunload warning | MEDIUM | Low | Data Stranding |
| P3-4 | Demo mode silently discards sync | LOW | Low | Data Stranding |
| P4-1 | Open Supabase RLS policies | HIGH | Medium | Security |
| P4-2 | Missing security headers | MEDIUM | Low | Security |
| P4-3 | No input validation | MEDIUM | Low | Security |
| P4-4 | Missing DB CHECK constraints | LOW | Low | Security |

---

## Quick Wins (Low effort, High/Medium impact)

1. **Add `escapeHTML()` utility** — neutralizes all XSS vectors
2. **Remove `removeMatch()` from `markMatchSynced()`** — prevents premature local deletion
3. **Add `OfflineStorage.removeMatch()` to `deleteMatch()` in analytics** — prevents match resurrection
4. **Make `setJSON()` return success boolean + show user warning** — prevents silent data loss
5. **Add HSTS + Permissions-Policy headers** — two lines in netlify.toml
6. **Show "DEMO MODE" indicator** when `isDemoMode()` is true
