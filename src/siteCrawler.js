/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { analyzeKeywords } = require('./keywordAnalyzer');
const { checkAiReadiness, calculateGeoScore } = require('./geoReadyEngine');
const { analyzeOnPageSEO } = require('./scraper');

/**
 * Tam Site Crawler (siteone-crawler metodolojisiyle)
 *
 * 1. Sitemap.xml'den URL'leri çeker
 * 2. Sitemap yoksa ana sayfadan iç linkleri keşfeder (BFS)
 * 3. Tüm sayfaları PARALEL olarak tarar (durum kodu, TTFB, H1, title, description)
 * 4. 404/5xx hatalı sayfaları ve yavaş URL'leri raporlar
 * 5. GEO/AI görünürlük skorunu hesaplar
 */

const MAX_PAGES = 15;        // Demo için max 15 sayfa (gerçek kullanımda artırılabilir)
const CONCURRENCY = 5;       // Aynı anda 5 sayfa taranacak
const REQUEST_TIMEOUT = 12000;
const MAX_LINK_CHECKS = 40;  // Sayfa başına kontrol edilecek maksimum link
const LINK_CONCURRENCY = 5;  // Link kontrol paralellik seviyesi

async function fetchHtml(url) {
    const startTime = Date.now();
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: REQUEST_TIMEOUT,
            validateStatus: (s) => s < 500
        });
        return {
            url,
            statusCode: response.status,
            responseTimeMs: Date.now() - startTime,
            html: response.data,
            headers: response.headers || {},
            error: null
        };
    } catch (error) {
        return {
            url,
            statusCode: 0,
            responseTimeMs: Date.now() - startTime,
            html: '',
            headers: {},
            error: error.message
        };
    }
}

// 1. Sitemap.xml'den URL'leri çek
async function fetchSitemapUrls(baseUrl) {
    try {
        const sitemapUrl = new URL('/sitemap.xml', baseUrl).href;
        console.log(`🗺️ Sitemap aranıyor: ${sitemapUrl}`);
        const response = await axios.get(sitemapUrl, { timeout: 8000 });
        const $ = cheerio.load(response.data, { xmlMode: true });
        const urls = [];
        $('loc').each((i, el) => {
            const href = $(el).text().trim();
            if (href) urls.push(href);
        });
        if (urls.length > 0) {
            console.log(`✓ Sitemap'te ${urls.length} sayfa bulundu.`);
            return urls;
        }
        console.log('⚠️ Sitemap boş, ana sayfadan link keşfi yapılacak.');
        return null;
    } catch (e) {
        console.log('⚠️ Sitemap bulunamadı, ana sayfadan link keşfi yapılacak.');
        return null;
    }
}

// 2. Ana sayfadan iç linkleri BFS ile keşfet
async function discoverLinksFromHomepage(baseUrl, limit = MAX_PAGES) {
    const discovered = new Set([baseUrl]);
    const queue = [baseUrl];
    const parsedBase = new URL(baseUrl);
    const internalRegex = new RegExp(`^https?://(www\\.)?${parsedBase.hostname.replace(/\./g, '\\.')}`);

    while (queue.length > 0 && discovered.size < limit) {
        const current = queue.shift();
        try {
            const res = await fetchHtml(current);
            if (res.html) {
                const $ = cheerio.load(res.html);
                $('a[href]').each((i, el) => {
                    const href = $(el).attr('href');
                    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
                    try {
                        const abs = new URL(href, baseUrl).href;
                        // Sadece aynı hostname, http(s), ve ana sayfa dışında
                        if (internalRegex.test(abs) && abs.startsWith('http') && !discovered.has(abs)) {
                            discovered.add(abs);
                            queue.push(abs);
                        }
                    } catch (e) {}
                });
            }
        } catch (e) {
            // Bu sayfayı atla
        }
    }

    console.log(`✓ Ana sayfadan ${discovered.size} sayfa keşfedildi (BFS).`);
    return [...discovered].slice(0, limit);
}

// Tek bir linkin sağlığını HEAD + (gerekirse) GET ile doğrula
async function checkLinkHealth(link, baseHostname) {
    const parsedBase = new URL(link);
    const isInternal = parsedBase.hostname === baseHostname ||
        parsedBase.hostname === `www.${baseHostname}` ||
        `www.${parsedBase.hostname}` === baseHostname;
    const isNofollow = false; // ayrı geçilecek

    try {
        // Önce HEAD isteği (hafif)
        let response;
        try {
            response = await axios.head(link, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 6000,
                validateStatus: () => true, // tüm durumları al
                maxRedirects: 5
            });
        } catch (headErr) {
            // HEAD desteklenmiyorsa GET dene
            try {
                response = await axios.get(link, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    timeout: 6000,
                    validateStatus: () => true,
                    maxRedirects: 5
                });
            } catch (getErr) {
                return { url: link, status: 'Kritik', statusCode: 0, isBroken: true, isInternal };
            }
        }

        const status = response.status;
        const isBroken = status >= 400;
        return {
            url: link,
            status: status >= 400 ? 'Kırık' : (status >= 300 ? 'Yönlendirme' : 'İyi'),
            statusCode: status,
            isBroken,
            isInternal
        };
    } catch (e) {
        return { url: link, status: 'Hata', statusCode: 0, isBroken: true, isInternal };
    }
}

// 3. Sayfa başına derin analiz
async function analyzePage(raw) {
    const { url, statusCode, responseTimeMs, html, headers } = raw;
    const $ = cheerio.load(html || '');
    const parsedPage = new URL(url);
    const baseHostname = parsedPage.hostname;

    // Title & Meta
    const title = $('title').text().trim() || '';
    const description = $('meta[name="description"]').attr('content') || '';
    const viewport = $('meta[name="viewport"]').attr('content') || '';

    // Headings (tüm seviyeler)
    const h1Texts = [];
    let h2Count = 0, h3Count = 0, h4Count = 0, h5Count = 0, h6Count = 0;
    $('h1').each((i, el) => h1Texts.push($(el).text().trim()));
    h2Count = $('h2').length;
    h3Count = $('h3').length;
    h4Count = $('h4').length;
    h5Count = $('h5').length;
    h6Count = $('h6').length;

    // Görseller
    let totalImages = 0, imagesWithoutAlt = 0;
    $('img').each((i, el) => {
        totalImages++;
        if (!$(el).attr('alt') || $(el).attr('alt').trim() === '') imagesWithoutAlt++;
    });

    // Schema.org / JSON-LD tespiti
    let schemaOrgCount = 0;
    const schemaTypes = [];
    $('script[type="application/ld+json"]').each((i, el) => {
        schemaOrgCount++;
        try {
            const parsed = JSON.parse($(el).contents().text() || '{}');
            const type = parsed['@type'] || (parsed['@graph'] && parsed['@graph'][0] && parsed['@graph'][0]['@type']);
            if (type) schemaTypes.push(Array.isArray(type) ? type[0] : type);
        } catch (e) { /* JSON parse hatası, devam */ }
    });

    // Google Analytics / analiz aracı tespiti
    const fullHtml = (html || '').toLowerCase();
    const hasAnalytics = /google-analytics|gtag\(|googletagmanager|analytics\.js|hotjar|matomo|plausible|fathom|clarity\.microsoft/.test(fullHtml);

    // İçerik boyutu (kelime sayısı)
    $('script, style, noscript').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').filter(w => w.length > 0).length;

    // Linkler (iç/dış/nofollow ayrımı)
    const internalLinks = [];
    const externalLinks = [];
    let nofollowCount = 0;
    $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
        let abs;
        try { abs = new URL(href, url).href; } catch (e) { return; }
        if (abs.startsWith('http')) {
            const parsed = new URL(abs);
            const isInternal = parsed.hostname === baseHostname ||
                parsed.hostname === `www.${baseHostname}` ||
                `www.${parsed.hostname}` === baseHostname;
            const rel = ($(el).attr('rel') || '').toLowerCase();
            const isNofollow = rel.includes('nofollow');
            if (isNofollow) nofollowCount++;
            if (isInternal) internalLinks.push(abs);
            else externalLinks.push(abs);
        }
    });
    const totalLinks = internalLinks.length + externalLinks.length;

    // Kırık link kontrolü (ilk MAX_LINK_CHECKS kadar, paralel)
    let brokenLinks = [];
    let brokenLinksCount = 0;
    const uniqueLinks = [...new Set([...internalLinks, ...externalLinks])].slice(0, MAX_LINK_CHECKS);
    if (uniqueLinks.length > 0) {
        const checks = [];
        for (let i = 0; i < uniqueLinks.length; i += LINK_CONCURRENCY) {
            const batch = uniqueLinks.slice(i, i + LINK_CONCURRENCY);
            checks.push(...await Promise.all(batch.map(l => checkLinkHealth(l, baseHostname))));
        }
        brokenLinks = checks.filter(c => c.isBroken);
        brokenLinksCount = brokenLinks.length;
    }

    return {
        url,
        statusCode,
        responseTimeMs,
        title,
        titleLength: title.length,
        description,
        descriptionLength: description.length,
        hasViewport: viewport.length > 0,
        h1Count: h1Texts.length,
        h1Texts,
        h2Count, h3Count, h4Count, h5Count, h6Count,
        totalImages,
        imagesWithoutAlt,
        totalLinks,
        internalLinks: internalLinks.length,
        externalLinks: externalLinks.length,
        nofollowCount,
        brokenLinksCount,
        brokenLinks: brokenLinks.slice(0, 10),
        wordCount,
        hasAnalytics,
        schemaOrgCount,
        schemaTypes: [...new Set(schemaTypes)].slice(0, 10),
        keywords: analyzeKeywords(html || ''),
        isError: statusCode >= 400,
        isSlow: responseTimeMs > 2000,
        securityHeaders: {
            'Content-Security-Policy': !!headers['content-security-policy'],
            'X-Frame-Options': !!headers['x-frame-options'],
            'X-Content-Type-Options': !!headers['x-content-type-options'],
            'Strict-Transport-Security': !!headers['strict-transport-security'],
            'Referrer-Policy': !!headers['referrer-policy']
        },
        compressionUsed: !!headers['content-encoding'] && ['gzip', 'br', 'deflate'].includes(headers['content-encoding'].toLowerCase()),
        server: headers['server'] || 'Bilinmiyor'
    };
}

// 4. Ana crawl fonksiyonu
async function crawlSite(baseUrl) {
    console.log(`\n🔍 SITEONE CRAWLER MODU: Tam site taraması başlıyor -> ${baseUrl}`);

    // URL'leri bul
    let urls = await fetchSitemapUrls(baseUrl);
    if (!urls) {
        urls = await discoverLinksFromHomepage(baseUrl);
    }

    // Paralel tarama (concurrency limit)
    const results = [];
    const queue = [...urls].slice(0, MAX_PAGES);
    console.log(`🔎 ${queue.length} sayfa taranacak (paralellik: ${CONCURRENCY})...`);

    for (let i = 0; i < queue.length; i += CONCURRENCY) {
        const batch = queue.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map(url => fetchHtml(url)));
        for (const raw of batchResults) {
            const analyzed = await analyzePage(raw);
            results.push(analyzed);
            const status = analyzed.isError ? `❌ ${analyzed.statusCode}` : (analyzed.isSlow ? `🐢 ${analyzed.responseTimeMs}ms` : `✅ ${analyzed.responseTimeMs}ms`);
            console.log(`  ${analyzed.url} -> ${status}`);
        }
    }

    // Özet istatistikler
    const errorPages = results.filter(r => r.isError);
    const slowPages = results.filter(r => r.isSlow).sort((a, b) => b.responseTimeMs - a.responseTimeMs);
    const avgResponse = Math.round(results.reduce((a, r) => a + r.responseTimeMs, 0) / (results.length || 1));

    // GEO / AI görünürlük analizi (ana sayfa için)
    let geoData = null;
    try {
        const aiReadiness = await checkAiReadiness(baseUrl);
        const mainPage = results[0] || {};
        geoData = calculateGeoScore({
            social: { ogComplete: false },
            headings: { h1Count: mainPage.h1Count || 0 },
            keywords: mainPage.keywords,
            technical: { hasViewport: mainPage.hasViewport },
            performance: { responseTimeMs: mainPage.responseTimeMs }
        }, aiReadiness);
    } catch (e) {
        console.log('⚠️ GEO analizi yapılamadı:', e.message);
    }

    // Sayfa geneli kırık link istatistikleri
    const totalBrokenLinks = results.reduce((a, r) => a + (r.brokenLinksCount || 0), 0);
    const totalInternalLinks = results.reduce((a, r) => a + (r.internalLinks || 0), 0);
    const totalExternalLinks = results.reduce((a, r) => a + (r.externalLinks || 0), 0);

    console.log(`\n📊 TARAMA ÖZETİ: ${results.length} sayfa | ${errorPages.length} hata | ${slowPages.length} yavaş | Ortalama yanıt: ${avgResponse}ms\n`);

    return {
        baseUrl,
        totalPagesScanned: results.length,
        totalErrors: errorPages.length,
        totalSlow: slowPages.length,
        avgResponseTimeMs: avgResponse,
        pages: results,
        geo: geoData,
        slowestPages: slowPages.slice(0, 5),
        errorPages: errorPages.slice(0, 10),
        linkHealth: {
            totalChecked: results.reduce((a, r) => a + (r.totalLinks || 0), 0),
            totalBrokenLinks,
            totalInternalLinks,
            totalExternalLinks
        }
    };
}

module.exports = { crawlSite };
