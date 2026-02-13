var SUPABASE_CONFIG = { url: '', anonKey: '' };

function initSupabase() { return null; }
function tryInitSupabase() { return null; }

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('./sw.js').catch(function() {});
        });
    }
}
