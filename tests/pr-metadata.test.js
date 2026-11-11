'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    parsePrReference,
    derivePrLabelFromBranch,
    extractTicketInfo,
    extractWhatSection,
    buildPrMetadataItems,
    parseGhFilesJsonLines,
    normalizeGhPrView,
    parseGhAuthStatus,
    parseGhLoginCode
} = require('../lib/pr-metadata');

test('parsePrReference extracts owner/repo/number from a PR url', function() {
    const result = parsePrReference('https://github.com/quintoandar/salesforce/pull/8978', '');
    assert.deepEqual(result, { owner: 'quintoandar', repo: 'salesforce', number: 8978 });
});

test('parsePrReference uses the saved repo when given a bare number', function() {
    const result = parsePrReference('8978', 'quintoandar/salesforce');
    assert.deepEqual(result, { owner: 'quintoandar', repo: 'salesforce', number: 8978 });
});

test('parsePrReference returns null for a bare number without a saved repo', function() {
    assert.equal(parsePrReference('8978', ''), null);
});

test('parsePrReference returns null for an invalid reference', function() {
    assert.equal(parsePrReference('not a pr', 'quintoandar/salesforce'), null);
});

test('derivePrLabelFromBranch maps known base branches to labels', function() {
    assert.equal(derivePrLabelFromBranch('forno'), 'Forno');
    assert.equal(derivePrLabelFromBranch('staging'), 'Staging');
    assert.equal(derivePrLabelFromBranch('main'), 'Producao');
});

test('derivePrLabelFromBranch falls back to the branch name itself', function() {
    assert.equal(derivePrLabelFromBranch('release/hotfix'), 'release/hotfix');
});

test('extractTicketInfo finds the ticket from the branch name', function() {
    const result = extractTicketInfo(['feat(swss-5143): partner repair request', 'feat/swss-5143-partner-repair-request-forno']);
    assert.equal(result.ticket, 'SWSS-5143');
    assert.deepEqual(result.candidates, ['SWSS-5143']);
});

test('extractTicketInfo lists extra tickets as candidates', function() {
    const result = extractTicketInfo(['SWSS-5143 and also SWSS-9999']);
    assert.equal(result.ticket, 'SWSS-5143');
    assert.deepEqual(result.candidates, ['SWSS-5143', 'SWSS-9999']);
});

test('extractTicketInfo returns null ticket when nothing matches', function() {
    const result = extractTicketInfo(['no ticket here']);
    assert.equal(result.ticket, null);
    assert.deepEqual(result.candidates, []);
});

test('extractWhatSection reads the content under the ## What heading', function() {
    const body = '## What\nAjusta o batch de reparo.\n\n## Why\nPorque sim.';
    assert.equal(extractWhatSection(body), 'Ajusta o batch de reparo.');
});

test('extractWhatSection returns null when there is no What section', function() {
    assert.equal(extractWhatSection('## Why\nPorque sim.'), null);
});

test('buildPrMetadataItems maps added/removed/modified files to change types', function() {
    const extractMetadataName = function(filePath) {
        return { name: filePath, type: 'ApexClass' };
    };
    const files = [
        { filename: 'force-app/main/default/classes/A.cls', status: 'added' },
        { filename: 'force-app/main/default/classes/B.cls', status: 'removed' },
        { filename: 'force-app/main/default/classes/C.cls', status: 'modified' }
    ];

    const result = buildPrMetadataItems(files, extractMetadataName);

    assert.deepEqual(result.metadatas, [
        { name: 'force-app/main/default/classes/A.cls', type: 'ApexClass', change_type: 'Criacao' },
        { name: 'force-app/main/default/classes/B.cls', type: 'ApexClass', change_type: 'Remocao' },
        { name: 'force-app/main/default/classes/C.cls', type: 'ApexClass', change_type: 'Alteracao' }
    ]);
    assert.deepEqual(result.ignored_files, []);
});

test('buildPrMetadataItems ignores files outside force-app', function() {
    const extractMetadataName = function(filePath) {
        return { name: filePath, type: 'ApexClass' };
    };
    const files = [
        { filename: '.github/workflows/x.yml', status: 'modified' },
        { filename: 'force-app/main/default/classes/A.cls', status: 'modified' }
    ];

    const result = buildPrMetadataItems(files, extractMetadataName);

    assert.equal(result.metadatas.length, 1);
    assert.deepEqual(result.ignored_files, ['.github/workflows/x.yml']);
});

test('buildPrMetadataItems dedupes a .cls and its -meta.xml into one metadata', function() {
    const extractMetadataName = function(filePath) {
        return { name: filePath.replace(/-meta\.xml$/, ''), type: 'ApexClass' };
    };
    const files = [
        { filename: 'force-app/main/default/classes/A.cls', status: 'modified' },
        { filename: 'force-app/main/default/classes/A.cls-meta.xml', status: 'modified' }
    ];

    const result = buildPrMetadataItems(files, extractMetadataName);

    assert.equal(result.metadatas.length, 1);
});

test('buildPrMetadataItems treats a renamed file as removed (old name) plus added (new name)', function() {
    const extractMetadataName = function(filePath) {
        return { name: filePath, type: 'ApexClass' };
    };
    const files = [
        {
            filename: 'force-app/main/default/classes/NewName.cls',
            previous_filename: 'force-app/main/default/classes/OldName.cls',
            status: 'renamed'
        }
    ];

    const result = buildPrMetadataItems(files, extractMetadataName);

    assert.deepEqual(result.metadatas, [
        { name: 'force-app/main/default/classes/OldName.cls', type: 'ApexClass', change_type: 'Remocao' },
        { name: 'force-app/main/default/classes/NewName.cls', type: 'ApexClass', change_type: 'Criacao' }
    ]);
});

test('parseGhFilesJsonLines parses mocked gh api --paginate --jq JSON-lines output', function() {
    const stdout = [
        '{"filename":"force-app/main/default/classes/A.cls","status":"added","previous_filename":null}',
        '{"filename":"force-app/main/default/classes/B.cls","status":"renamed","previous_filename":"force-app/main/default/classes/Old.cls"}',
        ''
    ].join('\n');

    const files = parseGhFilesJsonLines(stdout);

    assert.deepEqual(files, [
        { filename: 'force-app/main/default/classes/A.cls', status: 'added', previous_filename: '' },
        { filename: 'force-app/main/default/classes/B.cls', status: 'renamed', previous_filename: 'force-app/main/default/classes/Old.cls' }
    ]);
});

test('parseGhFilesJsonLines ignores blank lines and returns empty array for empty output', function() {
    assert.deepEqual(parseGhFilesJsonLines(''), []);
    assert.deepEqual(parseGhFilesJsonLines('\n\n'), []);
});

test('parseGhAuthStatus detects a logged-in account from mocked gh auth status output', function() {
    const output = [
        'github.com',
        '  ✓ Logged in to github.com account guilherme-rba (keyring)',
        '  - Active account: true',
        '  - Git operations protocol: https'
    ].join('\n');

    assert.deepEqual(parseGhAuthStatus(output), { connected: true, username: 'guilherme-rba' });
});

test('parseGhAuthStatus reports disconnected when gh is not authenticated', function() {
    const output = 'You are not logged into any GitHub hosts. To log in, run: gh auth login';
    assert.deepEqual(parseGhAuthStatus(output), { connected: false, username: null });
});

test('parseGhAuthStatus reports disconnected for empty output', function() {
    assert.deepEqual(parseGhAuthStatus(''), { connected: false, username: null });
});

test('parseGhLoginCode extracts the one-time device code from mocked gh auth login output', function() {
    const output = '! First copy your one-time code: 1A2B-3C4D\nPress Enter to open github.com in your browser...\n';
    assert.equal(parseGhLoginCode(output), '1A2B-3C4D');
});

test('parseGhLoginCode returns null when no code is present', function() {
    assert.equal(parseGhLoginCode('some other gh output'), null);
    assert.equal(parseGhLoginCode(''), null);
});

test('normalizeGhPrView maps mocked gh pr view --json output to the PR contract shape', function() {
    const raw = JSON.stringify({
        number: 8978,
        url: 'https://github.com/quintoandar/salesforce/pull/8978',
        title: 'feat(swss-5143): partner repair request -> forno',
        baseRefName: 'forno',
        headRefName: 'feat/swss-5143-partner-repair-request-forno',
        state: 'MERGED',
        mergedAt: '2026-11-11T18:50:00Z',
        body: '## What\nAjusta o batch.\n\n## Why\nPorque sim.'
    });

    const pr = normalizeGhPrView(raw);

    assert.deepEqual(pr, {
        number: 8978,
        url: 'https://github.com/quintoandar/salesforce/pull/8978',
        title: 'feat(swss-5143): partner repair request -> forno',
        base: 'forno',
        head: 'feat/swss-5143-partner-repair-request-forno',
        state: 'MERGED',
        merged_at: '2026-11-11T18:50:00Z',
        body: '## What\nAjusta o batch.\n\n## Why\nPorque sim.'
    });
});
