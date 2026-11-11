'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

test('server exposes a gh-login route that spawns gh auth login --web in the background', function() {
    const serverCode = read('server.js');

    assert.match(serverCode, /app\.post\('\/api\/gh-login'/);
    assert.match(serverCode, /spawn\('gh', \['auth', 'login'/);
    assert.match(serverCode, /'--web'/);
});

test('gh-login route avoids starting two concurrent login attempts', function() {
    const serverCode = read('server.js');
    assert.match(serverCode, /if \(ghLoginState\)/);
    assert.match(serverCode, /status: 'in_progress'/);
});

test('frontend only shows the Conectar button while gh is disconnected and polls status after login', function() {
    const indexHtml = read('public/index.html');
    const appJs = read('public/app.js');

    assert.match(indexHtml, /id="btn-gh-login"/);
    assert.match(appJs, /el\.btnGhLogin\.hidden = connected/);
    assert.match(appJs, /function startGhLogin\(\)/);
    assert.match(appJs, /function startGhLoginPolling\(\)/);
    assert.match(appJs, /api\.post\('\/api\/gh-login', \{\}\)/);
});
