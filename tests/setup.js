// Jest setup for jsdom environment
// Provides globals that the app code expects

var fs = require('fs');
var path = require('path');

// Mock console.log/warn/error to keep test output clean
// (comment these out when debugging)
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Helper: load a script file into the global scope (simulating a <script> tag).
// Needed because the app uses `var` declarations that are global in the browser
// but would be module-scoped under require() in Node.js.
global.loadScript = function(filename) {
    var filepath = path.resolve(__dirname, '..', filename);
    var code = fs.readFileSync(filepath, 'utf-8');
    // Use indirect eval to run in global scope
    (0, eval)(code);
};
