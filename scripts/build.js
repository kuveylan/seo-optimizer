#!/usr/bin/env node
/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
/**
 * Derleme + Paketleme betiği (scripts/build.js) — caxa tabanlı
 *
 * caxa, Node.js uygulamasını kendini-açan (self-extracting) tekil bir
 * executable içine paketler. Gerçek Node + gerçek dosya sistemi kullandığı
 * için puppeteer (ESM) dahil hiçbir bağımlılık pkg'da olduğu gibi
 * snapshot/ESM sorununa takılmaz.
 *
 * Yerelde çalıştırınca MEVCUT platformun binary'sini üretir (Windows → .exe).
 * Diğer platformlar GitHub Actions matrix'inde kendi runner'larında üretilir
 * (caxa cross-compile yapmaz).
 *
 * Kullanım:
 *   node scripts/build.js            # mevcut platform EXE + arşiv (dist/package)
 *   node scripts/build.js --binaries # sadece EXE üret, arşivleme yok
 *
 * Çıktılar:
 *   dist/seo-audit-<os>-<arch>.exe   (CLI executable)
 *   dist/seo-server-<os>-<arch>.exe  (Web arayüz executable)
 *   dist/package/...                 (arşivler: .zip / .tar.gz)
 */
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const archiver = require('archiver');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const STAGE = path.join(DIST, 'stage');
const PACKAGE_DIR = path.join(DIST, 'package');

const { version } = require(path.join(ROOT, 'package.json'));

// Pakete girecek proje dosyaları (hassas dosyalar ASLA girmez)
const APP_FILES = [
    'bin', 'src', 'views', 'public',
    'package.json', 'package-lock.json',
    '.env.example', 'README.md', 'LICENSE',
];

// Arşiv klasörüne eklenecek yardımcı dosyalar (Windows çift tıklama başlatıcı)
const EXTRA_PACKAGE_FILES = ['bin/seo-audit.bat'];

// İki giriş noktası: CLI + Web sunucusu
const ENTRIES = [
    { name: 'seo-audit',  script: 'bin/seo-audit.js' },
    { name: 'seo-server', script: 'src/server.js' },
];

const log = (msg) => console.log(`[build] ${msg}`);

/** Mevcut platform adı: win-x64 / linux-x64 / macos-x64 / macos-arm64 */
function platformTag() {
    const osMap = { win32: 'win', linux: 'linux', darwin: 'macos' };
    const archMap = { x64: 'x64', arm64: 'arm64' };
    return `${osMap[process.platform] || process.platform}-${archMap[os.arch()] || os.arch()}`;
}

/** Stage klasörünü hazırla: proje dosyaları + production-only node_modules. */
async function prepareStage() {
    fs.rmSync(STAGE, { recursive: true, force: true });
    fs.mkdirSync(STAGE, { recursive: true });

    for (const item of APP_FILES) {
        const src = path.join(ROOT, item);
        const dst = path.join(STAGE, item);
        if (fs.existsSync(src)) {
            fs.cpSync(src, dst, { recursive: true });
        }
    }

    // Production bağımlılıklarını temiz kur (devDeps: caxa/pkg/archiver girmez).
    log('Production bağımlılıkları kuruluyor (npm ci --omit=dev)...');
    execFileSync('npm ci --omit=dev --no-audit --no-fund', {
        cwd: STAGE,
        stdio: 'inherit',
        shell: true,
    });
    log('Stage hazır.');
}

/** caxa ile tek bir executable üretir. */
function buildExe(entry, tag) {
    const exeName = `${entry.name}-${tag}${process.platform === 'win32' ? '.exe' : ''}`;
    const output = path.join(DIST, exeName);

    log(`EXE üretiliyor: ${output}`);
    // caxa'nın kendini-açan arşivi; command CLI/server girişini çalıştırır.
    // Windows'ta npx bir .cmd olduğundan execSync + shell kullanılır.
    const cmd =
        'npx caxa' +
        ` --input "${STAGE}"` +
        ` --output "${output}"` +
        ' --no-dedupe --no-remove-build-directory' +
        ` -- "{{caxa}}/node_modules/.bin/node" "{{caxa}}/${entry.script}"`;
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
    return output;
}

/** dist/package/ içine platform klasörü hazırlayıp arşivler. */
async function packageOutput(exePaths, tag) {
    const dirName = `${tag}`;
    const stageDir = path.join(PACKAGE_DIR, dirName);
    fs.rmSync(stageDir, { recursive: true, force: true });
    fs.mkdirSync(stageDir, { recursive: true });

    // EXE'leri ve harici kaynakları (düzenlenebilir şablon/CSS) kopyala
    for (const exe of exePaths) {
        fs.copyFileSync(exe, path.join(stageDir, path.basename(exe)));
    }
    for (const item of ['views', 'public', '.env.example', 'README.md', 'LICENSE']) {
        const src = path.join(ROOT, item);
        const dst = path.join(stageDir, item);
        if (fs.existsSync(src)) fs.cpSync(src, dst, { recursive: true });
    }
    // Yardımcı dosyalar (Windows .bat başlatıcı vb.) arşiv köküne kopyalanır
    for (const rel of EXTRA_PACKAGE_FILES) {
        const src = path.join(ROOT, rel);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(stageDir, path.basename(rel)));
        }
    }

    const isWin = process.platform === 'win32';
    const archivePath = path.join(DIST, `seo-audit-v${version}-${dirName}`);
    const out = isWin ? `${archivePath}.zip` : `${archivePath}.tar.gz`;

    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(out);
        const archive = archiver(isWin ? 'zip' : 'tar', { gzip: !isWin });
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(stageDir, dirName);
        archive.finalize();
    });

    log(`Arşivlendi: ${out}`);
    return out;
}

async function main() {
    const onlyBinaries = process.argv.includes('--binaries');
    const tag = platformTag();
    fs.rmSync(DIST, { recursive: true, force: true });
    fs.mkdirSync(DIST, { recursive: true });

    log(`Derlemeye başlanıyor — sürüm: v${version}, platform: ${tag}`);
    await prepareStage();

    const exePaths = [];
    for (const entry of ENTRIES) {
        exePaths.push(buildExe(entry, tag));
    }

    if (onlyBinaries) {
        log('--binaries verildi, arşivleme atlandı.');
        return;
    }

    await packageOutput(exePaths, tag);
    log('Bitti. EXE' + "'" + 'ler ve arşivler dist/ içinde.');
}

main().catch((err) => {
    console.error('[build] HATA:', err.message);
    process.exit(1);
});
