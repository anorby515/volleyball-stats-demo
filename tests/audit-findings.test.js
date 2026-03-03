/**
 * Tests validating data storage audit findings.
 *
 * These tests demonstrate the specific vulnerabilities and edge cases
 * identified in the data storage audit (see Plan.md).
 */

loadScript('offline-storage.js');

describe('Audit Findings — Data Loss Scenarios', function() {

    beforeEach(function() {
        localStorage.clear();
        jest.clearAllMocks();
    });

    // =========================================================================
    // P1-2: markMatchSynced no longer deletes — defers to purge
    // =========================================================================

    describe('P1-2: markMatchSynced defers deletion to purge', function() {

        test('markMatchSynced preserves completed match data for purge verification', function() {
            // After fix: markMatchSynced only updates sync_status,
            // it does NOT delete data — purgeVerifiedLocalStorage handles deletion
            OfflineStorage.saveMatch({
                match_id: 'completed-1',
                match_status: 'completed',
                sync_status: 'pending'
            });
            OfflineStorage.saveSets('completed-1', {
                1: { team1_score: 25, team2_score: 20 }
            });
            OfflineStorage.saveAllPlayerStats('completed-1', {
                Lexi: { attempts: 10, kills: 5, errors: 2 }
            });

            OfflineStorage.markMatchSynced('completed-1');

            // Match is still present — only sync_status changed
            var match = OfflineStorage.getMatch('completed-1');
            expect(match).not.toBeNull();
            expect(match.sync_status).toBe('synced');
            expect(OfflineStorage.getSets('completed-1')).not.toEqual({});
            expect(OfflineStorage.getAllPlayerStats('completed-1')).not.toEqual({});
        });

        test('markMatchSynced preserves in-progress matches', function() {
            OfflineStorage.saveMatch({
                match_id: 'ip-1',
                match_status: 'in_progress',
                sync_status: 'pending'
            });

            OfflineStorage.markMatchSynced('ip-1');

            var match = OfflineStorage.getMatch('ip-1');
            expect(match).not.toBeNull();
            expect(match.sync_status).toBe('synced');
        });
    });

    // =========================================================================
    // P1-1: escapeHTML utility
    // =========================================================================

    describe('P1-1: escapeHTML prevents XSS', function() {

        test('escapes all dangerous HTML characters', function() {
            var esc = OfflineStorage.escapeHTML;
            expect(esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
            expect(esc('"onmouseover="alert(1)"')).toBe('&quot;onmouseover=&quot;alert(1)&quot;');
            expect(esc("' onclick='alert(1)")).toBe("&#39; onclick=&#39;alert(1)");
            expect(esc('A & B < C > D')).toBe('A &amp; B &lt; C &gt; D');
        });

        test('handles non-string inputs safely', function() {
            expect(OfflineStorage.escapeHTML(null)).toBe('');
            expect(OfflineStorage.escapeHTML(undefined)).toBe('');
            expect(OfflineStorage.escapeHTML(123)).toBe('');
        });

        test('passes through safe strings unchanged', function() {
            expect(OfflineStorage.escapeHTML('Des Moines Eclipse')).toBe('Des Moines Eclipse');
            expect(OfflineStorage.escapeHTML('Team #1')).toBe('Team #1');
        });
    });

    // =========================================================================
    // P1-3: deleteMatch in analytics doesn't clean localStorage
    // =========================================================================

    describe('P1-3: Orphaned localStorage after Supabase delete', function() {

        test('match in localStorage survives after Supabase-only delete', function() {
            // Simulates: user deletes match from analytics page,
            // which only removes from Supabase, not localStorage
            OfflineStorage.saveMatch({
                match_id: 'orphan-1',
                match_status: 'completed',
                sync_status: 'pending'
            });
            OfflineStorage.saveSets('orphan-1', {
                1: { team1_score: 25, team2_score: 22 }
            });

            // Analytics deleteMatch() does NOT call OfflineStorage.removeMatch()
            // So the match persists in localStorage:
            expect(OfflineStorage.getMatch('orphan-1')).not.toBeNull();
            expect(OfflineStorage.getPendingMatches().length).toBe(1);

            // syncAllPending would re-upsert this to Supabase, "undeleting" it
        });

        test('orphaned synced+completed match blocks purge verification', function() {
            // A completed+synced match that was deleted from Supabase
            // but NOT from localStorage will cause purge to abort
            OfflineStorage.saveMatch({
                match_id: 'orphan-synced',
                match_status: 'completed',
                sync_status: 'synced'
            });

            // purgeVerifiedLocalStorage would try to verify this in Supabase,
            // fail (match was deleted from Supabase), and abort ALL purging
        });
    });

    // =========================================================================
    // P1-4: QuotaExceededError handling
    // =========================================================================

    describe('P1-4: setJSON handles quota exceeded gracefully', function() {

        test('saveMatch does not throw when localStorage.setItem fails', function() {
            // Simulate QuotaExceededError by mocking setItem to throw
            var origSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = jest.fn(function() {
                throw new DOMException('QuotaExceededError');
            });

            // saveMatch gracefully handles the error
            expect(function() {
                OfflineStorage.saveMatch({
                    match_id: 'quota-test',
                    match_status: 'in_progress'
                });
            }).not.toThrow();

            // Restore setItem so getMatch can read
            Storage.prototype.setItem = origSetItem;

            // The match was never persisted
            expect(OfflineStorage.getMatch('quota-test')).toBeNull();
        });

        test('shows storage warning banner on quota exceeded', function() {
            var origSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = jest.fn(function() {
                throw new DOMException('QuotaExceededError');
            });

            OfflineStorage.saveMatch({
                match_id: 'banner-test',
                match_status: 'in_progress'
            });

            Storage.prototype.setItem = origSetItem;

            // Warning banner should be added to DOM
            var banner = document.getElementById('storage-warning-banner');
            expect(banner).not.toBeNull();
            expect(banner.textContent).toContain('Storage full');
        });
    });

    // =========================================================================
    // P2-1: Read-modify-write race conditions
    // =========================================================================

    describe('P2-1: Read-modify-write on vb_matches', function() {

        test('concurrent saveMatch calls on different matches can clobber', function() {
            // Demonstrates the multi-tab race condition:
            // Two "tabs" read the same vb_matches state, modify different
            // matches, and write back — the second write clobbers the first

            // Setup: two matches exist
            OfflineStorage.saveMatch({ match_id: 'A', opponent_name: 'Team A', match_status: 'in_progress' });
            OfflineStorage.saveMatch({ match_id: 'B', opponent_name: 'Team B', match_status: 'in_progress' });

            // "Tab 1" reads all matches (snapshot)
            var tab1Snapshot = OfflineStorage.getAllMatches();

            // "Tab 2" reads all matches (same snapshot)
            var tab2Snapshot = OfflineStorage.getAllMatches();

            // "Tab 1" updates match A and writes back
            tab1Snapshot['A'].opponent_name = 'Tab1 Update';
            localStorage.setItem('vb_matches', JSON.stringify(tab1Snapshot));

            // "Tab 2" updates match B and writes back — clobbers Tab 1's change
            tab2Snapshot['B'].opponent_name = 'Tab2 Update';
            localStorage.setItem('vb_matches', JSON.stringify(tab2Snapshot));

            // Tab 1's update to match A is LOST
            var result = OfflineStorage.getAllMatches();
            expect(result['A'].opponent_name).toBe('Team A');  // Reverted!
            expect(result['B'].opponent_name).toBe('Tab2 Update');  // Only Tab 2's change survived
        });
    });

    // =========================================================================
    // P3-2: In-progress matches block purge
    // =========================================================================

    describe('P3-2: Pending in-progress matches block purge', function() {

        test('a single pending match prevents all purging', async function() {
            // One abandoned in-progress match with sync_status 'pending'
            OfflineStorage.saveMatch({
                match_id: 'abandoned',
                match_status: 'in_progress',
                sync_status: 'pending'
            });

            // A completed+synced match that should be purgeable
            OfflineStorage.saveMatch({
                match_id: 'ready-to-purge',
                match_status: 'completed',
                sync_status: 'synced'
            });

            var mockDb = {
                from: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: { match_id: 'ready-to-purge' },
                                error: null
                            })
                        })
                    })
                })
            };

            global.isDemoMode = jest.fn().mockReturnValue(false);
            var result = await OfflineStorage.purgeVerifiedLocalStorage(mockDb);

            // Purge is blocked by the pending match
            expect(result.purged).toBe(false);
            expect(result.reason).toBe('pending-matches');

            // The completed match that SHOULD be purged is stuck
            expect(OfflineStorage.getMatch('ready-to-purge')).not.toBeNull();

            delete global.isDemoMode;
        });
    });

    // =========================================================================
    // Sync: syncMatchToSupabase skips zero-stat players
    // =========================================================================

    describe('Sync: Players with zero stats are skipped', function() {

        test('players with all-zero stats are not synced to Supabase', async function() {
            OfflineStorage.saveMatch({
                match_id: 'skip-test',
                team1_name: 'Eclipse',
                opponent_name: 'Valley',
                match_format: 'bracket_play',
                match_status: 'in_progress',
                sync_status: 'pending',
                created_at: '2026-03-01T10:00:00Z'
            });
            OfflineStorage.saveSets('skip-test', {
                1: {
                    team1_score: 25, team2_score: 20, set_status: 'completed',
                    team1_kills: 10, team1_blocks: 3, team1_serves: 2, team1_errors: 5,
                    team2_kills: 8, team2_blocks: 2, team2_serves: 1, team2_errors: 4,
                    attack_errors: 0, block_errors: 0, serve_errors: 0,
                    pass_errors: 0, penalty_errors: 0
                }
            });
            OfflineStorage.saveAllPlayerStats('skip-test', {
                Lexi: { attempts: 10, kills: 5, errors: 2, serves: 3, aces: 1, serve_errors: 0 },
                Anne: { attempts: 0, kills: 0, errors: 0, serves: 0, aces: 0, serve_errors: 0 },
                Cora: { attempts: 5, kills: 2, errors: 1, serves: 0, aces: 0, serve_errors: 0 }
            });

            var upsertedTables = [];
            var db = {
                from: jest.fn(function(table) {
                    upsertedTables.push(table);
                    return {
                        upsert: jest.fn().mockResolvedValue({ error: null })
                    };
                })
            };

            global.isDemoMode = jest.fn().mockReturnValue(false);
            var result = await OfflineStorage.syncMatchToSupabase(db, 'skip-test');

            expect(result).toBe(true);

            // Count player_stats calls — Anne (all zeros) should be skipped
            var playerCalls = upsertedTables.filter(function(t) { return t === 'player_stats'; });
            expect(playerCalls.length).toBe(2); // Lexi + Cora, NOT Anne

            delete global.isDemoMode;
        });
    });

    // =========================================================================
    // Sync: partial failure recovery
    // =========================================================================

    describe('Sync: Partial failure leaves match as pending for retry', function() {

        test('match stays pending when set upsert fails', async function() {
            OfflineStorage.saveMatch({
                match_id: 'partial-fail',
                team1_name: 'Eclipse',
                opponent_name: 'Valley',
                match_format: 'bracket_play',
                match_status: 'in_progress',
                sync_status: 'pending',
                created_at: '2026-03-01T10:00:00Z'
            });
            OfflineStorage.saveSets('partial-fail', {
                1: {
                    team1_score: 25, team2_score: 20, set_status: 'completed',
                    team1_kills: 10, team1_blocks: 0, team1_serves: 0, team1_errors: 0,
                    team2_kills: 0, team2_blocks: 0, team2_serves: 0, team2_errors: 0,
                    attack_errors: 0, block_errors: 0, serve_errors: 0,
                    pass_errors: 0, penalty_errors: 0
                }
            });

            var callCount = 0;
            var db = {
                from: jest.fn(function(table) {
                    callCount++;
                    return {
                        upsert: jest.fn(function() {
                            // Match upsert succeeds, set upsert fails
                            if (callCount === 1) return Promise.resolve({ error: null });
                            return Promise.resolve({ error: { message: 'network timeout' } });
                        })
                    };
                })
            };

            global.isDemoMode = jest.fn().mockReturnValue(false);
            var result = await OfflineStorage.syncMatchToSupabase(db, 'partial-fail');

            // Sync returns false — match stays pending for retry
            expect(result).toBe(false);

            // Match and data still exist in localStorage
            expect(OfflineStorage.getMatch('partial-fail')).not.toBeNull();
            expect(OfflineStorage.getSets('partial-fail')).not.toEqual({});

            delete global.isDemoMode;
        });
    });

    // =========================================================================
    // P2-1: Cross-tab match locking
    // =========================================================================

    describe('P2-1: Match locking prevents cross-tab conflicts', function() {

        test('acquireMatchLock succeeds when no lock exists', function() {
            var result = OfflineStorage.acquireMatchLock('match-1', 'tab-A');
            expect(result).toBe(true);
        });

        test('acquireMatchLock fails when another tab holds the lock', function() {
            OfflineStorage.acquireMatchLock('match-1', 'tab-A');
            var result = OfflineStorage.acquireMatchLock('match-1', 'tab-B');
            expect(result).toBe(false);
        });

        test('acquireMatchLock succeeds when same tab re-acquires', function() {
            OfflineStorage.acquireMatchLock('match-1', 'tab-A');
            var result = OfflineStorage.acquireMatchLock('match-1', 'tab-A');
            expect(result).toBe(true);
        });

        test('acquireMatchLock succeeds when existing lock is stale', function() {
            // Manually set a stale lock (timestamp 20 seconds ago)
            localStorage.setItem('vb_lock_match-1', JSON.stringify({
                tabId: 'tab-A',
                timestamp: Date.now() - 20000
            }));
            var result = OfflineStorage.acquireMatchLock('match-1', 'tab-B');
            expect(result).toBe(true);
        });

        test('releaseMatchLock clears the lock for the owning tab', function() {
            OfflineStorage.acquireMatchLock('match-1', 'tab-A');
            OfflineStorage.releaseMatchLock('match-1', 'tab-A');

            // Now another tab can acquire
            var result = OfflineStorage.acquireMatchLock('match-1', 'tab-B');
            expect(result).toBe(true);
        });

        test('releaseMatchLock does not clear lock owned by another tab', function() {
            OfflineStorage.acquireMatchLock('match-1', 'tab-A');
            OfflineStorage.releaseMatchLock('match-1', 'tab-B'); // Wrong tab

            // Lock is still held by tab-A
            var result = OfflineStorage.acquireMatchLock('match-1', 'tab-B');
            expect(result).toBe(false);
        });

        test('refreshMatchLock updates the timestamp', function() {
            OfflineStorage.acquireMatchLock('match-1', 'tab-A');

            // Wait a tick and refresh
            var beforeRefresh = JSON.parse(localStorage.getItem('vb_lock_match-1'));
            OfflineStorage.refreshMatchLock('match-1', 'tab-A');
            var afterRefresh = JSON.parse(localStorage.getItem('vb_lock_match-1'));

            expect(afterRefresh.timestamp).toBeGreaterThanOrEqual(beforeRefresh.timestamp);
            expect(afterRefresh.tabId).toBe('tab-A');
        });

        test('refreshMatchLock fails if lock was stolen', function() {
            OfflineStorage.acquireMatchLock('match-1', 'tab-A');

            // Another tab steals the lock (simulates stale lock takeover)
            localStorage.setItem('vb_lock_match-1', JSON.stringify({
                tabId: 'tab-B',
                timestamp: Date.now()
            }));

            var result = OfflineStorage.refreshMatchLock('match-1', 'tab-A');
            expect(result).toBe(false);
        });

        test('isMatchLocked returns false when no lock exists', function() {
            expect(OfflineStorage.isMatchLocked('match-1', 'tab-A')).toBe(false);
        });

        test('isMatchLocked returns true when another tab holds fresh lock', function() {
            OfflineStorage.acquireMatchLock('match-1', 'tab-A');
            expect(OfflineStorage.isMatchLocked('match-1', 'tab-B')).toBe(true);
        });

        test('isMatchLocked returns false for own lock', function() {
            OfflineStorage.acquireMatchLock('match-1', 'tab-A');
            expect(OfflineStorage.isMatchLocked('match-1', 'tab-A')).toBe(false);
        });

        test('clearStaleLocks removes only stale locks', function() {
            // Fresh lock
            OfflineStorage.acquireMatchLock('match-fresh', 'tab-A');

            // Stale lock
            localStorage.setItem('vb_lock_match-stale', JSON.stringify({
                tabId: 'tab-B',
                timestamp: Date.now() - 20000
            }));

            var removed = OfflineStorage.clearStaleLocks();
            expect(removed).toBe(1);

            // Fresh lock still exists
            expect(localStorage.getItem('vb_lock_match-fresh')).not.toBeNull();

            // Stale lock removed
            expect(localStorage.getItem('vb_lock_match-stale')).toBeNull();
        });

        test('different matches can be locked by different tabs', function() {
            OfflineStorage.acquireMatchLock('match-1', 'tab-A');
            var result = OfflineStorage.acquireMatchLock('match-2', 'tab-B');
            expect(result).toBe(true);
        });
    });
});
