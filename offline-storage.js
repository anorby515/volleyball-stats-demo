// ============================================================================
// Offline Storage Layer
// ============================================================================
// All match data is stored in localStorage first, then synced to Supabase.
// This file provides the API for reading/writing local data and syncing.
//
// localStorage keys:
//   vb_matches            → { matchId: { match data + sync_status } }
//   vb_sets_{matchId}     → { setNumber: { set data } }
//   vb_players_{matchId}  → { playerName: { attempts, kills, errors, serves, aces, serve_errors } }
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
            return true;
        } catch (e) {
            console.error('Error writing localStorage key:', key, e);
            showStorageWarning();
            return false;
        }
    }

    var storageWarningShown = false;

    function showStorageWarning() {
        if (storageWarningShown) return;
        storageWarningShown = true;
        // Show a non-blocking warning — avoid alert() during rapid stat tracking
        var banner = document.createElement('div');
        banner.id = 'storage-warning-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:12px;background:#dc3545;color:#fff;text-align:center;z-index:9999;font-family:sans-serif;font-size:14px;';
        banner.textContent = 'Storage full — data may not be saving. Please sync or clear old matches.';
        document.body.appendChild(banner);
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
            // Local data is NOT removed here — purgeVerifiedLocalStorage()
            // handles deletion after verifying the data exists in Supabase.
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
        console.log('[SYNC] Starting sync for match:', matchId);

        if (!db) {
            console.error('[SYNC] FAILED: db is null/undefined');
            return false;
        }

        if (typeof isDemoMode === 'function' && isDemoMode()) {
            console.log('[SYNC] SKIPPED: Demo mode');
            return false;
        }

        var match = getMatch(matchId);
        if (!match) {
            console.error('[SYNC] FAILED: Match not found in localStorage for id:', matchId);
            return false;
        }

        console.log('[SYNC] Match data from localStorage:', JSON.stringify(match));

        try {
            // 1. Upsert match
            var matchPayload = {
                match_id: match.match_id,
                tournament: match.tournament || null,
                team1_name: match.team1_name,
                opponent_name: match.opponent_name,
                match_format: match.match_format || 'bracket_play',
                scoring_format: match.scoring_format || null,
                match_status: match.match_status,
                created_at: match.created_at
            };
            console.log('[SYNC] Step 1: Upserting match:', JSON.stringify(matchPayload));

            var matchResult = await db
                .from('matches')
                .upsert(matchPayload, {
                    onConflict: 'match_id'
                });

            console.log('[SYNC] Step 1 result:', JSON.stringify(matchResult));

            if (matchResult.error) {
                console.error('[SYNC] FAILED at Step 1 (match upsert):', matchResult.error.message, matchResult.error);
                return false;
            }

            console.log('[SYNC] Step 1 SUCCESS: Match upserted');

            // 2. Upsert all sets
            var sets = getSets(matchId);
            var setNumbers = Object.keys(sets);
            console.log('[SYNC] Step 2: Upserting', setNumbers.length, 'sets:', setNumbers);

            for (var i = 0; i < setNumbers.length; i++) {
                var setNum = setNumbers[i];
                var setData = sets[setNum];
                var setPayload = {
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
                    team2_errors: setData.team2_errors || 0,
                    attack_errors: setData.attack_errors || 0,
                    block_errors: setData.block_errors || 0,
                    serve_errors: setData.serve_errors || 0,
                    pass_errors: setData.pass_errors || 0,
                    penalty_errors: setData.penalty_errors || 0
                };
                console.log('[SYNC] Step 2: Upserting set', setNum, ':', JSON.stringify(setPayload));

                var setResult = await db
                    .from('set_scores')
                    .upsert(setPayload, {
                        onConflict: 'match_id,set_number'
                    });

                console.log('[SYNC] Step 2 set', setNum, 'result:', JSON.stringify(setResult));

                if (setResult.error) {
                    console.error('[SYNC] FAILED at Step 2 (set ' + setNum + ' upsert):', setResult.error.message, setResult.error);
                    return false;
                }
            }

            console.log('[SYNC] Step 2 SUCCESS: All sets upserted');

            // 3. Upsert player stats
            var playerStats = getAllPlayerStats(matchId);
            var playerNames = Object.keys(playerStats);
            console.log('[SYNC] Step 3: Upserting player stats for', playerNames.length, 'players');

            for (var j = 0; j < playerNames.length; j++) {
                var name = playerNames[j];
                var stats = playerStats[name];
                if (stats.attempts === 0 && stats.kills === 0 && stats.errors === 0 && (stats.serves || 0) === 0) {
                    console.log('[SYNC] Step 3: Skipping player', name, '(no data)');
                    continue;
                }
                var playerPayload = {
                    match_id: matchId,
                    player_name: name,
                    team_name: 'Des Moines Eclipse',
                    attempts: stats.attempts,
                    kills: stats.kills,
                    errors: stats.errors,
                    serves: stats.serves || 0,
                    aces: stats.aces || 0,
                    serve_errors: stats.serve_errors || 0
                };
                console.log('[SYNC] Step 3: Upserting player', name, ':', JSON.stringify(playerPayload));

                var playerResult = await db
                    .from('player_stats')
                    .upsert(playerPayload, {
                        onConflict: 'match_id,player_name'
                    });

                console.log('[SYNC] Step 3 player', name, 'result:', JSON.stringify(playerResult));

                if (playerResult.error) {
                    // If serve columns don't exist yet, retry without them
                    console.warn('[SYNC] Step 3: Retrying without serve columns for', name);
                    var fallbackPayload = {
                        match_id: matchId,
                        player_name: name,
                        team_name: 'Des Moines Eclipse',
                        attempts: stats.attempts,
                        kills: stats.kills,
                        errors: stats.errors
                    };
                    var retryResult = await db
                        .from('player_stats')
                        .upsert(fallbackPayload, {
                            onConflict: 'match_id,player_name'
                        });
                    if (retryResult.error) {
                        console.error('[SYNC] FAILED at Step 3 (player ' + name + ' upsert):', retryResult.error.message, retryResult.error);
                        return false;
                    }
                }
            }

            console.log('[SYNC] SUCCESS: All data synced for match', matchId);
            return true;

        } catch (err) {
            console.error('[SYNC] EXCEPTION:', err.message, err);
            return false;
        }
    }

    async function syncAllPending(db) {
        console.log('[SYNC-ALL] Starting syncAllPending, db:', db ? 'initialized' : 'NULL');

        if (!db) return { synced: 0, failed: 0 };
        if (typeof isDemoMode === 'function' && isDemoMode()) {
            console.log('[SYNC-ALL] Skipped: demo mode');
            return { synced: 0, failed: 0 };
        }

        var pending = getPendingMatches();
        console.log('[SYNC-ALL] Found', pending.length, 'pending matches:', pending.map(function(m) { return m.match_id + ' (' + m.match_status + ')'; }));
        var synced = 0;
        var failed = 0;

        for (var i = 0; i < pending.length; i++) {
            var match = pending[i];
            console.log('[SYNC-ALL] Syncing match', (i + 1), 'of', pending.length, ':', match.match_id);
            var success = await syncMatchToSupabase(db, match.match_id);
            if (success) {
                markMatchSynced(match.match_id);
                synced++;
                console.log('[SYNC-ALL] Match', match.match_id, 'synced and marked');
            } else {
                failed++;
                console.warn('[SYNC-ALL] Match', match.match_id, 'FAILED to sync');
            }
        }

        if (synced > 0) {
            setLastSyncTime();
        }

        console.log('[SYNC-ALL] Complete:', synced, 'synced,', failed, 'failed');
        return { synced: synced, failed: failed };
    }

    // --- Purge Verified Local Storage ---

    async function purgeVerifiedLocalStorage(db) {
        if (!db) return { purged: false, reason: 'no-db' };
        if (typeof isDemoMode === 'function' && isDemoMode()) {
            return { purged: false, reason: 'demo-mode' };
        }

        // Don't purge if there are still pending matches
        var pending = getPendingMatches();
        if (pending.length > 0) {
            return { purged: false, reason: 'pending-matches', count: pending.length };
        }

        var allMatches = getAllMatches();
        var matchIds = Object.keys(allMatches);

        // Find any completed matches still lingering locally
        // (edge case — markMatchSynced should have removed these, but verify)
        var completedToVerify = [];
        matchIds.forEach(function(id) {
            if (allMatches[id].match_status === 'completed') {
                completedToVerify.push(id);
            }
        });

        // Verify each completed match exists in Supabase before removing locally
        for (var i = 0; i < completedToVerify.length; i++) {
            var matchId = completedToVerify[i];
            try {
                var result = await db
                    .from('matches')
                    .select('match_id')
                    .eq('match_id', matchId)
                    .single();

                if (result.error || !result.data) {
                    // Completed match not found in Supabase — abort entire purge
                    console.warn('Purge aborted: completed match not verified in Supabase:', matchId);
                    return { purged: false, reason: 'verification-failed', matchId: matchId };
                }

                // Verified in Supabase — safe to remove locally
                removeMatch(matchId);
                console.log('Purge: removed verified completed match:', matchId);
            } catch (err) {
                console.error('Purge verification error:', err);
                return { purged: false, reason: 'verification-error', error: err.message };
            }
        }

        // All completed matches verified and removed. Clear caches.
        localStorage.removeItem('vb_cached_opponents');
        localStorage.removeItem('vb_cached_tournaments');

        console.log('Local storage purge complete. Removed caches and ' + completedToVerify.length + ' completed match(es).');
        return { purged: true, completedRemoved: completedToVerify.length };
    }

    // --- Connectivity ---

    function isOnline() {
        return navigator.onLine;
    }

    // --- Match Locking (cross-tab safety) ---
    // Prevents two tabs from editing the same match simultaneously.
    // Uses localStorage keys: vb_lock_{matchId} = { tabId, timestamp }
    // A lock is considered stale after LOCK_TIMEOUT_MS (default 15s).
    // The owning tab refreshes its lock via a heartbeat interval.

    var LOCK_TIMEOUT_MS = 15000;

    function acquireMatchLock(matchId, tabId) {
        var lockKey = 'vb_lock_' + matchId;
        var existing = getJSON(lockKey);

        if (existing && existing.tabId !== tabId) {
            var age = Date.now() - existing.timestamp;
            if (age < LOCK_TIMEOUT_MS) {
                // Lock is held by another active tab
                return false;
            }
            // Lock is stale — previous tab crashed or navigated away
        }

        setJSON(lockKey, { tabId: tabId, timestamp: Date.now() });
        return true;
    }

    function refreshMatchLock(matchId, tabId) {
        var lockKey = 'vb_lock_' + matchId;
        var existing = getJSON(lockKey);
        // Only refresh if we still own the lock
        if (existing && existing.tabId === tabId) {
            setJSON(lockKey, { tabId: tabId, timestamp: Date.now() });
            return true;
        }
        return false;
    }

    function releaseMatchLock(matchId, tabId) {
        var lockKey = 'vb_lock_' + matchId;
        var existing = getJSON(lockKey);
        // Only release if we own the lock
        if (existing && existing.tabId === tabId) {
            localStorage.removeItem(lockKey);
        }
    }

    function isMatchLocked(matchId, tabId) {
        var lockKey = 'vb_lock_' + matchId;
        var existing = getJSON(lockKey);
        if (!existing) return false;
        if (existing.tabId === tabId) return false; // Our own lock
        var age = Date.now() - existing.timestamp;
        return age < LOCK_TIMEOUT_MS;
    }

    function clearStaleLocks() {
        var removed = 0;
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.indexOf('vb_lock_') === 0) {
                var lock = getJSON(key);
                if (lock && (Date.now() - lock.timestamp) >= LOCK_TIMEOUT_MS) {
                    localStorage.removeItem(key);
                    removed++;
                    i--; // Adjust index since we removed an item
                }
            }
        }
        return removed;
    }

    // --- HTML Escaping ---

    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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
        purgeVerifiedLocalStorage: purgeVerifiedLocalStorage,

        // Cache
        cacheOpponents: cacheOpponents,
        getCachedOpponents: getCachedOpponents,
        cacheTournaments: cacheTournaments,
        getCachedTournaments: getCachedTournaments,

        // Connectivity
        isOnline: isOnline,

        // Match locking
        acquireMatchLock: acquireMatchLock,
        refreshMatchLock: refreshMatchLock,
        releaseMatchLock: releaseMatchLock,
        isMatchLocked: isMatchLocked,
        clearStaleLocks: clearStaleLocks,

        // Utilities
        escapeHTML: escapeHTML
    };

})();
