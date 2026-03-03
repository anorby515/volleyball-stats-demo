/**
 * Tests for config.js
 *
 * Tests the global configuration variables and functions
 * exposed by config.js.
 */

// Set up APP_MODE before loading config.js (simulating production mode)
global.APP_MODE = 'production';

// Uses loadScript() from setup.js to eval in global scope (simulates <script> tag)
// config.js expects window.supabase to potentially exist
// but we don't load the actual Supabase library in tests
loadScript('config.js');

describe('config.js', function() {

    beforeEach(function() {
        jest.clearAllMocks();
    });

    // =========================================================================
    // APP_VERSION
    // =========================================================================

    describe('APP_VERSION', function() {

        test('is defined', function() {
            expect(global.APP_VERSION).toBeDefined();
        });

        test('is a string', function() {
            expect(typeof global.APP_VERSION).toBe('string');
        });

        test('matches semver pattern', function() {
            expect(global.APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
        });

        test('is currently 2.2.0', function() {
            expect(global.APP_VERSION).toBe('2.2.0');
        });
    });

    // =========================================================================
    // SUPABASE_CONFIG
    // =========================================================================

    describe('SUPABASE_CONFIG', function() {

        test('is defined', function() {
            expect(global.SUPABASE_CONFIG).toBeDefined();
        });

        test('has url property', function() {
            expect(global.SUPABASE_CONFIG.url).toBeDefined();
            expect(typeof global.SUPABASE_CONFIG.url).toBe('string');
        });

        test('url starts with https://', function() {
            expect(global.SUPABASE_CONFIG.url).toMatch(/^https:\/\//);
        });

        test('has anonKey property', function() {
            expect(global.SUPABASE_CONFIG.anonKey).toBeDefined();
            expect(typeof global.SUPABASE_CONFIG.anonKey).toBe('string');
            expect(global.SUPABASE_CONFIG.anonKey.length).toBeGreaterThan(0);
        });
    });

    // =========================================================================
    // GOOGLE_CONFIG
    // =========================================================================

    describe('GOOGLE_CONFIG', function() {

        test('is defined with clientId', function() {
            expect(global.GOOGLE_CONFIG).toBeDefined();
            expect(global.GOOGLE_CONFIG.clientId).toBeDefined();
        });
    });

    // =========================================================================
    // isDemoMode
    // =========================================================================

    describe('isDemoMode', function() {

        test('returns false when APP_MODE is production', function() {
            global.APP_MODE = 'production';
            expect(isDemoMode()).toBe(false);
        });

        test('returns true when APP_MODE is demo', function() {
            global.APP_MODE = 'demo';
            expect(isDemoMode()).toBe(true);
        });

        test('returns false when APP_MODE is undefined', function() {
            var saved = global.APP_MODE;
            delete global.APP_MODE;
            expect(isDemoMode()).toBe(false);
            global.APP_MODE = saved;
        });
    });

    // =========================================================================
    // tryInitSupabase
    // =========================================================================

    describe('tryInitSupabase', function() {

        test('returns null when supabase library is not loaded', function() {
            // window.supabase is not defined in test env
            var result = tryInitSupabase();
            expect(result).toBeNull();
        });

        test('does not throw even when supabase is unavailable', function() {
            expect(function() {
                tryInitSupabase();
            }).not.toThrow();
        });
    });

    // =========================================================================
    // initSupabase
    // =========================================================================

    describe('initSupabase', function() {

        test('returns null when window.supabase is undefined', function() {
            var result = initSupabase();
            expect(result).toBeNull();
        });

        test('creates client when supabase library is available', function() {
            var mockClient = { from: jest.fn() };
            window.supabase = {
                createClient: jest.fn().mockReturnValue(mockClient)
            };

            // Reset the singleton
            global.supabaseClient = null;

            var result = initSupabase();
            expect(result).toBe(mockClient);
            expect(window.supabase.createClient).toHaveBeenCalledWith(
                global.SUPABASE_CONFIG.url,
                global.SUPABASE_CONFIG.anonKey
            );

            // Cleanup
            delete window.supabase;
            global.supabaseClient = null;
        });

        test('returns cached client on second call', function() {
            var mockClient = { from: jest.fn() };
            window.supabase = {
                createClient: jest.fn().mockReturnValue(mockClient)
            };

            global.supabaseClient = null;

            var first = initSupabase();
            var second = initSupabase();

            expect(first).toBe(second);
            expect(window.supabase.createClient).toHaveBeenCalledTimes(1);

            delete window.supabase;
            global.supabaseClient = null;
        });
    });
});
