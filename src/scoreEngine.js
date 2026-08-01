/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
/**
 * Lighthouse tarzı 0-100 SEO Skorlama Motoru
 *
 * Lighthouse standartlarına göre:
 * - 90-100: Mükemmel (Yeşil)
 * - 50-89:  İyileştirilmeli (Sarı)
 * - 0-49:   Zayıf / Kritik (Kırmızı)
 *
 * Bu motor, ağır Chrome bağımlılığı olmadan kendi hafif
 * tarayıcımızın topladığı verileri Lighthouse formatında skorlar.
 */

function scoreLabel(score) {
    if (score >= 90) return { label: 'Mükemmel', color: 'green', emoji: '🟢' };
    if (score >= 50) return { label: 'İyileştirilmeli', color: 'yellow', emoji: '🟡' };
    return { label: 'Zayıf / Kritik', color: 'red', emoji: '🔴' };
}

function scorePage(page) {
    if (!page || page.error) {
        return null;
    }

    const scores = {};

    // ─── 1. PERFORMANS SKORU (0-100) ───
    // Ölçülen: TTFB (sunucu yanıt süresi)
    let perfScore = 0;
    if (page.performance) {
        const ttfb = page.performance.responseTimeMs;
        if (ttfb !== undefined) {
            if (ttfb <= 200) perfScore = 100;
            else if (ttfb <= 500) perfScore = 90;
            else if (ttfb <= 1000) perfScore = 70;
            else if (ttfb <= 2000) perfScore = 45;
            else if (ttfb <= 4000) perfScore = 25;
            else perfScore = 10;
        }
        if (page.performance.statusCode >= 400) {
            perfScore = Math.max(0, perfScore - 30);
        }
    }
    scores.performance = perfScore;

    // ─── 2. SEO SKORU (0-100) ───
    // Title, Meta Description, H1, Görsel Alt Etiketleri
    let seoScore = 0;
    const seoDeductions = [];

    // Title (25 puan)
    if (page.title) {
        const len = page.title.length;
        if (len >= 10 && len <= 60) seoScore += 25;
        else if (len > 0) seoScore += 10;
        else { seoScore += 0; seoDeductions.push('Title eksik'); }
    }

    // Meta Description (20 puan)
    if (page.description) {
        const len = page.description.length;
        if (len >= 70 && len <= 160) seoScore += 20;
        else if (len > 0) seoScore += 8;
        else { seoScore += 0; seoDeductions.push('Meta Description eksik'); }
    }

    // H1 etiketi (25 puan)
    if (page.headings) {
        if (page.headings.h1Count === 1) seoScore += 25;
        else if (page.headings.h1Count === 0) { seoDeductions.push('H1 eksik'); }
        else seoScore += 15; // birden fazla H1
    }

    // Görsel Alt Etiketleri (20 puan)
    if (page.images) {
        const total = page.images.totalImages || 0;
        const missing = page.images.imagesWithoutAlt || 0;
        if (total > 0) {
            const ratio = 1 - (missing / total);
            seoScore += Math.round(20 * ratio);
        } else {
            seoScore += 10; // görsel yoksa nötr
        }
    }

    // Viewport / Mobil (10 puan)
    if (page.technical) {
        if (page.technical.hasViewport) seoScore += 10;
        else { seoDeductions.push('Viewport eksik (mobil uyumsuz)'); }
    }

    scores.seo = Math.min(100, seoScore);

    // ─── 3. ERİŞİLEBİLİRLİK (ACCESSIBILITY) SKORU (0-100) ───
    // Ölçülen: Alt etiketleri, başlık yapısı
    let a11yScore = 0;
    if (page.images) {
        const total = page.images.totalImages || 0;
        const missing = page.images.imagesWithoutAlt || 0;
        if (total === 0) a11yScore += 50; // görsel yoksa nötr
        else {
            const ratio = 1 - (missing / total);
            a11yScore += Math.round(50 * ratio);
        }
    }
    if (page.headings) {
        // Hiyerarşik başlıklar erişilebilirliği artırır
        if (page.headings.h1Count >= 1) a11yScore += 25;
        if (page.headings.h2Count >= 1) a11yScore += 15;
        if (page.headings.h3Count >= 1) a11yScore += 10;
    }
    scores.accessibility = Math.min(100, a11yScore);

    // ─── 4. BEST PRACTICES SKORU (0-100) ───
    // Ölçülen: Kırık linkler, HTTP durumu, sıkıştırma, canonical, yönlendirme, schema
    let bpScore = 80; // temel değer
    if (page.linkHealth) {
        const broken = page.linkHealth.brokenLinksCount || 0;
        const checked = page.linkHealth.totalChecked || 0;
        if (checked > 0) {
            const brokenRatio = broken / checked;
            bpScore -= Math.round(brokenRatio * 60); // kırık linkler daha ağır
            if (broken > 0) bpScore -= 5; // her kırık link ayrıca ceza
        }
    }
    if (page.performance && page.performance.statusCode >= 400) {
        bpScore -= 30;
    }
    if (page.technical && !page.technical.hasViewport) {
        bpScore -= 10;
    }
    if (page.security && page.security.compressionUsed === false) {
        bpScore -= 10; // sıkıştırma yok
    }
    if (page.canonical && page.canonical.present === false) {
        bpScore -= 10; // canonical eksik
    }
    if (page.redirects && page.redirects.wasRedirected) {
        bpScore -= 5; // yönlendirme
    }
    // Schema.org yapılandırılmış veri +10 (Google için pozitif sinyal)
    if (page.content && page.content.schemaOrgCount > 0) {
        bpScore += 5;
    }
    scores.bestPractices = Math.max(0, bpScore);

    // ─── 5. GÜVENLİK (SECURITY) SKORU (0-100) ───
    // Ölçülen: Security header'ları (siteone-crawler tarzı), sıkıştırma, HTTPS
    let secScore = 50; // temel değer
    if (page.security && page.security.securityHeaderCount !== undefined) {
        secScore += page.security.securityHeaderCount * 10; // her başlık +10
        if (page.security.compressionUsed) secScore += 10;
    }
    if (page.performance && page.performance.statusCode >= 400) {
        secScore -= 20;
    }
    // HTTPS kontrolü
    if (page.url && page.url.startsWith('https://')) {
        secScore += 10;
    }
    scores.security = Math.min(100, Math.max(0, secScore));

    // ─── GENEL SITE SKORU ───
    // Ağırlıklı ortalama (Lighthouse benzeri)
    const weightedTotal =
        (scores.performance * 0.20) +
        (scores.seo * 0.30) +
        (scores.accessibility * 0.10) +
        (scores.bestPractices * 0.20) +
        (scores.security * 0.20);

    scores.overall = Math.round(weightedTotal);

    // Skor etiketleri ve detaylar
    const result = {
        url: page.url,
        scores,
        labels: {
            performance: scoreLabel(scores.performance),
            seo: scoreLabel(scores.seo),
            accessibility: scoreLabel(scores.accessibility),
            bestPractices: scoreLabel(scores.bestPractices),
            security: scoreLabel(scores.security),
            overall: scoreLabel(scores.overall)
        },
        seoDeductions,
        raw: page
    };

    return result;
}

function scoreSite(scanData) {
    const pages = (scanData && scanData.pages) || [];
    const scoredPages = pages.map(scorePage).filter(Boolean);

    if (scoredPages.length === 0) {
        return null;
    }

    // Site geneli ortalama skor
    const avg = (key) => {
        const sum = scoredPages.reduce((acc, p) => acc + (p.scores[key] || 0), 0);
        return Math.round(sum / scoredPages.length);
    };

    const overall = {
        scores: {
            performance: avg('performance'),
            seo: avg('seo'),
            accessibility: avg('accessibility'),
            bestPractices: avg('bestPractices'),
            security: avg('security'),
            overall: avg('overall')
        },
        pages: scoredPages,
        totalPagesScanned: scoredPages.length
    };

    overall.labels = {
        performance: scoreLabel(overall.scores.performance),
        seo: scoreLabel(overall.scores.seo),
        accessibility: scoreLabel(overall.scores.accessibility),
        bestPractices: scoreLabel(overall.scores.bestPractices),
        security: scoreLabel(overall.scores.security),
        overall: scoreLabel(overall.scores.overall)
    };

    return overall;
}

module.exports = { scorePage, scoreSite, scoreLabel };
