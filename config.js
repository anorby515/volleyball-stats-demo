// Supabase Configuration
// This file contains the connection details for your Supabase database

var SUPABASE_CONFIG = {
    url: 'https://qctyagqmtkjozvpgzinn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdHlhZ3FtdGtqb3p2cGd6aW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NDY5NjMsImV4cCI6MjA4NjUyMjk2M30.xGwMxYNKVGPYP9uLs509h65VMi3Z8TaJH4ODhcgodJs'
};

// Initialize Supabase client (loaded from CDN in HTML)
var supabaseClient = null;

function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.warn('Supabase library not loaded. App will work in offline mode.');
        return null;
    }
    if (supabaseClient === null) {
        supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('Supabase client initialized from config.js');
    }
    return supabaseClient;
}

// Try to initialize Supabase - returns null if offline/unavailable (not an error)
function tryInitSupabase() {
    try {
        return initSupabase();
    } catch (e) {
        console.warn('Could not initialize Supabase:', e);
        return null;
    }
}

// Check if running in demo mode (read-only, no Supabase writes)
function isDemoMode() {
    return typeof APP_MODE !== 'undefined' && APP_MODE === 'demo';
}

// Register service worker for offline PWA support
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('./sw.js').then(function(reg) {
                console.log('Service worker registered:', reg.scope);
            }).catch(function(err) {
                console.warn('Service worker registration failed:', err);
            });
        });
    }
}
