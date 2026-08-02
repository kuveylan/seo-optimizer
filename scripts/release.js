#!/usr/bin/env node
/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
/**
 * Yerel GitHub Release yayınlama betiği (scripts/release.js)
 *
 * - `npm run build:release` ile binary'leri derleyip arşivleri üretir.
 * - vX.Y.Z tag'ini doğrular (verilmezse package.json sürümünden üretir).
 * - İstenirse tag'i yerelde oluşturur ve remote'a iter.
 * - dist/ içindeki tüm arşivleri enumerate edip `gh release create` ile yükler.
 *
 * Kullanım:
 *   node scripts/release.js                # v1.1.0 (package.json'dan)
 *   node scripts/release.js v1.2.0         # belirtilen sürüm
 *   node scripts/release.js --no-build     # derleme yapmadan mevcut arşivleri yükle
 *   node scripts/release.js --push         # tag oluştur + remote'a it
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const { version } = require(path.join(ROOT, 'package.json'));

const log = (msg) => console.log(`[release] ${msg}`);

/** gh CLI kurulu mu kontrol et. */
function requireGh() {
    try {
        execFileSync('gh', ['--version'], { stdio: 'ignore' });
    } catch (_) {
        console.error('[release] GitHub CLI (gh) bulunamadı. Lütfen https://cli.github.com adresinden kurun.');
        process.exit(1);
    }
}

/** dist içindeki yayınlanacak arşivleri listele. */
function collectAssets() {
    if (!fs.existsSync(DIST)) return [];
    return fs.readdirSync(DIST)
        .filter((f) => f.endsWith('.zip') || f.endsWith('.tar.gz'))
        .map((f) => path.join(DIST, f));
}

async function main() {
    const args = process.argv.slice(2);
    const noBuild = args.includes('--no-build');
    const push = args.includes('--push');
    const explicitTag = args.find((a) => a && !a.startsWith('--'));

    requireGh();

    if (!noBuild) {
        log('Binary' + "'" + 'ler derleniyor ve paketleniyor...');
        execFileSync('node', [path.join(ROOT, 'scripts', 'build.js')], { cwd: ROOT, stdio: 'inherit' });
    }

    // Tag belirle
    const tag = explicitTag || `v${version}`;
    if (!/^v\d+\.\d+\.\d+/.test(tag)) {
        console.error(`[release] Geçersiz tag biçimi: "${tag}" — vX.Y.Z biçiminde olmalı.`);
        process.exit(1);
    }

    // Tag yerelde yoksa oluştur
    try {
        execFileSync('git', ['rev-parse', tag], { cwd: ROOT, stdio: 'ignore' });
        log(`Tag zaten mevcut: ${tag}`);
    } catch (_) {
        if (push) {
            execFileSync('git', ['tag', tag], { cwd: ROOT, stdio: 'inherit' });
            log(`Yerel tag oluşturuldu: ${tag}`);
            execFileSync('git', ['push', 'origin', tag], { cwd: ROOT, stdio: 'inherit' });
            log(`Tag remote'a itildi: ${tag}`);
        } else {
            log(`Tag mevcut değil (oluşturmadım — --push verirseniz oluştururum): ${tag}`);
        }
    }

    const assets = collectAssets();
    if (assets.length === 0) {
        console.error('[release] dist/ içinde arşiv bulunamadı. Önce npm run build:release çalıştırın.');
        process.exit(1);
    }

    log(`Yayınlanacak ${assets.length} arşiv:`);
    for (const a of assets) log(`  ${path.relative(ROOT, a)}`);

    // Gh release oluştur
    const title = `seo-audit ${tag.replace(/^v/, '')}`;
    const cmd = ['release', 'create', tag, ...assets, '--title', title, '--generate-notes'];
    log(`gh ${cmd.join(' ')}`);
    execFileSync('gh', cmd, { cwd: ROOT, stdio: 'inherit' });

    log(`Tamamlandı! GitHub Release oluşturuldu: ${tag}`);
}

main().catch((err) => {
    console.error('[release] HATA:', err.message);
    process.exit(1);
});
