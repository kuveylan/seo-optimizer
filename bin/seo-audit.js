#!/usr/bin/env node
/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 *
 * Terminal (CLI) denetim aracı — `seo-audit` komutu.
 * Kullanım:
 *   seo-audit audit https://example.com          # Tam site SEO denetimi
 *   seo-audit audit --pdf https://example.com     # + PDF raporu indir
 *   seo-audit compare https://a.com https://b.com  # Rakip karşılaştırma
 *   seo-audit sitemap https://example.com          # XML sitemap üret
 */
// .env'yi birkaç konumda ara (repo içi + ev dizini + çalışılan dizin)
const path = require('path');
const os = require('os');
const fs = require('fs');
const envCandidates = [
    path.join(__dirname, '..', '.private', '.env'),    // repo içi
    path.join(os.homedir(), '.seo-audit.env'),         // global: `seo-audit config` ile oluşur
    path.join(process.cwd(), '.private', '.env'),      // çalışılan dizin
    path.join(process.cwd(), '.env')                   // çalışılan dizindeki .env
];
for (const p of envCandidates) {
    if (fs.existsSync(p)) { require('dotenv').config({ path: p }); break; }
}

// Yüklendikten sonra kullanıcıya anahtar durumunu özetle
const hasAIKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here';

const { crawlSite } = require('../src/siteCrawler');
const { scoreSite } = require('../src/scoreEngine');
const { detectIssues, scoreImpact } = require('../src/reportIssues');
const { analyzeWithAI } = require('../src/aiAgent');
const { generatePdfReport } = require('../src/pdfReportGenerator');
const { compareSites } = require('../src/competitorAnalyzer');
const { generateSitemap } = require('../src/seoToolbox');

// ─── Renkler (terminal çıktısı için, Windows CMD dahil çalışır) ───
const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

const c = (code, text) => `${COLORS[code]}${text}${COLORS.reset}`;
const banner = `\n${c('cyan', '╔══════════════════════════════════════════════╗')}
${c('cyan', '║')}   ${c('bold', c('white', 'SEO OPTIMIZER'))}  ${c('dim', 'v1.1')}  ${c('cyan', '║')}
${c('cyan', '║')}   ${c('dim', 'Yapay Zeka Destekli SEO Denetimi')}   ${c('cyan', '║')}
${c('cyan', '╚══════════════════════════════════════════════╝')}\n`;

function scoreEmoji(score) {
    if (score >= 90) return '🟢';
    if (score >= 50) return '🟡';
    return '🔴';
}

function buildScanData(crawlData) {
    return {
        baseUrl: crawlData.baseUrl,
        totalPagesScanned: crawlData.totalPagesScanned,
        pages: crawlData.pages.map(p => ({
            url: p.url,
            performance: { statusCode: p.statusCode, responseTimeMs: p.responseTimeMs, status: p.statusCode >= 400 ? 'Kritik' : (p.responseTimeMs < 1500 ? 'İyi' : 'Yavaş') },
            title: { text: p.title, length: p.titleLength, status: p.titleLength >= 10 && p.titleLength <= 60 ? 'İyi' : 'Uyarı' },
            description: { text: p.description, length: p.descriptionLength, status: p.descriptionLength >= 70 && p.descriptionLength <= 160 ? 'İyi' : 'Uyarı' },
            headings: { h1Count: p.h1Count, h2Count: p.h2Count, h3Count: p.h3Count, h4Count: p.h4Count, h5Count: p.h5Count, h6Count: p.h6Count, h1Texts: p.h1Texts, status: p.h1Count === 1 ? 'İyi' : 'Kritik' },
            images: { totalImages: p.totalImages, imagesWithoutAlt: p.imagesWithoutAlt, status: p.imagesWithoutAlt === 0 ? 'İyi' : 'Uyarı' },
            technical: { hasViewport: p.hasViewport, status: p.hasViewport ? 'İyi' : 'Kritik' },
            linkHealth: { totalChecked: p.totalLinks || 0, brokenLinksCount: p.brokenLinksCount || 0, brokenLinks: p.brokenLinks || [], internalLinks: p.internalLinks || 0, externalLinks: p.externalLinks || 0, nofollowCount: p.nofollowCount || 0, status: (p.brokenLinksCount || 0) > 0 ? 'Uyarı' : 'İyi' },
            content: { wordCount: p.wordCount || 0, hasAnalytics: !!p.hasAnalytics, schemaOrgCount: p.schemaOrgCount || 0, schemaTypes: p.schemaTypes || [] },
            security: { securityHeaderCount: Object.values(p.securityHeaders || {}).filter(Boolean).length, securityHeaders: p.securityHeaders || {}, compressionUsed: !!p.compressionUsed, compressionStatus: p.compressionUsed ? 'Aktif' : 'Kontrol edilmedi', server: p.server || 'Bilinmiyor' },
            keywords: p.keywords || null,
            geo: crawlData.geo || null
        }))
    };
}

function formatMs(ms) {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function printSection(title) {
    console.log(`\n${c('cyan', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}`);
    console.log(c('bold', ` ${title}`));
    console.log(c('cyan', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
}

// ─── ALT KOMUT: audit (ana denetim) ───
async function audit(url, options = {}) {
    console.log(banner);
    console.log(c('cyan', `🎯 Hedef  :`) + c('bold', ` ${url}`));
    console.log(`\n${c('dim', '▶ Site taranıyor (sitemap + BFS link keşfi)...')}\n`);

    const started = Date.now();
    const crawlData = await crawlSite(url);
    const scanData = buildScanData(crawlData);
    const scored = scoreSite(scanData);
    const issues = detectIssues(scanData, crawlData);
    const impact = scoreImpact(scored, issues);

    if (!scored) {
        console.log(c('red', '❌ Site taranamadı. URL\'yi kontrol edin (https:// dahil olmalı).'));
        process.exitCode = 1;
        return;
    }

    const elapsed = Date.now() - started;
    const s = scored.scores;
    const labels = scored.labels;

    printSection(`📊 GENEL SKOR — ${url} ${scoreEmoji(s.overall)} ${labels.overall.label}`);
    console.log(`  ${c('bold', `${s.overall}/100`)} ${labels.overall.emoji} ${c('dim', `(${crawlData.totalPagesScanned} sayfa, ${formatMs(elapsed)})`)}`);

    printSection('Kategori Skorları (0-100)');
    const rows = [
        ['🚀 Performance', s.performance, labels.performance],
        ['🔍 SEO', s.seo, labels.seo],
        ['♿ Erişilebilirlik', s.accessibility, labels.accessibility],
        ['⚙️ Best Practices', s.bestPractices, labels.bestPractices],
        ['🛡️ Güvenlik', s.security, labels.security]
    ];
    for (const [name, score, label] of rows) {
        const bar = '█'.repeat(Math.round(score / 5)).padEnd(20, '░');
        const color = score >= 90 ? 'green' : score >= 50 ? 'yellow' : 'red';
        console.log(`  ${name.padEnd(18)} ${c(color, bar)} ${c('bold', String(score).padStart(3))}  ${label.emoji} ${c('dim', label.label)}`);
    }

    // Tarama özeti
    printSection('🌐 Tarama Özeti');
    console.log(`  ${c('dim', 'Taranan sayfa')}   : ${c('bold', String(crawlData.totalPagesScanned))}`);
    console.log(`  ${c('dim', 'Hatalı sayfa')}    : ${crawlData.totalErrors > 0 ? c('red', String(crawlData.totalErrors)) : c('green', String(crawlData.totalErrors))}`);
    console.log(`  ${c('dim', 'Yavaş sayfa')}     : ${crawlData.totalSlow > 0 ? c('yellow', String(crawlData.totalSlow)) : c('green', String(crawlData.totalSlow))}`);
    console.log(`  ${c('dim', 'Ort. yanıt süresi')}: ${c('bold', formatMs(crawlData.avgResponseTimeMs))}`);
    console.log(`  ${c('dim', 'Tarama süresi')}   : ${c('bold', formatMs(elapsed))}`);

    // Sorunlar
    printSection(`⚠️ Tespit Edilen Sorunlar (${issues.length})`);
    if (issues.length === 0) {
        console.log(c('green', '  ✨ Hiçbir sorun tespit edilmedi. Tebrikler!'));
    } else {
        const sevOrder = { 'Kritik': 0, 'Orta': 1, 'Düşük': 2 };
        const sorted = [...issues].sort((a, b) => (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3));
        for (const issue of sorted.slice(0, 15)) {
            const emoji = issue.severity === 'Kritik' ? '🔴' : issue.severity === 'Orta' ? '🟡' : '🔵';
            const color = issue.severity === 'Kritik' ? 'red' : issue.severity === 'Orta' ? 'yellow' : 'blue';
            console.log(`  ${emoji} ${c(color, `[${issue.severity}]`)} ${issue.title}`);
            console.log(`      ${c('dim', issue.fix || issue.detail || '')}`.substring(0, 140));
        }
        if (issues.length > 15) console.log(`  ${c('dim', `... ve ${issues.length - 15} sorun daha. Detay için: web arayüzü → /result`)}`);
    }

    // AI raporu
    const hasAI = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here';
    if (hasAI) {
        printSection('🤖 Yapay Zeka Uzman Raporu');
        console.log(c('dim', 'AI raporu oluşturuluyor (30-60 sn sürebilir)...\n'));
        const aiInput = { ...scanData, siteScore: scored, detectedIssues: issues, crawlSummary: { totalPagesScanned: crawlData.totalPagesScanned, totalErrors: crawlData.totalErrors, totalSlow: crawlData.totalSlow, avgResponseTimeMs: crawlData.avgResponseTimeMs } };
        const aiReport = await analyzeWithAI(aiInput);
        if (aiReport && !aiReport.startsWith('❌') && !aiReport.startsWith('Hata:')) {
            console.log(c('white', aiReport));
        } else {
            console.log(c('yellow', `  ⚠️ AI raporu alınamadı: ${aiReport}`));
        }
    } else {
        printSection('🤖 Yapay Zeka Uzman Raporu');
        console.log(c('yellow', '  ⚠️ AI raporu için API anahtarı tanımlı değil.'));
        console.log(c('dim', '  Teknik skorlama tamamlandı. AI raporu istiyorsanız tek komut:'));
        console.log(c('cyan', '    seo-audit config'));
        console.log(c('dim', '  → AI anahtarınızı girin, sonra tekrar: seo-audit audit <URL>'));
    }

    // PDF
    if (options.pdf) {
        printSection('📄 PDF Raporu');
        try {
            console.log(c('dim', '  Kurumsal PDF oluşturuluyor (Puppeteer)...'));
            const pdfBuffer = await generatePdfReport({ scanData, crawlData, scored, issues, aiReport: null, userEmail: 'cli@kullanici', baseUrl: url });
            const hostname = new URL(url).hostname;
            const filename = `SEO-Analiz-Raporu-${hostname}.pdf`;
            require('fs').writeFileSync(filename, pdfBuffer);
            console.log(c('green', `  ✓ Rapor indirildi: ${c('bold', filename)}`));
        } catch (e) {
            console.log(c('yellow', `  ⚠️ PDF oluşturulamadı: ${e.message}`));
        }
    }

    // Puan kaybı özeti
    if (impact && Array.isArray(impact) && impact.length > 0) {
        printSection('📉 Puan Kazanım Potansiyeli');
        const totalPotential = impact.reduce((a, i) => a + (i.estimatedGain || 0), 0);
        console.log(`  Düzeltilebilir eksikliklerle yaklaşık ${c('bold', c('green', `+${totalPotential} puan`))} kazanılabilir.`);
    }

    console.log(`\n${c('green', '✔ Denetim tamamlandı.')} ${c('dim', `(${formatMs(Date.now() - started)})`)}`);

    // Web arayüzü çalışıyorsa bağlantı göster, çalışmıyorsa nasıl başlatılacağını söyle
    const webPort = process.env.PORT || 3000;
    const net = require('net');
    const isWebUp = await new Promise((resolve) => {
        const sock = net.connect(webPort, '127.0.0.1');
        sock.once('connect', () => { sock.destroy(); resolve(true); });
        sock.once('error', () => resolve(false));
    });
    if (isWebUp) {
        console.log(`${c('dim', '📊 Web arayüzü ile detaylı rapor:')} ${c('cyan', `http://localhost:${webPort}/result?url=${encodeURIComponent(url)}`)}\n`);
    } else {
        console.log(`${c('dim', '📊 Web arayüzü şu an çalışmıyor. Çalıştırmak için:')}`);
        console.log(`${c('cyan', '    npm start')}   ${c('dim', 'veya web arayüzünü ayrı bir terminalde başlatın')}`);
        console.log(`${c('dim', '    Sonra tarayıcıda açın:')} ${c('cyan', `http://localhost:${webPort}/result?url=${encodeURIComponent(url)}`)}\n`);
    }
}

// ─── ALT KOMUT: compare (rakip karşılaştırma) ───
async function compare(urlA, urlB) {
    console.log(banner);
    console.log(c('cyan', `⚔️ Rakip Karşılaştırma: ${urlA}  vs  ${urlB}\n`));
    const result = await compareSites(urlA, urlB);
    console.log(JSON.stringify(result, null, 2));
}

// ─── ALT KOMUT: sitemap ───
async function sitemap(url) {
    console.log(banner);
    console.log(c('cyan', `🗺️ XML Sitemap oluşturuluyor: ${url}\n`));
    const crawlData = await crawlSite(url);
    const urls = crawlData.pages.map(p => p.url);
    const xml = generateSitemap(urls, url);
    console.log(xml);
}

// ─── ALT KOMUT: config (AI API anahtarı ayarlama) ───
const CONFIG_PATH = path.join(os.homedir(), '.seo-audit.env');

const readline = require('readline');

// Satır satır okuma yapan sağlam bir prompt (piped stdin dahil çalışır)
function createPrompter() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const queue = [];
    let waiting = null;
    rl.on('line', (line) => {
        if (waiting) {
            const w = waiting; waiting = null;
            w.resolve(line.trim());
        } else {
            queue.push(line.trim());
        }
    });
    rl.on('close', () => { if (waiting) waiting.resolve(''); });
    return function ask(question) {
        return new Promise((resolve) => {
            process.stdout.write(question);
            if (queue.length > 0) {
                resolve(queue.shift());
            } else if (process.stdin.isTTY) {
                waiting = { resolve };
            } else {
                // TTY değil: satırı bekle, close olursa boş dön
                waiting = { resolve };
            }
        });
    };
}

async function configCommand() {
    const ask = createPrompter();
    console.log(banner);
    printSection('🔑 AI Raporu Yapılandırması');
    console.log(c('dim', 'AI uzman raporu için bir yapay zeka API anahtarı girin.'));
    console.log(c('dim', 'Anahtarlar güvenli şekilde ev dizininizde saklanır: ' + CONFIG_PATH + '\n'));

    // Mevcut yapılandırmayı göster
    const existing = fs.existsSync(CONFIG_PATH) ? fs.readFileSync(CONFIG_PATH, 'utf8') : '';
    const existingKey = (existing.match(/ANTHROPIC_API_KEY=(.+)/) || [])[1] || '';
    const existingUrl = (existing.match(/AI_API_URL=(.+)/) || [])[1] || '';
    const existingModel = (existing.match(/AI_MODEL=(.+)/) || [])[1] || '';

    console.log(c('bold', 'Seçenek 1: Claude (Anthropic resmi API)'));
    console.log(c('dim', '  Anahtar: https://console.anthropic.com/settings/keys'));
    console.log(c('bold', 'Seçenek 2: 9routers gibi bir lokal proxy'));
    console.log(c('dim', '  AI_API_URL + AI_MODEL + (proxy anahtarı)\n'));

    let apiKey = await ask(c('cyan', 'ANTHROPIC_API_KEY girin') + c('dim', (existingKey ? ` [mevcut: ${existingKey.slice(0, 8)}...]` : ' (boş bırakılırsa değişmez)') + ': '));
    let apiUrl = await ask(c('cyan', 'AI_API_URL girin') + c('dim', ' (proxy varsa, ör. http://localhost:20128/v1, boş = Claude API)') + c('dim', existingUrl ? ` [mevcut: ${existingUrl}]` : '') + ': ');
    let apiModel = await ask(c('cyan', 'AI_MODEL girin') + c('dim', existingModel ? ` [mevcut: ${existingModel}]` : ' (boş = claude-sonnet-4-5)') + ': ');

    // Boş bırakılanları mevcut değerlerle koru
    apiKey = apiKey || existingKey;
    apiUrl = apiUrl || existingUrl;
    apiModel = apiModel || existingModel || 'claude-sonnet-4-5';

    const lines = [
        `ANTHROPIC_API_KEY=${apiKey}`,
        apiUrl ? `AI_API_URL=${apiUrl}` : '# AI_API_URL=',
        `AI_MODEL=${apiModel}`
    ];
    fs.writeFileSync(CONFIG_PATH, lines.join('\n') + '\n', { mode: 0o600 });

    console.log('');
    console.log(c('green', '✔ Yapılandırma kaydedildi: ') + c('bold', CONFIG_PATH));
    console.log(c('dim', 'Artık AI raporu üretilebilir. Deneyin:'));
    console.log(c('cyan', '  seo-audit audit https://example.com'));
    process.exitCode = 0;
}

// ─── KOMUT AYRışTIRMA ───
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const rest = args.slice(1);

    if (!command || command === '--help' || command === '-h' || command === 'help') {
        console.log(banner);
        console.log(c('bold', 'KULLANIM:'));
        console.log(`  ${c('cyan', 'seo-audit')} ${c('green', 'audit')} <URL> [--pdf]          ${c('dim', '# Tam site SEO denetimi (+ PDF)')}`);
        console.log(`  ${c('cyan', 'seo-audit')} ${c('green', 'compare')} <URL-A> <URL-B>     ${c('dim', '# Rakip karşılaştırma')}`);
        console.log(`  ${c('cyan', 'seo-audit')} ${c('green', 'sitemap')} <URL>               ${c('dim', '# XML sitemap üret')}`);
        console.log(`  ${c('cyan', 'seo-audit')} ${c('green', 'config')}                     ${c('dim', '# AI API anahtarını ayarla')}`);
        console.log(`  ${c('cyan', 'seo-audit')} ${c('green', '--version')}                   ${c('dim', '# Sürüm bilgisi')}`);
        console.log('');
        console.log(c('bold', 'ÖRNEKLER:'));
        console.log(`  seo-audit config`);
        console.log(`  seo-audit audit https://example.com`);
        console.log(`  seo-audit audit https://example.com --pdf`);
        console.log(`  seo-audit compare https://example.com https://example.org`);
        console.log('');
        console.log(c('dim', hasAIKey ? '✅ AI anahtarı yapılandırılmış.' : '⚠️ AI raporu için: seo-audit config'));
        return;
    }

    if (command === '--version' || command === '-v') {
        console.log('seo-optimizer v1.1.0 (CLI) — © 2026 kuveylan');
        return;
    }

    if (command === 'config') {
        await configCommand();
        return;
    }

    if (command === 'audit') {
        const url = rest[0];
        if (!url) {
            console.error(c('red', '❌ Hata: URL gerekli.'));
            console.error(c('dim', '  Kullanım: seo-audit audit https://example.com'));
            process.exitCode = 1;
            return;
        }
        await audit(url, { pdf: rest.includes('--pdf') });
        return;
    }

    if (command === 'compare') {
        const [urlA, urlB] = rest;
        if (!urlA || !urlB) {
            console.error(c('red', '❌ Hata: İki URL gerekli.'));
            console.error(c('dim', '  Kullanım: seo-audit compare https://a.com https://b.com'));
            process.exitCode = 1;
            return;
        }
        await compare(urlA, urlB);
        return;
    }

    if (command === 'sitemap') {
        const url = rest[0];
        if (!url) {
            console.error(c('red', '❌ Hata: URL gerekli.'));
            process.exitCode = 1;
            return;
        }
        await sitemap(url);
        return;
    }

    console.error(c('red', `❌ Bilinmeyen komut: ${command}`));
    console.error(c('dim', 'Yardım için: seo-audit --help'));
    process.exitCode = 1;
}

main().catch((e) => {
    console.error(c('red', `❌ Beklenmeyen hata: ${e.message}`));
    console.error(e.stack);
    process.exitCode = 1;
});
