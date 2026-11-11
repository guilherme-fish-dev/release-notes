'use strict';

const BRANCH_LABELS = {
    forno: 'Forno',
    staging: 'Staging',
    main: 'Producao',
    master: 'Producao'
};

const TICKET_REGEX = /[A-Za-z]+-\d+/g;
const WHAT_SECTION_REGEX = /##\s*What\b[^\n]*\n([\s\S]*?)(?:\n##\s|\s*$)/i;
const PR_URL_REGEX = /github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i;

function parsePrReference(input, defaultRepo) {
    const text = String(input == null ? '' : input).trim();
    if (!text) return null;

    const urlMatch = text.match(PR_URL_REGEX);
    if (urlMatch) {
        return {
            owner: urlMatch[1],
            repo: urlMatch[2].replace(/\.git$/i, ''),
            number: Number(urlMatch[3])
        };
    }

    if (/^\d+$/.test(text)) {
        const repoFull = String(defaultRepo || '').trim();
        const parts = repoFull.split('/');
        if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
        return { owner: parts[0], repo: parts[1], number: Number(text) };
    }

    return null;
}

function derivePrLabelFromBranch(branch) {
    const text = String(branch || '').trim();
    if (!text) return '';
    return BRANCH_LABELS[text.toLowerCase()] || text;
}

function extractTicketCandidates(sources) {
    const list = Array.isArray(sources) ? sources : [sources];
    const seen = new Set();
    const candidates = [];

    list.forEach(function(source) {
        const text = String(source || '');
        TICKET_REGEX.lastIndex = 0;
        let match;
        while ((match = TICKET_REGEX.exec(text)) !== null) {
            const ticket = match[0].toUpperCase();
            if (!seen.has(ticket)) {
                seen.add(ticket);
                candidates.push(ticket);
            }
        }
    });

    return candidates;
}

function extractTicketInfo(sources) {
    const candidates = extractTicketCandidates(sources);
    return {
        ticket: candidates[0] || null,
        candidates: candidates
    };
}

function extractWhatSection(body) {
    const text = String(body || '');
    const match = text.match(WHAT_SECTION_REGEX);
    if (!match) return null;
    const section = match[1].trim();
    return section || null;
}

function mapFileStatusToChangeType(status) {
    const key = String(status || '').trim().toLowerCase();
    if (key === 'added') return 'Criacao';
    if (key === 'removed') return 'Remocao';
    return 'Alteracao';
}

function isForceAppPath(filePath) {
    return /^force-app\//i.test(String(filePath || '').trim());
}

function buildPrMetadataItems(files, extractMetadataName) {
    const unique = new Map();
    const ignored = [];

    (Array.isArray(files) ? files : []).forEach(function(file) {
        const status = String(file && file.status || '').trim().toLowerCase();
        const filename = String(file && file.filename || '').trim();
        const previousFilename = String(file && file.previous_filename || '').trim();

        const entries = (status === 'renamed' && previousFilename)
            ? [{ path: previousFilename, status: 'removed' }, { path: filename, status: 'added' }]
            : [{ path: filename, status: status }];

        entries.forEach(function(entry) {
            if (!entry.path) return;

            if (!isForceAppPath(entry.path)) {
                if (ignored.indexOf(entry.path) === -1) ignored.push(entry.path);
                return;
            }

            const item = extractMetadataName(entry.path);
            if (!item || !item.name) return;

            const key = String(item.type || '').toLowerCase() + '::' + String(item.name || '').toLowerCase();
            unique.set(key, {
                name: item.name,
                type: item.type,
                change_type: mapFileStatusToChangeType(entry.status)
            });
        });
    });

    return {
        metadatas: Array.from(unique.values()),
        ignored_files: ignored
    };
}

function parseGhFilesJsonLines(stdout) {
    return String(stdout || '')
        .split(/\r?\n/)
        .map(function(line) { return line.trim(); })
        .filter(Boolean)
        .map(function(line) { return JSON.parse(line); })
        .map(function(entry) {
            return {
                filename: String(entry.filename || '').trim(),
                status: String(entry.status || '').trim(),
                previous_filename: String(entry.previous_filename || '').trim()
            };
        });
}

function normalizeGhPrView(stdout) {
    const raw = JSON.parse(stdout);
    return {
        number: Number(raw.number),
        url: String(raw.url || ''),
        title: String(raw.title || ''),
        base: String(raw.baseRefName || ''),
        head: String(raw.headRefName || ''),
        state: String(raw.state || ''),
        merged_at: raw.mergedAt || null,
        body: String(raw.body || '')
    };
}

function parseGhAuthStatus(output) {
    const text = String(output || '');
    const match = text.match(/Logged in to \S+ account (\S+)/i);
    if (match) {
        return { connected: true, username: match[1] };
    }
    return { connected: false, username: null };
}

module.exports = {
    parsePrReference,
    derivePrLabelFromBranch,
    extractTicketCandidates,
    extractTicketInfo,
    extractWhatSection,
    mapFileStatusToChangeType,
    isForceAppPath,
    buildPrMetadataItems,
    parseGhFilesJsonLines,
    normalizeGhPrView,
    parseGhAuthStatus
};
