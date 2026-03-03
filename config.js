// App Version - single source of truth for the entire application
// See CLAUDE.md for versioning rules (major.minor.patch)
var APP_VERSION = '2.2.0';

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

// Google Sheets Configuration (optional)
// To enable "Push to Sheets", create an OAuth2 Client ID at:
// https://console.cloud.google.com/apis/credentials
// Enable the Google Sheets API, then paste your Client ID below.
var GOOGLE_CONFIG = {
    clientId: '302485377735-i9rsqng3rd1qkeh9gfstvjov5outqtld.apps.googleusercontent.com' // e.g., '123456789-abc.apps.googleusercontent.com'
};

// Check if running in demo mode (read-only, no Supabase writes)
function isDemoMode() {
    return typeof APP_MODE !== 'undefined' && APP_MODE === 'demo';
}

// Show visible indicator when running in demo mode
function showDemoModeIndicator() {
    if (!isDemoMode()) return;
    // Skip if page already has its own demo banner (e.g. index.html)
    if (document.getElementById('demo-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'demo-mode-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:10px 16px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;text-align:center;z-index:9999;font-family:Oswald,sans-serif;font-size:1.1rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;';
    banner.textContent = 'DEMO MODE — Data will not be saved';
    document.body.appendChild(banner);
}

// Run on page load for all pages
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', showDemoModeIndicator);
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
