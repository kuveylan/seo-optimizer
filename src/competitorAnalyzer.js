/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
/**
 * Rakip Karşılaştırma Analiz Modülü
 *
 * İki web sitesini yan yana karşılaştırır: SEO skorları, performans,
 * içerik durumu, link sağlığı ve anahtar kelime kapsamı.
 * SEOptimer'ın "Rakip Ekle" özelliğine benzer şekilde çalışır.
 */

const { crawlSite } = require('./siteCrawler');
const { scoreSite } = require('./scoreEngine');
const { detectIssues } = require('./reportIssues');

// Crawler verilerini scoreEngine formatına dönüştür (server.js ile aynı mantık)
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

/**
 * İki siteyi paralel tara ve karşılaştır
 * @param {string} siteA - Ana site URL'si
 * @param {string} siteB - Rakip site URL'si
 */
async function compareSites(siteA, siteB) {
    const [crawlA, crawlB] = await Promise.all([
        crawlSite(siteA),
        crawlSite(siteB)
    ]);

    const scanA = buildScanData(crawlA);
    const scanB = buildScanData(crawlB);

    const scoreA = scoreSite(scanA);
    const scoreB = scoreSite(scanB);

    const issuesA = detectIssues(scanA, crawlA);
    const issuesB = detectIssues(scanB, crawlB);

    // Anahtar kelime karşılaştırması
    const keywordsA = scanA.pages[0] ? (scanA.pages[0].keywords?.topKeywords || []).slice(0, 10) : [];
    const keywordsB = scanB.pages[0] ? (scanB.pages[0].keywords?.topKeywords || []).slice(0, 10) : [];

    const comparison = {
        sites: {
            A: {
                url: siteA,
                score: scoreA ? scoreA.scores : null,
                labels: scoreA ? scoreA.labels : null,
                issuesCount: issuesA.length,
                crawl: {
                    pages: crawlA.totalPagesScanned,
                    avgResponseMs: crawlA.avgResponseTimeMs,
                    brokenLinks: crawlA.linkHealth ? crawlA.linkHealth.totalBrokenLinks : 0,
                    totalLinks: crawlA.linkHealth ? crawlA.linkHealth.totalChecked : 0,
                    internalLinks: crawlA.linkHealth ? crawlA.linkHealth.totalInternalLinks : 0,
                    externalLinks: crawlA.linkHealth ? crawlA.linkHealth.totalExternalLinks : 0
                },
                content: scanA.pages[0]?.content || {},
                keywords: keywordsA
            },
            B: {
                url: siteB,
                score: scoreB ? scoreB.scores : null,
                labels: scoreB ? scoreB.labels : null,
                issuesCount: issuesB.length,
                crawl: {
                    pages: crawlB.totalPagesScanned,
                    avgResponseMs: crawlB.avgResponseTimeMs,
                    brokenLinks: crawlB.linkHealth ? crawlB.linkHealth.totalBrokenLinks : 0,
                    totalLinks: crawlB.linkHealth ? crawlB.linkHealth.totalChecked : 0,
                    internalLinks: crawlB.linkHealth ? crawlB.linkHealth.totalInternalLinks : 0,
                    externalLinks: crawlB.linkHealth ? crawlB.linkHealth.totalExternalLinks : 0
                },
                content: scanB.pages[0]?.content || {},
                keywords: keywordsB
            }
        },
        // Kazananı belirle
        winner: null,
        differences: []
    };

    // Genel skor karşılaştırması
    const scoreAv = scoreA ? scoreA.scores.overall : 0;
    const scoreBv = scoreB ? scoreB.scores.overall : 0;
    comparison.winner = scoreAv > scoreBv ? 'A' : (scoreBv > scoreAv ? 'B' : 'Tie');

    // Kategori farklılıkları
    const categories = ['performance', 'seo', 'accessibility', 'bestPractices', 'security'];
    for (const cat of categories) {
        const va = scoreA ? scoreA.scores[cat] : 0;
        const vb = scoreB ? scoreB.scores[cat] : 0;
        if (va !== vb) {
            comparison.differences.push({
                category: cat,
                siteA: va,
                siteB: vb,
                diff: va - vb,
                advantage: va > vb ? 'A' : 'B'
            });
        }
    }

    return comparison;
}

module.exports = { compareSites };
