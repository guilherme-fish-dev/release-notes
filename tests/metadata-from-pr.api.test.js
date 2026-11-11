'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

test('server exposes metadata-from-pr route and uses gh via execFile without a shell', function() {
    const serverCode = read('server.js');

    assert.match(serverCode, /app\.post\('\/api\/metadata-from-pr'/);
    assert.match(serverCode, /function runGh\(args\) \{\s*\n\s*return execFileAsync\('gh', args/);
    assert.match(serverCode, /timeout: GH_TIMEOUT_MS/);
    assert.match(serverCode, /GH_TIMEOUT_MS = 30000/);
});

test('server resolves PR files with gh api --paginate to cover PRs over 100 files', function() {
    const serverCode = read('server.js');

    assert.match(serverCode, /pulls\/\$\{ref\.number\}\/files/);
    assert.match(serverCode, /'--paginate'/);
});

test('server returns a friendly 424 error when gh is missing or unauthenticated', function() {
    const serverCode = read('server.js');

    assert.match(serverCode, /gh auth login/);
    assert.match(serverCode, /err\.status = 424/);
});

test('server flags a PR already linked to an existing metadata', function() {
    const serverCode = read('server.js');

    assert.match(serverCode, /SELECT metadata_id FROM pull_requests WHERE url = \?/);
    assert.match(serverCode, /already_imported/);
});
