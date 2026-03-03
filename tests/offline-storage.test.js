/**
 * Tests for offline-storage.js
 *
 * Tests the OfflineStorage IIFE which provides localStorage-based
 * data persistence for matches, sets, and player stats.
 */

// Load the module under test (IIFE assigns to global OfflineStorage)
// Uses loadScript() from setup.js to eval in global scope (simulates <script> tag)
loadScript('offline-storage.js');

describe('OfflineStorage', function() {

    beforeEach(function() {
        localStorage.clear();
        jest.clearAllMocks();
    });

    // =========================================================================
    // UUID Generation
    // =========================================================================

    describe('generateUUID', function() {

        test('returns a string in UUID v4 format', function() {
            var uuid = OfflineStorage.generateUUID();
            expect(uuid).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
            );
        });

        test('returns unique values on successive calls', function() {
            var uuids = {};
            for (var i = 0; i < 100; i++) {
                var uuid = OfflineStorage.generateUUID();
                expect(uuids[uuid]).toBeUndefined();
                uuids[uuid] = true;
            }
        });
    });

    // =========================================================================
    // Match Operations
    // =========================================================================

    describe('Match Operations', function() {

        var sampleMatch = {
            match_id: 'test-match-1',
            team1_name: 'Des Moines Eclipse',
            opponent_name: 'Valley High',
            match_format: 'bracket_play',
            match_status: 'in_progress',
            sync_status: 'pending',
            created_at: '2026-03-01T10:00:00Z'
        };

        test('saveMatch stores match in localStorage', function() {
            OfflineStorage.saveMatch(sampleMatch);
            var raw = JSON.parse(localStorage.getItem('vb_matches'));
            expect(raw['test-match-1']).toBeDefined();
            expect(raw['test-match-1'].opponent_name).toBe('Valley High');
        });

        test('getMatch retrieves a saved match by ID', function() {
            OfflineStorage.saveMatch(sampleMatch);
            var match = OfflineStorage.getMatch('test-match-1');
            expect(match).not.toBeNull();
            expect(match.match_id).toBe('test-match-1');
            expect(match.opponent_name).toBe('Valley High');
        });

        test('getMatch returns null for non-existent match', function() {
            var match = OfflineStorage.getMatch('does-not-exist');
            expect(match).toBeNull();
        });

        test('getAllMatches returns all saved matches', function() {
            OfflineStorage.saveMatch(sampleMatch);
            OfflineStorage.saveMatch({
                match_id: 'test-match-2',
                team1_name: 'Eclipse',
                opponent_name: 'Waukee',
                match_status: 'completed',
                sync_status: 'synced',
                created_at: '2026-03-01T11:00:00Z'
            });
            var all = OfflineStorage.getAllMatches();
            expect(Object.keys(all).length).toBe(2);
            expect(all['test-match-1']).toBeDefined();
            expect(all['test-match-2']).toBeDefined();
        });

        test('getAllMatches returns empty object when no matches exist', function() {
            var all = OfflineStorage.getAllMatches();
            expect(all).toEqual({});
        });

        test('saveMatch overwrites existing match with same ID', function() {
            OfflineStorage.saveMatch(sampleMatch);
            var updated = Object.assign({}, sampleMatch, { opponent_name: 'Ankeny' });
            OfflineStorage.saveMatch(updated);
            var match = OfflineStorage.getMatch('test-match-1');
            expect(match.opponent_name).toBe('Ankeny');
        });

        test('removeMatch deletes match and associated sets and player stats', function() {
            OfflineStorage.saveMatch(sampleMatch);
            OfflineStorage.saveSets('test-match-1', { 1: { team1_score: 25 } });
            OfflineStorage.saveAllPlayerStats('test-match-1', { Lexi: { kills: 5 } });

            OfflineStorage.removeMatch('test-match-1');

            expect(OfflineStorage.getMatch('test-match-1')).toBeNull();
            expect(localStorage.getItem('vb_sets_test-match-1')).toBeNull();
            expect(localStorage.getItem('vb_players_test-match-1')).toBeNull();
        });

        test('removeMatch does not affect other matches', function() {
            OfflineStorage.saveMatch(sampleMatch);
            OfflineStorage.saveMatch({
                match_id: 'test-match-2',
                opponent_name: 'Waukee',
                match_status: 'in_progress',
                created_at: '2026-03-01T11:00:00Z'
            });
            OfflineStorage.removeMatch('test-match-1');
            expect(OfflineStorage.getMatch('test-match-2')).not.toBeNull();
        });
    });

    // =========================================================================
    // Match Queries
    // =========================================================================

    describe('Match Queries', function() {

        beforeEach(function() {
            OfflineStorage.saveMatch({
                match_id: 'ip-1',
                match_status: 'in_progress',
                sync_status: 'pending',
                created_at: '2026-03-01T10:00:00Z'
            });
            OfflineStorage.saveMatch({
                match_id: 'ip-2',
                match_status: 'in_progress',
                sync_status: 'synced',
                created_at: '2026-03-01T12:00:00Z'
            });
            OfflineStorage.saveMatch({
                match_id: 'completed-1',
                match_status: 'completed',
                sync_status: 'pending',
                created_at: '2026-03-01T09:00:00Z'
            });
            OfflineStorage.saveMatch({
                match_id: 'completed-2',
                match_status: 'completed',
                sync_status: 'synced',
                created_at: '2026-03-01T08:00:00Z'
            });
        });

        test('getInProgressMatches returns only in_progress matches', function() {
            var result = OfflineStorage.getInProgressMatches();
            expect(result.length).toBe(2);
            result.forEach(function(m) {
                expect(m.match_status).toBe('in_progress');
            });
        });

        test('getInProgressMatches sorts newest first', function() {
            var result = OfflineStorage.getInProgressMatches();
            expect(result[0].match_id).toBe('ip-2');
            expect(result[1].match_id).toBe('ip-1');
        });

        test('getPendingMatches returns only pending-sync matches', function() {
            var result = OfflineStorage.getPendingMatches();
            expect(result.length).toBe(2);
            result.forEach(function(m) {
                expect(m.sync_status).toBe('pending');
            });
        });

        test('getInProgressMatches returns empty array when none exist', function() {
            localStorage.clear();
            expect(OfflineStorage.getInProgressMatches()).toEqual([]);
        });

        test('getPendingMatches returns empty array when none exist', function() {
            localStorage.clear();
            expect(OfflineStorage.getPendingMatches()).toEqual([]);
        });
    });

    // =========================================================================
    // Set Operations
    // =========================================================================

    describe('Set Operations', function() {

        var matchId = 'set-test-match';

        test('saveSets stores all sets for a match', function() {
            var sets = {
                1: { team1_score: 25, team2_score: 22, set_status: 'completed' },
                2: { team1_score: 15, team2_score: 12, set_status: 'in_progress' }
            };
            OfflineStorage.saveSets(matchId, sets);
            var raw = JSON.parse(localStorage.getItem('vb_sets_' + matchId));
            expect(raw['1'].team1_score).toBe(25);
            expect(raw['2'].team1_score).toBe(15);
        });

        test('getSets retrieves all sets for a match', function() {
            OfflineStorage.saveSets(matchId, {
                1: { team1_score: 25, team2_score: 23 }
            });
            var sets = OfflineStorage.getSets(matchId);
            expect(sets['1'].team1_score).toBe(25);
        });

        test('getSets returns empty object when no sets exist', function() {
            var sets = OfflineStorage.getSets('nonexistent');
            expect(sets).toEqual({});
        });

        test('saveSet updates a specific set without affecting others', function() {
            OfflineStorage.saveSets(matchId, {
                1: { team1_score: 25, team2_score: 20 },
                2: { team1_score: 10, team2_score: 8 }
            });
            OfflineStorage.saveSet(matchId, 2, { team1_score: 25, team2_score: 21 });

            var sets = OfflineStorage.getSets(matchId);
            expect(sets['1'].team1_score).toBe(25);  // unchanged
            expect(sets['2'].team1_score).toBe(25);  // updated
            expect(sets['2'].team2_score).toBe(21);   // updated
        });

        test('getSet retrieves a specific set by number', function() {
            OfflineStorage.saveSets(matchId, {
                1: { team1_score: 25, team2_score: 18 },
                2: { team1_score: 20, team2_score: 25 }
            });
            var set1 = OfflineStorage.getSet(matchId, 1);
            expect(set1.team1_score).toBe(25);
            expect(set1.team2_score).toBe(18);
        });

        test('getSet returns null for non-existent set', function() {
            var set = OfflineStorage.getSet(matchId, 3);
            expect(set).toBeNull();
        });
    });

    // =========================================================================
    // Player Stats Operations
    // =========================================================================

    describe('Player Stats Operations', function() {

        var matchId = 'player-test-match';

        test('saveAllPlayerStats stores all player stats for a match', function() {
            var stats = {
                Lexi: { attempts: 10, kills: 5, errors: 2, serves: 3, aces: 1, serve_errors: 0 },
                Anne: { attempts: 8, kills: 3, errors: 1, serves: 2, aces: 0, serve_errors: 1 }
            };
            OfflineStorage.saveAllPlayerStats(matchId, stats);
            var raw = JSON.parse(localStorage.getItem('vb_players_' + matchId));
            expect(raw.Lexi.kills).toBe(5);
            expect(raw.Anne.attempts).toBe(8);
        });

        test('getAllPlayerStats retrieves all player stats for a match', function() {
            OfflineStorage.saveAllPlayerStats(matchId, {
                Lexi: { kills: 5 }
            });
            var stats = OfflineStorage.getAllPlayerStats(matchId);
            expect(stats.Lexi.kills).toBe(5);
        });

        test('getAllPlayerStats returns empty object when no stats exist', function() {
            var stats = OfflineStorage.getAllPlayerStats('nonexistent');
            expect(stats).toEqual({});
        });

        test('savePlayerStat updates a specific player without affecting others', function() {
            OfflineStorage.saveAllPlayerStats(matchId, {
                Lexi: { attempts: 10, kills: 5, errors: 2 },
                Anne: { attempts: 8, kills: 3, errors: 1 }
            });
            OfflineStorage.savePlayerStat(matchId, 'Lexi', { attempts: 12, kills: 7, errors: 2 });

            var stats = OfflineStorage.getAllPlayerStats(matchId);
            expect(stats.Lexi.kills).toBe(7);   // updated
            expect(stats.Anne.kills).toBe(3);     // unchanged
        });

        test('savePlayerStat adds a new player to existing stats', function() {
            OfflineStorage.saveAllPlayerStats(matchId, {
                Lexi: { kills: 5 }
            });
            OfflineStorage.savePlayerStat(matchId, 'Cora', { kills: 3 });
            var stats = OfflineStorage.getAllPlayerStats(matchId);
            expect(stats.Lexi.kills).toBe(5);
            expect(stats.Cora.kills).toBe(3);
        });
    });

    // =========================================================================
    // Sync Status
    // =========================================================================

    describe('Sync Status', function() {

        test('getLastSyncTime returns null initially', function() {
            expect(OfflineStorage.getLastSyncTime()).toBeNull();
        });

        test('setLastSyncTime stores current time', function() {
            var before = new Date().toISOString();
            OfflineStorage.setLastSyncTime();
            var syncTime = OfflineStorage.getLastSyncTime();
            expect(syncTime).not.toBeNull();
            expect(new Date(syncTime).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
        });

        test('markMatchPending sets sync_status to pending', function() {
            OfflineStorage.saveMatch({
                match_id: 'sync-test',
                match_status: 'in_progress',
                sync_status: 'synced'
            });
            OfflineStorage.markMatchPending('sync-test');
            var match = OfflineStorage.getMatch('sync-test');
            expect(match.sync_status).toBe('pending');
        });

        test('markMatchSynced sets sync_status to synced for in_progress match', function() {
            OfflineStorage.saveMatch({
                match_id: 'sync-test',
                match_status: 'in_progress',
                sync_status: 'pending'
            });
            OfflineStorage.markMatchSynced('sync-test');
            var match = OfflineStorage.getMatch('sync-test');
            expect(match.sync_status).toBe('synced');
        });

        test('markMatchSynced preserves completed matches for purge verification', function() {
            OfflineStorage.saveMatch({
                match_id: 'sync-test',
                match_status: 'completed',
                sync_status: 'pending'
            });
            OfflineStorage.saveSets('sync-test', { 1: { team1_score: 25 } });
            OfflineStorage.saveAllPlayerStats('sync-test', { Lexi: { kills: 5 } });

            OfflineStorage.markMatchSynced('sync-test');

            // Match is preserved with synced status — purge handles deletion
            var match = OfflineStorage.getMatch('sync-test');
            expect(match).not.toBeNull();
            expect(match.sync_status).toBe('synced');
            expect(localStorage.getItem('vb_sets_sync-test')).not.toBeNull();
            expect(localStorage.getItem('vb_players_sync-test')).not.toBeNull();
        });

        test('markMatchPending is no-op for non-existent match', function() {
            OfflineStorage.markMatchPending('nonexistent');
            expect(OfflineStorage.getMatch('nonexistent')).toBeNull();
        });

        test('markMatchSynced is no-op for non-existent match', function() {
            OfflineStorage.markMatchSynced('nonexistent');
            expect(OfflineStorage.getMatch('nonexistent')).toBeNull();
        });
    });

    // =========================================================================
    // Opponent/Tournament Cache
    // =========================================================================

    describe('Cache Operations', function() {

        test('cacheOpponents stores and retrieves opponent list', function() {
            OfflineStorage.cacheOpponents(['Valley', 'Waukee', 'Ankeny']);
            var result = OfflineStorage.getCachedOpponents();
            expect(result).toEqual(['Valley', 'Waukee', 'Ankeny']);
        });

        test('getCachedOpponents returns empty array when no cache exists', function() {
            expect(OfflineStorage.getCachedOpponents()).toEqual([]);
        });

        test('cacheTournaments stores and retrieves tournament list', function() {
            OfflineStorage.cacheTournaments(['State', 'Regionals']);
            var result = OfflineStorage.getCachedTournaments();
            expect(result).toEqual(['State', 'Regionals']);
        });

        test('getCachedTournaments returns empty array when no cache exists', function() {
            expect(OfflineStorage.getCachedTournaments()).toEqual([]);
        });

        test('cacheOpponents overwrites previous cache', function() {
            OfflineStorage.cacheOpponents(['Valley']);
            OfflineStorage.cacheOpponents(['Waukee', 'Ankeny']);
            expect(OfflineStorage.getCachedOpponents()).toEqual(['Waukee', 'Ankeny']);
        });
    });

    // =========================================================================
    // Connectivity
    // =========================================================================

    describe('Connectivity', function() {

        test('isOnline reflects navigator.onLine', function() {
            // jsdom defaults navigator.onLine to true
            expect(OfflineStorage.isOnline()).toBe(true);
        });
    });
});
