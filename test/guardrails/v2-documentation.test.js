import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

const activeDocs = [
    'README.md',
    'docs/architecture.md',
    'docs/roadmap.md',
    'docs/guides/chrome-install.md',
    'docs/guides/console-script.md'
];

test('V2 Documentation Guardrails - No active mentions of v1 surfaces', (t) => {
    activeDocs.forEach((docPath) => {
        const fullPath = path.join(ROOT_DIR, docPath);
        if (!fs.existsSync(fullPath)) {
            return;
        }

        const content = fs.readFileSync(fullPath, 'utf8');

        const bannedPhrases = [
            'npm start',
            'node server.js',
            'windows-launcher.zip',
            'docs/guides/pairing.md',
            'docs/guides/usb-downloads.md',
            'docs/guides/windows-launcher.md',
            'CONVERSION_CAPABILITY.enabled=true'
        ];

        bannedPhrases.forEach((phrase) => {
            if (content.includes(phrase)) {
                assert.fail(`Active document ${docPath} contains banned v1 phrase: "${phrase}"`);
            }
        });

        const quickstartLinks = [
            '(docs/guides/pairing.md)',
            '(docs/guides/windows-launcher.md)',
            '(docs/guides/usb-downloads.md)'
        ];

        quickstartLinks.forEach(link => {
            if (content.includes(link)) {
                assert.fail(`Active document ${docPath} contains banned v1 link: "${link}"`);
            }
        });
    });
});

test('V2 documentation guardrails: archived v1.6.2 release notes remain present', () => {
    const v162Path = path.join(ROOT_DIR, 'docs', 'archive', 'v1', 'releases', 'v1.6.2.md');
    assert.ok(fs.existsSync(v162Path), 'docs/archive/v1/releases/v1.6.2.md must exist');
    const content = fs.readFileSync(v162Path, 'utf8');
    assert.match(content, /> \*\*Status: Historical v1\.x(?: record)? — inactive and unsupported\.\*\*/);
});

test('Published v2.0.0 notes preserve the original historical asset inventory', () => {
    const notesPath = path.join(ROOT_DIR, 'docs', 'releases', 'v2.0.0.md');
    assert.ok(fs.existsSync(notesPath), 'docs/releases/v2.0.0.md must exist');
    const content = fs.readFileSync(notesPath, 'utf8');

    // Must contain release-manifest.json
    assert.match(content, /release-manifest\.json/, 'Release notes must list release-manifest.json');
    // Must NOT contain Source code as one of the 6 official release assets
    assert.doesNotMatch(content, /Source code \((?:zip|tar\.gz)\)/, 'Release notes must not include Source code as one of the 6 release assets');

    // Must list the exact 6 assets
    const expectedAssets = [
        'music-converter-v2.0.0-chrome-extension.zip',
        'music-converter-v2.0.0-edge-extension.zip',
        'script_complet.txt',
        'SHA256SUMS',
        'sbom.spdx.json',
        'release-manifest.json'
    ];
    for (const asset of expectedAssets) {
        assert.ok(content.includes(asset), `Release notes must include asset ${asset}`);
    }
});

test('V2 Documentation Guardrails - exact voluntary download terminology', () => {
    const qaPath = path.join(ROOT_DIR, 'qa', 'v2.0.0-extension-checklist.md');
    assert.ok(fs.existsSync(qaPath), 'qa/v2.0.0-extension-checklist.md must exist');
    const qaContent = fs.readFileSync(qaPath, 'utf8');

    // The checklist must not claim a native download API.
    assert.doesNotMatch(qaContent, /native download API/i, 'The QA checklist must not claim a native download API.');
    // Must specify voluntary link/anchor download without downloads permission
    assert.match(qaContent, /link|anchor/i, 'The QA checklist must mention link or anchor downloads.');
});

test('V2 Documentation Guardrails - documentation of retired v1 environment variables', () => {
    const migrationPath = path.join(ROOT_DIR, 'docs', 'migration-v1-to-v2.md');
    assert.ok(fs.existsSync(migrationPath), 'docs/migration-v1-to-v2.md must exist');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');

    const retiredVars = [
        'PORT',
        'NO_OPEN',
        'MUSIC_CONVERTER_EXTENSION_ORIGINS',
        'MUSIC_CONVERTER_USB_VOLUME_ID',
        'MUSIC_CONVERTER_USB_MOVE_SOURCE',
        'MUSIC_CONVERTER_USB_MOVE_DESTINATION'
    ];

    for (const v of retiredVars) {
        assert.ok(migrationContent.includes(v), `Migration doc must document retired variable ${v} as removed without replacement`);
    }
});
