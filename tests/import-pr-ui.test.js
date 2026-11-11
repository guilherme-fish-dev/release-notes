'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

test('form has a PR reference field and a search button next to the commit import block', function() {
    assert.match(indexHtml, /id="f-pr-ref"/);
    assert.match(indexHtml, /id="f-pr-repo-select"/);
    assert.match(indexHtml, /id="btn-load-pr"/);
    assert.match(indexHtml, /id="pr-info"/);
});

test('app wires the PR button to call /api/metadata-from-pr', function() {
    assert.match(appJs, /async function loadMetadataFromPr\(\)/);
    assert.match(appJs, /el\.btnLoadPr\.addEventListener\('click'/);
    assert.match(appJs, /api\.post\('\/api\/metadata-from-pr'/);
});

test('bare PR numbers require a saved repo selection before searching', function() {
    assert.match(appJs, /const isBareNumber = \/\^\\d\+\$\/\.test\(prRef\)/);
    assert.match(appJs, /Selecione o repositorio salvo para buscar por numero\./);
});

test('PR import fills metadata rows, PR row, ticket and description from the suggested payload', function() {
    assert.match(appJs, /changeType: item\.change_type/);
    assert.match(appJs, /el\.bulkPrRows\.appendChild\(createBulkPrRow\(prLabel, payload\.pr\.url\)\)/);
    assert.match(appJs, /el\.fTicket\.value = payload\.suggested\.ticket/);
    assert.match(appJs, /el\.fDescription\.value = payload\.suggested\.description/);
});

test('PR import surfaces not-merged, ignored-files and already-imported warnings', function() {
    assert.match(appJs, /PR ainda nao mergeada\./);
    assert.match(appJs, /arquivo\(s\) fora de force-app\/ ignorado\(s\)\./);
    assert.match(appJs, /esta PR ja esta vinculada a um metadata cadastrado\./);
});

test('PR import surfaces extra ticket candidates beyond the first match', function() {
    assert.match(appJs, /payload\.suggested && payload\.suggested\.ticket_candidates/);
    assert.match(appJs, /Outros tickets encontrados:/);
});
