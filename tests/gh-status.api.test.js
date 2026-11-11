'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

test('server exposes a gh-status route backed by gh auth status', function() {
    const serverCode = read('server.js');

    assert.match(serverCode, /app\.get\('\/api\/gh-status'/);
    assert.match(serverCode, /runGh\(\['auth', 'status'\]\)/);
    assert.match(serverCode, /parseGhAuthStatus/);
});

test('gh-status route never throws on a missing or unauthenticated gh', function() {
    const serverCode = read('server.js');
    const routeMatch = serverCode.match(/app\.get\('\/api\/gh-status'[\s\S]*?\n\}\);/);

    assert.ok(routeMatch, 'gh-status route body not found');
    assert.match(routeMatch[0], /code === 'ENOENT'/);
    assert.match(routeMatch[0], /res\.json\(/);
});
