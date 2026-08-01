/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.private', '.env') });
const express = require('express');
const path = require('path');
const { analyzeSiteComprehensively } = require('./advancedScraper');
const { analyzeWithAI } = require('./aiAgent');
const { scoreSite } = require('./scoreEngine');
const { crawlSite } = require('./siteCrawler');
const { detectIssues, scoreImpact } = require('./reportIssues');
const { generatePdfReport } = require('./pdfReportGenerator');
const { compareSites } = require('./competitorAnalyzer');
const { generateSitemap, generateRobotsTxt, generateMetaTags, generateHtaccess } = require('./seoToolbox');
const { sendReportEmail, isEmailConfigured } = require('./emailSender');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS Şablon Motoru Kurulumu
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Statik Dosyalar (CSS, JS, görseller) - SEO ve performans için ayrı dosyalar
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Bellekte geçici rapor saklama (PDF export için)
const reportCache = new Map();

/**
 * Raporu sakla (PDF indirme için tekrar tarama yapmaya gerek kalmaz)
 * Anahtar: URL | Değer: son tamamlanan analiz verisi
 */
function cacheReport(url, data) {
    const key = String(url).trim().replace(/\/+$/, '');
    reportCache.set(key, { ...data, cachedAt: Date.now() });
    // Bellek şişmesini önlemek için en fazla 50 rapor tut
    if (reportCache.size > 50) {
        const oldestKey = reportCache.keys().next().value;
        reportCache.delete(oldestKey);
    }
}

// Crawler verilerini scoreEngine'in beklediği formata dönüştürür
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

// ──────────────────────────────────────────────
// ROTA 1: SEO-optimize edilmiş Landing Page (Ana Sayfa)
// ──────────────────────────────────────────────
app.get('/', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.render('index', {
        title: 'SEO Optimizer | Ücretsiz Site Taraması ve Kurumsal SEO Raporu',
        emailConfigured: isEmailConfigured(),
        baseUrl
    });
});

// ──────────────────────────────────────────────
// ROTA 2: Analiz Başlatma (Loading Ekranı)
// ──────────────────────────────────────────────
app.post('/audit', async (req, res) => {
    const targetUrl = req.body.url;
    const userEmail = req.body.email;

    if (!targetUrl) return res.redirect('/');

    res.render('loading', {
        targetUrl,
        userEmail: userEmail || '',
        redirectDelay: 1000
    });
});

// ──────────────────────────────────────────────
// ROTA 3: SEO Analiz Sonuçları
// ──────────────────────────────────────────────
app.get('/result', async (req, res) => {
    const targetUrl = req.query.url;
    const userEmail = req.query.email || '';
    if (!targetUrl) return res.redirect('/');

    try {
        // Tam site crawler ile tüm siteyi tara (siteone-crawler modu)
        const crawlData = await crawlSite(targetUrl);
        const scanData = buildScanData(crawlData);

        const scored = scoreSite(scanData);
        const issues = detectIssues(scanData, crawlData);
        const impact = scoreImpact(scored, issues);

        // Bellekte sakla (PDF indirme endpoint'i için)
        cacheReport(targetUrl, { scanData, crawlData, scored, issues, aiReport: null, userEmail, baseUrl: targetUrl });

        let aiReport = "API anahtarı girilmediği için AI raporu üretilemedi. Lütfen .env dosyasına ANTHROPIC_API_KEY ekleyin.";

        if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here') {
            const aiInput = {
                ...scanData,
                siteScore: scored,
                detectedIssues: issues,
                crawlSummary: {
                    totalPagesScanned: crawlData.totalPagesScanned,
                    totalErrors: crawlData.totalErrors,
                    totalSlow: crawlData.totalSlow,
                    avgResponseTimeMs: crawlData.avgResponseTimeMs
                }
            };
            aiReport = await analyzeWithAI(aiInput);
            cacheReport(targetUrl, { scanData, crawlData, scored, issues, aiReport, userEmail, baseUrl: targetUrl });
        }

        res.render('result', {
            targetUrl,
            userEmail,
            emailConfigured: isEmailConfigured(),
            scanData,
            crawlData,
            scored,
            issues,
            impact,
            aiReport
        });
    } catch (error) {
        res.status(500).send(`Hata oluştu: ${error.message}`);
    }
});

// ──────────────────────────────────────────────
// ROTA 4: Profesyonel PDF Raporu İndirme
// ──────────────────────────────────────────────
app.get('/download-pdf', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL parametresi gerekli.');

    const key = String(targetUrl).trim().replace(/\/+$/, '');
    let cached = reportCache.get(key);

    try {
        // Eğer cache'de yoksa hızlıca yeniden tara
        if (!cached) {
            const crawlData = await crawlSite(targetUrl);
            const scanData = buildScanData(crawlData);
            const scored = scoreSite(scanData);
            const issues = detectIssues(scanData, crawlData);
            cached = { scanData, crawlData, scored, issues, aiReport: 'SEO Denetim ve Analiz Raporu', userEmail: 'musteri@site.com', baseUrl: targetUrl };
        }

        const pdfBuffer = await generatePdfReport(cached);

        const filename = `SEO-Analiz-Raporu-${encodeURIComponent(new URL(targetUrl).hostname)}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);

    } catch (e) {
        res.status(500).send(`PDF oluşturulurken hata oluştu: ${e.message}`);
    }
});

// ──────────────────────────────────────────────
// ROTA 5: Rakip Karşılaştırma (GET form + POST sonuç)
// ──────────────────────────────────────────────
app.get('/compare', (req, res) => {
    res.render('compare', {
        result: null,
        error: null
    });
});

app.post('/compare', async (req, res) => {
    const siteA = req.body.siteA;
    const siteB = req.body.siteB;

    if (!siteA || !siteB) {
        return res.render('compare', { result: null, error: 'Lütfen iki site URL\'si de girin.' });
    }

    try {
        console.log(`\n⚔️ Rakip Karşılaştırma başlıyor: ${siteA} vs ${siteB}`);
        const result = await compareSites(siteA, siteB);
        res.render('compare', { result, error: null });
    } catch (e) {
        res.render('compare', { result: null, error: `Karşılaştırma hatası: ${e.message}` });
    }
});

// ──────────────────────────────────────────────
// ROTA 6: Ücretsiz SEO Araç Kutusu
// ──────────────────────────────────────────────
app.get('/tools', (req, res) => {
    res.render('tools', {
        generated: null,
        type: null,
        error: null
    });
});

app.post('/tools', (req, res) => {
    const { type, urls, baseUrl, allowAllBots, blockAiBots, title, description, siteName, ogImage, httpsRedirect, gzip, securityHeaders } = req.body;

    let generated = '';
    try {
        switch (type) {
            case 'sitemap': {
                const urlList = (urls || '').split('\n').map(u => u.trim()).filter(Boolean);
                if (!baseUrl && urlList.length === 0) throw new Error('URL listesi veya base URL gerekli.');
                generated = generateSitemap(urlList, baseUrl || 'https://' + (siteName || 'ornek.com'));
                break;
            }
            case 'robots': {
                generated = generateRobotsTxt({
                    baseUrl: baseUrl || 'https://ornek.com',
                    allowAllBots: allowAllBots === 'on',
                    blockAiBots: blockAiBots === 'on'
                });
                break;
            }
            case 'meta': {
                generated = generateMetaTags({ title, description, siteName, ogImage });
                break;
            }
            case 'htaccess': {
                generated = generateHtaccess({
                    httpsRedirect: httpsRedirect === 'on',
                    gzip: gzip === 'on',
                    securityHeaders: securityHeaders === 'on'
                });
                break;
            }
            default:
                throw new Error('Bilinmeyen araç türü.');
        }
        res.render('tools', { generated, type, error: null });
    } catch (e) {
        res.render('tools', { generated: null, type, error: e.message });
    }
});

// Araç çıktısını indirme
app.post('/tools/download', (req, res) => {
    const { content, type } = req.body;
    const extensions = { sitemap: 'xml', robots: 'txt', meta: 'html', htaccess: 'htaccess' };
    const filename = `seo-${type}.${extensions[type] || 'txt'}`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content || '');
});

// ──────────────────────────────────────────────
// ROTA 7: E-posta ile Rapor Gönderimi
// ──────────────────────────────────────────────
app.post('/send-report', async (req, res) => {
    const { url, email } = req.body;
    if (!url || !email) return res.status(400).json({ error: 'URL ve e-posta gerekli.' });
    if (!isEmailConfigured()) return res.status(400).json({ success: false, message: 'E-posta gönderimi yapılandırılmadı (SMTP).' });

    const key = String(url).trim().replace(/\/+$/, '');
    const cached = reportCache.get(key);

    try {
        let cachedData = cached;
        if (!cachedData) {
            const crawlData = await crawlSite(url);
            const scanData = buildScanData(crawlData);
            const scored = scoreSite(scanData);
            const issues = detectIssues(scanData, crawlData);
            cachedData = { scanData, crawlData, scored, issues, aiReport: null, userEmail: email, baseUrl: url };
            cacheReport(url, cachedData);
        }

        // AI raporu cache'de yoksa ve API varsa üret
        if (!cachedData.aiReport && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here') {
            const aiInput = {
                ...cachedData.scanData,
                siteScore: cachedData.scored,
                detectedIssues: cachedData.issues,
                crawlSummary: { totalPagesScanned: cachedData.crawlData.totalPagesScanned }
            };
            cachedData.aiReport = await analyzeWithAI(aiInput);
            cacheReport(url, cachedData);
        }

        // PDF üret
        const pdfBuffer = await generatePdfReport(cachedData);
        const hostname = new URL(url).hostname;
        const filename = `SEO-Analiz-Raporu-${encodeURIComponent(hostname)}.pdf`;

        // E-posta gönder
        const result = await sendReportEmail({
            to: email,
            subject: `📊 SEO Denetim Raporunuz Hazır — ${hostname}`,
            htmlBody: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="font-size: 48px;">🚀</div>
                        <h1 style="color: #0f172a; margin: 8px 0;">SEO Denetim Raporunuz Hazır!</h1>
                    </div>
                    <p style="color: #475569; font-size: 15px; line-height: 1.7;">
                        Merhaba,<br><br>
                        <strong>${hostname}</strong> adresli web siteniz için yapay zeka destekli kapsamlı SEO denetimi tamamlandı.
                    </p>
                    <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <div style="font-weight: 700; color: #0f172a; margin-bottom: 8px;">📈 Genel SEO Skorunuz: <span style="font-size: 24px; color: ${cachedData.scored.scores.overall >= 80 ? '#10b981' : '#d97706'};">${cachedData.scored.scores.overall}/100</span></div>
                        <div style="font-size: 13px; color: #64748b;">Tespit edilen sorun: ${cachedData.issues.length}</div>
                    </div>
                    <p style="color: #475569; font-size: 14px; line-height: 1.7;">
                        Tüm eksiklikler, bu eksikliklerin nasıl düzeltileceği ve yapay zeka uzman raporu ekteki PDF dosyasındadır.
                    </p>
                    <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
                        SEO Optimizer tarafından otomatik oluşturulmuştur.
                    </div>
                </div>
            `,
            pdfBuffer,
            pdfFilename: filename
        });

        if (result.sent) {
            res.json({ success: true, message: `Rapor ${email} adresine gönderildi.` });
        } else {
            res.json({ success: false, message: result.reason });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Web Arayüzü Başlatıldı!`);
    console.log(`👉 Tarayıcınızda açın: http://localhost:${PORT}`);
    console.log(`⚔️ Rakip Karşılaştırma: http://localhost:${PORT}/compare`);
    console.log(`🛠️ Ücretsiz SEO Araçları: http://localhost:${PORT}/tools\n`);
});
