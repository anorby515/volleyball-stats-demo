/**
 * Tests for offline-storage.js — Supabase sync operations
 *
 * Tests syncMatchToSupabase, syncAllPending, and purgeVerifiedLocalStorage
 * using mocked Supabase client.
 */

// Uses loadScript() from setup.js to eval in global scope (simulates <script> tag)
loadScript('offline-storage.js');

// Helper to create a mock Supabase client
function createMockDb(options) {
    options = options || {};
    var upsertError = options.upsertError || null;
    var selectData = options.selectData || null;
    var selectError = options.selectError || null;
    var deleteError = options.deleteError || null;

    return {
        from: jest.fn().mockReturnValue({
            upsert: jest.fn().mockResolvedValue({ error: upsertError }),
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: selectData,
                        error: selectError
                    })
                })
            }),
            delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: deleteError })
            })
        })
    };
}

// Helper to set up a complete match with sets and player stats
function setupMatchInStorage(matchId, overrides) {
    overrides = overrides || {};
    var match = Object.assign({
        match_id: matchId,
        team1_name: 'Des Moines Eclipse',
        opponent_name: 'Valley High',
        match_format: 'bracket_play',
        match_status: 'in_progress',
        sync_status: 'pending',
        created_at: '2026-03-01T10:00:00Z'
    }, overrides);

    OfflineStorage.saveMatch(match);
    OfflineStorage.saveSets(matchId, {
        1: {
            team1_score: 25, team2_score: 20,
            team1_kills: 10, team1_blocks: 3, team1_serves: 2, team1_errors: 5,
            team2_kills: 8, team2_blocks: 2, team2_serves: 1, team2_errors: 4,
            set_status: 'completed',
            attack_errors: 1, block_errors: 0, serve_errors: 1,
            pass_errors: 2, penalty_errors: 1
        }
    });
    OfflineStorage.saveAllPlayerStats(matchId, {
        Lexi: { attempts: 10, kills: 5, errors: 2, serves: 3, aces: 1, serve_errors: 0 },
        Anne: { attempts: 0, kills: 0, errors: 0, serves: 0, aces: 0, serve_errors: 0 }
    });

    return match;
}

describe('OfflineStorage — Sync Operations', function() {

    beforeEach(function() {
        localStorage.clear();
        jest.clearAllMocks();
        // Ensure isDemoMode is available and returns false
        global.isDemoMode = jest.fn().mockReturnValue(false);
    });

    afterEach(function() {
        delete global.isDemoMode;
    });

    // =========================================================================
    // syncMatchToSupabase
    // =========================================================================

    describe('syncMatchToSupabase', function() {

        test('returns false when db is null', async function() {
            setupMatchInStorage('test-1');
            var result = await OfflineStorage.syncMatchToSupabase(null, 'test-1');
            expect(result).toBe(false);
        });

        test('returns false in demo mode', async function() {
            global.isDemoMode = jest.fn().mockReturnValue(true);
            setupMatchInStorage('test-1');
            var db = createMockDb();
            var result = await OfflineStorage.syncMatchToSupabase(db, 'test-1');
            expect(result).toBe(false);
        });

        test('returns false when match not found in localStorage', async function() {
            var db = createMockDb();
            var result = await OfflineStorage.syncMatchToSupabase(db, 'nonexistent');
            expect(result).toBe(false);
        });

        test('upserts match, sets, and player stats on success', async function() {
            setupMatchInStorage('test-1');
            var db = createMockDb();
            var result = await OfflineStorage.syncMatchToSupabase(db, 'test-1');

            expect(result).toBe(true);
            // Should have called from() for: match, 1 set, 1 player with stats (Anne has 0s, skipped)
            expect(db.from).toHaveBeenCalled();
        });

        test('skips players with zero stats', async function() {
            setupMatchInStorage('test-1');
            var fromCalls = [];
            var db = {
                from: jest.fn(function(table) {
                    fromCalls.push(table);
                    return {
                        upsert: jest.fn().mockResolvedValue({ error: null })
                    };
                })
            };
            await OfflineStorage.syncMatchToSupabase(db, 'test-1');

            // Count player_stats upserts — Anne should be skipped (all zeros)
            var playerStatsCalls = fromCalls.filter(function(t) { return t === 'player_stats'; });
            expect(playerStatsCalls.length).toBe(1); // Only Lexi
        });

        test('returns false when match upsert fails', async function() {
            setupMatchInStorage('test-1');
            var callCount = 0;
            var db = {
                from: jest.fn(function() {
                    callCount++;
                    return {
                        upsert: jest.fn().mockResolvedValue({
                            error: callCount === 1 ? { message: 'DB error' } : null
                        })
                    };
                })
            };
            var result = await OfflineStorage.syncMatchToSupabase(db, 'test-1');
            expect(result).toBe(false);
        });

        test('retries player upsert without serve columns on failure', async function() {
            setupMatchInStorage('test-1');
            var playerUpsertCount = 0;
            var db = {
                from: jest.fn(function(table) {
                    return {
                        upsert: jest.fn(function() {
                            if (table === 'player_stats') {
                                playerUpsertCount++;
                                // First attempt fails, retry succeeds
                                if (playerUpsertCount === 1) {
                                    return Promise.resolve({ error: { message: 'column serves does not exist' } });
                                }
                                return Promise.resolve({ error: null });
                            }
                            return Promise.resolve({ error: null });
                        })
                    };
                })
            };
            var result = await OfflineStorage.syncMatchToSupabase(db, 'test-1');
            expect(result).toBe(true);
            expect(playerUpsertCount).toBe(2); // First attempt + retry
        });

        test('returns false when exception thrown', async function() {
            setupMatchInStorage('test-1');
            var db = {
                from: jest.fn(function() {
                    throw new Error('Network failure');
                })
            };
            var result = await OfflineStorage.syncMatchToSupabase(db, 'test-1');
            expect(result).toBe(false);
        });
    });

    // =========================================================================
    // syncAllPending
    // =========================================================================

    describe('syncAllPending', function() {

        test('returns zeros when db is null', async function() {
            var result = await OfflineStorage.syncAllPending(null);
            expect(result).toEqual({ synced: 0, failed: 0 });
        });

        test('returns zeros in demo mode', async function() {
            global.isDemoMode = jest.fn().mockReturnValue(true);
            var db = createMockDb();
            var result = await OfflineStorage.syncAllPending(db);
            expect(result).toEqual({ synced: 0, failed: 0 });
        });

        test('syncs all pending matches', async function() {
            setupMatchInStorage('pending-1', { sync_status: 'pending' });
            setupMatchInStorage('pending-2', { sync_status: 'pending' });
            OfflineStorage.saveMatch({
                match_id: 'synced-1',
                match_status: 'in_progress',
                sync_status: 'synced'
            });

            var db = createMockDb();
            var result = await OfflineStorage.syncAllPending(db);
            expect(result.synced).toBe(2);
            expect(result.failed).toBe(0);
        });

        test('reports failed syncs', async function() {
            setupMatchInStorage('fail-1', { sync_status: 'pending' });
            var db = {
                from: jest.fn(function() {
                    return {
                        upsert: jest.fn().mockResolvedValue({ error: { message: 'fail' } })
                    };
                })
            };
            var result = await OfflineStorage.syncAllPending(db);
            expect(result.synced).toBe(0);
            expect(result.failed).toBe(1);
        });

        test('sets last sync time on success', async function() {
            setupMatchInStorage('pending-1', { sync_status: 'pending' });
            var db = createMockDb();
            await OfflineStorage.syncAllPending(db);
            expect(OfflineStorage.getLastSyncTime()).not.toBeNull();
        });

        test('does not set last sync time when no matches synced', async function() {
            var db = createMockDb();
            await OfflineStorage.syncAllPending(db);
            expect(OfflineStorage.getLastSyncTime()).toBeNull();
        });
    });

    // =========================================================================
    // purgeVerifiedLocalStorage
    // =========================================================================

    describe('purgeVerifiedLocalStorage', function() {

        test('returns no-db reason when db is null', async function() {
            var result = await OfflineStorage.purgeVerifiedLocalStorage(null);
            expect(result).toEqual({ purged: false, reason: 'no-db' });
        });

        test('returns demo-mode reason in demo mode', async function() {
            global.isDemoMode = jest.fn().mockReturnValue(true);
            var db = createMockDb();
            var result = await OfflineStorage.purgeVerifiedLocalStorage(db);
            expect(result).toEqual({ purged: false, reason: 'demo-mode' });
        });

        test('skips purge when pending matches exist', async function() {
            OfflineStorage.saveMatch({
                match_id: 'pending-1',
                match_status: 'in_progress',
                sync_status: 'pending'
            });
            var db = createMockDb();
            var result = await OfflineStorage.purgeVerifiedLocalStorage(db);
            expect(result.purged).toBe(false);
            expect(result.reason).toBe('pending-matches');
            expect(result.count).toBe(1);
        });

        test('removes verified completed matches and clears caches', async function() {
            OfflineStorage.saveMatch({
                match_id: 'completed-1',
                match_status: 'completed',
                sync_status: 'synced'
            });
            OfflineStorage.saveSets('completed-1', { 1: { team1_score: 25 } });
            OfflineStorage.cacheOpponents(['Valley']);
            OfflineStorage.cacheTournaments(['State']);

            var db = createMockDb({ selectData: { match_id: 'completed-1' } });
            var result = await OfflineStorage.purgeVerifiedLocalStorage(db);

            expect(result.purged).toBe(true);
            expect(result.completedRemoved).toBe(1);
            expect(OfflineStorage.getMatch('completed-1')).toBeNull();
            expect(localStorage.getItem('vb_cached_opponents')).toBeNull();
            expect(localStorage.getItem('vb_cached_tournaments')).toBeNull();
        });

        test('aborts purge when Supabase verification fails', async function() {
            OfflineStorage.saveMatch({
                match_id: 'completed-1',
                match_status: 'completed',
                sync_status: 'synced'
            });

            var db = createMockDb({ selectError: { message: 'not found' }, selectData: null });
            var result = await OfflineStorage.purgeVerifiedLocalStorage(db);

            expect(result.purged).toBe(false);
            expect(result.reason).toBe('verification-failed');
            // Match should still exist locally since purge was aborted
            expect(OfflineStorage.getMatch('completed-1')).not.toBeNull();
        });

        test('purges successfully when no completed matches exist', async function() {
            OfflineStorage.saveMatch({
                match_id: 'ip-1',
                match_status: 'in_progress',
                sync_status: 'synced'
            });
            OfflineStorage.cacheOpponents(['Valley']);

            var db = createMockDb();
            var result = await OfflineStorage.purgeVerifiedLocalStorage(db);

            expect(result.purged).toBe(true);
            expect(result.completedRemoved).toBe(0);
            // Caches still cleared
            expect(localStorage.getItem('vb_cached_opponents')).toBeNull();
        });
    });
});
