'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

test('the metadata form is organized as four accordion sections', function() {
    const sections = ['front-sprint', 'import', 'bulk', 'ticket-description'];
    sections.forEach(function(key) {
        assert.match(indexHtml, new RegExp('data-section="' + key + '"'));
    });
    assert.match(indexHtml, /class="accordion-section is-open" data-section="front-sprint"/);
});

test('commit and PR import live as sub-tabs inside the import section', function() {
    assert.match(indexHtml, /id="subtab-btn-commit"/);
    assert.match(indexHtml, /id="subtab-btn-pr"/);
    assert.match(indexHtml, /id="subtab-pane-commit"/);
    assert.match(indexHtml, /id="subtab-pane-pr"/);
    assert.match(appJs, /function setActiveImportSubtab\(subtab\)/);
});

test('adding a new front/sprint/type opens a modal instead of an inline row', function() {
    assert.match(indexHtml, /<div id="add-front-row" class="modal" hidden>/);
    assert.match(indexHtml, /<div id="add-sprint-row" class="modal" hidden>/);
    assert.match(indexHtml, /<div id="add-type-row" class="modal" hidden>/);
    assert.doesNotMatch(indexHtml, /class="lookup-add-row"/);
});

test('accordion sections toggle open/closed and auto-expand on errors and import results', function() {
    assert.match(appJs, /function openAccordionSection\(sectionKey\)/);
    assert.match(appJs, /function expandSectionFor\(element\)/);
    assert.match(appJs, /expandSectionFor\(focusEl\)/);
    assert.match(appJs, /openAccordionSection\('bulk'\)/);
});

test('header shows a gh connection status badge checked on load', function() {
    assert.match(indexHtml, /id="gh-status-badge"/);
    assert.match(appJs, /function loadGhStatus\(\)/);
    assert.match(appJs, /api\.get\('\/api\/gh-status'\)/);
});
