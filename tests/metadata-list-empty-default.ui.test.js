'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

test('metadata list stays empty until a filter is applied', function() {
    const appJs = read('public/app.js');

    assert.match(appJs, /function hasActiveMetadataFilter\(\)/);
    assert.match(appJs, /if \(!hasActiveMetadataFilter\(\)\)/);
    assert.match(appJs, /Use os filtros acima para ver os itens cadastrados\./);
});
