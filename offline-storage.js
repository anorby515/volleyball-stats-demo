// ============================================================================
// Offline Storage Layer
// ============================================================================
// All match data is stored in localStorage first, then synced to Supabase.
// This file provides the API for reading/writing local data and syncing.
//
// localStorage keys:
//   vb_matches            → { matchId: { match data + sync_status } }
//   vb_sets_{matchId}     → { setNumber: { set data } }
//   vb_players_{matchId}  → { playerName: { attempts, kills, errors } }
//   vb_last_sync          → ISO timestamp of last successful sync
//   vb_cached_opponents   → ["name1", "name2"]
//   vb_cached_tournaments → ["name1", "name2"]
// ============================================================================

var OfflineStorage = (function() {

    // --- UUID Generation ---

    function generateUUID() {
        // crypto.randomUUID() is available in all modern browsers (Chrome 92+, Safari 15.4+, Firefox 95+)
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        // Fallback for older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // --- Generic localStorage helpers ---

    function getJSON(key) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Error reading localStorage key:', key, e);
            return null;
        }
    }

    function setJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error writing localStorage key:', key, e);
        }
    }

    // --- Match Operations ---

    function saveMatch(match) {
        var matches = getJSON('vb_matches') || {};
        matches[match.match_id] = match;
        setJSON('vb_matches', matches);
    }

    function getMatch(matchId) {
        var matches = getJSON('vb_matches') || {};
        return matches[matchId] || null;
    }

    function getAllMatches() {
        return getJSON('vb_matches') || {};
    }

    function removeMatch(matchId) {
        var matches = getJSON('vb_matches') || {};
        delete matches[matchId];
        setJSON('vb_matches', matches);

        // Also remove associated sets and player stats
        localStorage.removeItem('vb_sets_' + matchId);
        localStorage.removeItem('vb_players_' + matchId);
    }

    function getInProgressMatches() {
        var matches = getAllMatches();
        var result = [];
        Object.keys(matches).forEach(function(id) {
            if (matches[id].match_status === 'in_progress') {
                result.push(matches[id]);
            }
        });
        // Sort by created_at descending
        result.sort(function(a, b) {
            return new Date(b.created_at) - new Date(a.created_at);
        });
        return result;
    }

    function getPendingMatches() {
        var matches = getAllMatches();
        var result = [];
        Object.keys(matches).forEach(function(id) {
            if (matches[id].sync_status === 'pending') {
                result.push(matches[id]);
            }
        });
        return result;
    }

    // --- Set Operations ---

    function saveSets(matchId, sets) {
        setJSON('vb_sets_' + matchId, sets);
    }

    function getSets(matchId) {
        return getJSON('vb_sets_' + matchId) || {};
    }

    function saveSet(matchId, setNumber, setData) {
        var sets = getSets(matchId);
        sets[setNumber] = setData;
        saveSets(matchId, sets);
    }

    function getSet(matchId, setNumber) {
        var sets = getSets(matchId);
        return sets[setNumber] || null;
    }

    // --- Player Stats Operations ---

    function saveAllPlayerStats(matchId, stats) {
        setJSON('vb_players_' + matchId, stats);
    }

    function getAllPlayerStats(matchId) {
        return getJSON('vb_players_' + matchId) || {};
    }

    function savePlayerStat(matchId, playerName, stat) {
        var stats = getAllPlayerStats(matchId);
        stats[playerName] = stat;
        saveAllPlayerStats(matchId, stats);
    }

    // --- Sync Status ---

    function getLastSyncTime() {
        return localStorage.getItem('vb_last_sync') || null;
    }

    function setLastSyncTime() {
        localStorage.setItem('vb_last_sync', new Date().toISOString());
    }

    function markMatchSynced(matchId) {
        var match = getMatch(matchId);
        if (match) {
            match.sync_status = 'synced';
            saveMatch(match);

            // If the match is both completed and synced, remove local copy
            if (match.match_status === 'completed') {
                removeMatch(matchId);
            }
        }
    }

    function markMatchPending(matchId) {
        var match = getMatch(matchId);
        if (match) {
            match.sync_status = 'pending';
            saveMatch(match);
        }
    }

    // --- Opponent/Tournament Cache ---

    function cacheOpponents(opponents) {
        setJSON('vb_cached_opponents', opponents);
    }

    function getCachedOpponents() {
        return getJSON('vb_cached_opponents') || [];
    }

    function cacheTournaments(tournaments) {
        setJSON('vb_cached_tournaments', tournaments);
    }

    function getCachedTournaments() {
        return getJSON('vb_cached_tournaments') || [];
    }

    // --- Sync to Supabase ---

    async function syncMatchToSupabase(db, matchId) {
        var match = getMatch(matchId);
        if (!match) return false;

        try {
            // 1. Upsert match
            var { error: matchError } = await db
                .from('matches')
                .upsert({
                    match_id: match.match_id,
                    tournament: match.tournament || null,
                    team1_name: match.team1_name,
                    opponent_name: match.opponent_name,
                    match_status: match.match_status,
                    created_at: match.created_at
                }, {
                    onConflict: 'match_id'
                });

            if (matchError) {
                console.error('Sync match error:', matchError);
                return false;
            }

            // 2. Upsert all sets
            var sets = getSets(matchId);
            var setNumbers = Object.keys(sets);
            for (var i = 0; i < setNumbers.length; i++) {
                var setNum = setNumbers[i];
                var setData = sets[setNum];
                var { error: setError } = await db
                    .from('set_scores')
                    .upsert({
                        match_id: matchId,
                        set_number: parseInt(setNum),
                        set_status: setData.set_status || 'in_progress',
                        team1_score: setData.team1_score || 0,
                        team1_kills: setData.team1_kills || 0,
                        team1_blocks: setData.team1_blocks || 0,
                        team1_serves: setData.team1_serves || 0,
                        team1_errors: setData.team1_errors || 0,
                        team2_score: setData.team2_score || 0,
                        team2_kills: setData.team2_kills || 0,
                        team2_blocks: setData.team2_blocks || 0,
                        team2_serves: setData.team2_serves || 0,
                        team2_errors: setData.team2_errors || 0
                    }, {
                        onConflict: 'match_id,set_number'
                    });

                if (setError) {
                    console.error('Sync set error:', setError);
                    return false;
                }
            }

            // 3. Upsert player stats
            var playerStats = getAllPlayerStats(matchId);
            var playerNames = Object.keys(playerStats);
            for (var j = 0; j < playerNames.length; j++) {
                var name = playerNames[j];
                var stats = playerStats[name];
                if (stats.attempts === 0 && stats.kills === 0 && stats.errors === 0) {
                    continue; // Skip players with no data
                }
                var { error: playerError } = await db
                    .from('player_stats')
                    .upsert({
                        match_id: matchId,
                        player_name: name,
                        team_name: 'Des Moines Eclipse',
                        attempts: stats.attempts,
                        kills: stats.kills,
                        errors: stats.errors
                    }, {
                        onConflict: 'match_id,player_name'
                    });

                if (playerError) {
                    console.error('Sync player stats error:', playerError);
                    return false;
                }
            }

            return true;

        } catch (err) {
            console.error('Sync exception:', err);
            return false;
        }
    }

    async function syncAllPending(db) {
        if (!db) return { synced: 0, failed: 0 };

        var pending = getPendingMatches();
        var synced = 0;
        var failed = 0;

        for (var i = 0; i < pending.length; i++) {
            var match = pending[i];
            var success = await syncMatchToSupabase(db, match.match_id);
            if (success) {
                markMatchSynced(match.match_id);
                synced++;
            } else {
                failed++;
            }
        }

        if (synced > 0) {
            setLastSyncTime();
        }

        return { synced: synced, failed: failed };
    }

    // --- Connectivity ---

    function isOnline() {
        return navigator.onLine;
    }

    // --- Public API ---

    return {
        generateUUID: generateUUID,

        // Match operations
        saveMatch: saveMatch,
        getMatch: getMatch,
        getAllMatches: getAllMatches,
        removeMatch: removeMatch,
        getInProgressMatches: getInProgressMatches,
        getPendingMatches: getPendingMatches,

        // Set operations
        saveSets: saveSets,
        getSets: getSets,
        saveSet: saveSet,
        getSet: getSet,

        // Player stats operations
        saveAllPlayerStats: saveAllPlayerStats,
        getAllPlayerStats: getAllPlayerStats,
        savePlayerStat: savePlayerStat,

        // Sync
        getLastSyncTime: getLastSyncTime,
        setLastSyncTime: setLastSyncTime,
        markMatchSynced: markMatchSynced,
        markMatchPending: markMatchPending,
        syncMatchToSupabase: syncMatchToSupabase,
        syncAllPending: syncAllPending,

        // Cache
        cacheOpponents: cacheOpponents,
        getCachedOpponents: getCachedOpponents,
        cacheTournaments: cacheTournaments,
        getCachedTournaments: getCachedTournaments,

        // Connectivity
        isOnline: isOnline
    };

})();
