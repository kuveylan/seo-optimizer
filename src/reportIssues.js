/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
/**
 * Puan Kaybı / SEO Sorun Tespit Motoru
 *
 * Sitenin genel skorunu (örn. 81/100) aşağı çeken somut, deterministik
 * sorunları tespit eder. Hem web Dashboard'da hem PDF raporunda
 * "Bu sitenin puanı neden 81? İşte puan kırılmasına neden olan sorunlar"
 * şeklinde sunulur. Her sorun için: kategori, önem, kaç sayfayı etkilediği
 * ve nasıl düzeltileceği bilgisi üretilir.
 */

const SEVERITY = {
    KRITIK: 'Kritik',
    ORTA: 'Orta',
    DUSUK: 'Düşük'
};

/**
 * scanData: server.js'de /result rotasında oluşturulan haritalanmış veri
 * crawlData: siteCrawler.js çıktısı (özet bilgiler için)
 */
function detectIssues(scanData, crawlData) {
    const pages = (scanData && scanData.pages) || [];
    const issues = [];

    if (pages.length === 0) return issues;

    const pageCount = pages.length;

    // ─── TITLE ANALİZİ ───
    const titleTooShort = pages.filter(p => p.title && p.title.length > 0 && p.title.length < 10);
    const titleTooLong = pages.filter(p => p.title && p.title.length > 60);
    const titleMissing = pages.filter(p => !p.title || !p.title.text);

    if (titleMissing.length > 0) {
        issues.push(buildIssue({
            id: 'title-missing',
            category: 'On-Page SEO',
            severity: SEVERITY.KRITIK,
            title: `${titleMissing.length} sayfada Title (başlık) etiketi eksik`,
            detail: 'Google başlığı yoksa, içeriğinizi tam olarak anlayamaz ve kendi seçtiği bir metni kullanır.',
            fix: 'Her sayfaya benzersiz, hedef anahtar kelimeyi içeren 50-60 karakterlik bir <title> ekleyin.',
            pages: titleMissing.map(p => p.url)
        }));
    }
    if (titleTooLong.length > 0) {
        issues.push(buildIssue({
            id: 'title-too-long',
            category: 'On-Page SEO',
            severity: SEVERITY.ORTA,
            title: `${titleTooLong.length}/${pageCount} sayfada Title uzunluğu 60 karakteri aşıyor`,
            detail: `Örn: "${titleTooLong[0].title.text}" (${titleTooLong[0].title.length} karakter). Google arama sonuçlarında uzun başlıklar kesilir (maks ~60 karakter görünür).`,
            fix: 'Başlıkları 50-60 karaktere indirin ve en önemli anahtar kelimeyi başa taşıyın.',
            pages: titleTooLong.map(p => p.url)
        }));
    }
    if (titleTooShort.length > 0) {
        issues.push(buildIssue({
            id: 'title-too-short',
            category: 'On-Page SEO',
            severity: SEVERITY.ORTA,
            title: `${titleTooShort.length} sayfada Title çok kısa (10 karakterden az)`,
            detail: 'Çok kısa başlıklar arama motorlarına yeterli bilgi vermez.',
            fix: 'Hedef anahtar kelimeyi de içerecek şekilde en az 10 karakterlik bir başlık yazın.',
            pages: titleTooShort.map(p => p.url)
        }));
    }

    // ─── META DESCRIPTION ANALİZİ ───
    const descMissing = pages.filter(p => !p.description || !p.description.text);
    const descTooLong = pages.filter(p => p.description && p.description.length > 160);
    const descTooShort = pages.filter(p => p.description && p.description.length > 0 && p.description.length < 70);

    if (descMissing.length > 0) {
        issues.push(buildIssue({
            id: 'desc-missing',
            category: 'On-Page SEO',
            severity: SEVERITY.KRITIK,
            title: `${descMissing.length} sayfada Meta Description eksik`,
            detail: 'Meta açıklaması olmayan sayfalar arama sonuçlarında etkisiz görünür ve tıklanma oranı (CTR) düşer.',
            fix: 'Her sayfaya hedef anahtar kelimeyi içeren, 120-155 karakterlik açıklayıcı bir meta description yazın.',
            pages: descMissing.map(p => p.url)
        }));
    }
    if (descTooLong.length > 0) {
        const avgLen = Math.round(descTooLong.reduce((a, p) => a + (p.description.length || 0), 0) / descTooLong.length);
        issues.push(buildIssue({
            id: 'desc-too-long',
            category: 'On-Page SEO',
            severity: SEVERITY.ORTA,
            title: `${descTooLong.length}/${pageCount} sayfada Meta Description uzun (ort. ${avgLen} karakter)`,
            detail: 'Arama sonuçlarında yaklaşık 155-160 karakterden uzun açıklamalar "..." ile kesilir ve okunamaz hale gelir.',
            fix: 'Açıklamaları 120-155 karaktere kısaltın; en önemli bilgiyi ve anahtar kelimeyi ilk 120 karaktere sığdırın.',
            pages: descTooLong.map(p => p.url)
        }));
    }
    if (descTooShort.length > 0) {
        issues.push(buildIssue({
            id: 'desc-too-short',
            category: 'On-Page SEO',
            severity: SEVERITY.DUSUK,
            title: `${descTooShort.length} sayfada Meta Description çok kısa (70 karakterden az)`,
            detail: 'Çok kısa açıklamalar arama sonuçlarında az yer kaplar ve bilgi vermez.',
            fix: 'Açıklamaları 70-155 karakter aralığına getirin.',
            pages: descTooShort.map(p => p.url)
        }));
    }

    // ─── H1 ANALİZİ ───
    const h1Missing = pages.filter(p => p.headings && p.headings.h1Count === 0);
    const h1Multiple = pages.filter(p => p.headings && p.headings.h1Count > 1);

    if (h1Missing.length > 0) {
        issues.push(buildIssue({
            id: 'h1-missing',
            category: 'On-Page SEO',
            severity: SEVERITY.KRITIK,
            title: `${h1Missing.length} sayfada H1 başlığı eksik`,
            detail: 'H1, sayfanın ana konusunu belirten en önemli başlıktır. Eksikse Google sayfanın ne hakkında olduğunu anlamakta zorlanır.',
            fix: 'Her sayfaya hedef anahtar kelimeyi içeren tam 1 adet H1 etiketi ekleyin.',
            pages: h1Missing.map(p => p.url)
        }));
    }
    if (h1Multiple.length > 0) {
        issues.push(buildIssue({
            id: 'h1-multiple',
            category: 'On-Page SEO',
            severity: SEVERITY.ORTA,
            title: `${h1Multiple.length} sayfada birden fazla H1 var (${h1Multiple[0].headings.h1Count} adet)`,
            detail: 'Sayfa başına 1 H1 olması önerilir. Birden fazla H1, ana konunun net olmamasına neden olur.',
            fix: 'Birincil H1 dışındakileri H2 veya H3 olarak değiştirin.',
            pages: h1Multiple.map(p => p.url)
        }));
    }

    // ─── GÖRSEL ALT ETİKETLERİ ───
    const imgMissing = pages.filter(p => p.images && p.images.imagesWithoutAlt > 0);
    if (imgMissing.length > 0) {
        const totalMissing = imgMissing.reduce((a, p) => a + (p.images.imagesWithoutAlt || 0), 0);
        const totalImages = imgMissing.reduce((a, p) => a + (p.images.totalImages || 0), 0);
        issues.push(buildIssue({
            id: 'img-alt-missing',
            category: 'Görsel SEO & Erişilebilirlik',
            severity: SEVERITY.ORTA,
            title: `${totalMissing} görselin alt (alt) metni eksik (${imgMissing.length} sayfada)`,
            detail: 'Alt metni olmayan görseller arama motorlarında bulunamaz ve görme engelli kullanıcılar için erişilemezdir.',
            fix: 'Her görsele içeriğini tanımlayan kısa ve anahtar kelime içeren bir alt metni ekleyin.',
            pages: imgMissing.map(p => p.url)
        }));
    }

    // ─── MOBİL / VIEWPORT ───
    const noViewport = pages.filter(p => p.technical && !p.technical.hasViewport);
    if (noViewport.length > 0) {
        issues.push(buildIssue({
            id: 'no-viewport',
            category: 'Mobil Uyumluluk',
            severity: SEVERITY.KRITIK,
            title: `${noViewport.length} sayfada mobil viewport meta etiketi eksik`,
            detail: 'Google 2015\'ten beri mobile-first indexing kullanır. Viewport yoksa mobil kullanıcılar için siteniz bozuk görünür.',
            fix: '<head> bölümüne <meta name="viewport" content="width=device-width, initial-scale=1"> ekleyin.',
            pages: noViewport.map(p => p.url)
        }));
    }

    // ─── GÜVENLİK BAŞLIKLARI ───
    const firstSecurity = pages[0].security && pages[0].security.securityHeaders;
    if (firstSecurity) {
        const criticalHeaders = {
            'Content-Security-Policy': 'CSP, XSS ve enjeksiyon saldırılarını engeller',
            'Strict-Transport-Security': 'HSTS, HTTPS zorunluluğunu garantiler',
            'X-Content-Type-Options': 'MIME karıştırma saldırılarını önler',
            'X-Frame-Options': 'Clickjacking saldırılarını önler',
            'Referrer-Policy': 'Tarayıcının hangi bilgiyi göndereceğini kontrol eder'
        };
        const missingSecHeaders = Object.entries(criticalHeaders)
            .filter(([h]) => !firstSecurity[h])
            .map(([h, desc]) => ({ name: h, desc }));

        if (missingSecHeaders.length > 0) {
            issues.push(buildIssue({
                id: 'sec-headers-missing',
                category: 'Güvenlik',
                severity: missingSecHeaders.some(s => s.name === 'Strict-Transport-Security' || s.name === 'Content-Security-Policy') ? SEVERITY.ORTA : SEVERITY.DUSUK,
                title: `${missingSecHeaders.length} güvenlik başlığı eksik`,
                detail: `Eksik başlıklar: ${missingSecHeaders.map(s => s.name).join(', ')}. ${missingSecHeaders.map(s => `${s.name}: ${s.desc}`).join('. ')}.`,
                fix: 'Sunucu yapılandırmasında (.htaccess / nginx / hosting paneli) bu başlıkları ekleyin.',
                pages: [pages[0].url]
            }));
        }
    }

    // ─── SIKIŞTIRMA (COMPRESSION) ───
    if (pages[0].security && pages[0].security.compressionUsed === false) {
        issues.push(buildIssue({
            id: 'no-compression',
            category: 'Performans',
            severity: SEVERITY.ORTA,
            title: 'Gzip/Brotli sıkıştırması etkin değil veya doğrulanamadı',
            detail: 'Sıkıştırma kapalıysa HTML/CSS/JS dosyaları çok daha yavaş yüklenir, özellikle mobilde sayfa hızını düşürür.',
            fix: 'Hosting paneli veya sunucuda Gzip (mod_deflate) / Brotli sıkıştırmasını etkinleştirin.',
            pages: [pages[0].url]
        }));
    }

    // ─── HTTPS / HTTP DURUM KODLARI ───
    const errorPages = pages.filter(p => p.performance && p.performance.statusCode >= 400);
    if (errorPages.length > 0) {
        issues.push(buildIssue({
            id: 'http-errors',
            category: 'Teknik SEO',
            severity: SEVERITY.KRITIK,
            title: `${errorPages.length} sayfa hata kodu döndürüyor (${errorPages[0].performance.statusCode})`,
            detail: 'Hata kodlu sayfalar crawl bütçenizi (tarama kaynağınızı) israf eder ve kullanıcı deneyimini bozar.',
            fix: 'Hatalı URL\'leri düzeltin veya ilgili sayfaya 301 yönlendirmesi yapın.',
            pages: errorPages.map(p => p.url)
        }));
    }

    // ─── KIRIK LİNK KONTROLÜ (GERÇEK DOĞRULAMA) ───
    const pagesWithBroken = pages.filter(p => p.linkHealth && p.linkHealth.brokenLinksCount > 0);
    if (pagesWithBroken.length > 0) {
        const totalBroken = pagesWithBroken.reduce((a, p) => a + (p.linkHealth.brokenLinksCount || 0), 0);
        const sampleBroken = pagesWithBroken[0].linkHealth.brokenLinks || [];
        issues.push(buildIssue({
            id: 'broken-links',
            category: 'Link Sağlığı',
            severity: SEVERITY.KRITIK,
            title: `${totalBroken} kırık link tespit edildi (${pagesWithBroken.length} sayfada)`,
            detail: sampleBroken.length > 0
                ? `Örn: "${sampleBroken[0].url}" (${sampleBroken[0].statusCode}). Kırık linkler crawl bütçesini israf eder, kullanıcıyı hayal kırıklığına uğratır ve otorite sızıntısına neden olur.`
                : 'Kırık linkler crawl bütçesini israf eder ve kullanıcı deneyimini bozar.',
            fix: 'Kırık URL\'leri düzeltin, güncel sayfaya 301 yönlendirmesi yapın veya linki kaldırın. Google Search Console > Sayfa İndeksleme > 404 raporundan doğrulayın.',
            pages: pagesWithBroken.map(p => p.url)
        }));
    }

    // ─── İÇERİK MİKTARI (THIN CONTENT) ───
    const thinPages = pages.filter(p => p.content && p.content.wordCount > 0 && p.content.wordCount < 200);
    if (thinPages.length > 0) {
        issues.push(buildIssue({
            id: 'thin-content',
            category: 'İçerik SEO',
            severity: SEVERITY.ORTA,
            title: `${thinPages.length} sayfada zayıf içerik tespit edildi (200 kelimeden az)`,
            detail: `Örn: "${thinPages[0].url}" (${thinPages[0].content.wordCount} kelime). Google az içerikli sayfaları "düşük kalite" olarak değerlendirebilir ve sıralamada geri plana atar.`,
            fix: 'Bu sayfalara bilgilendirici, anahtar kelime odaklı ve kullanıcıya değer katan 300+ kelimelik içerik ekleyin.',
            pages: thinPages.map(p => p.url)
        }));
    }

    // ─── SCHEMA.ORG / YAPILANDIRILMIŞ VERİ ───
    const noSchema = pages.filter(p => p.content && p.content.schemaOrgCount === 0);
    if (noSchema.length > 0) {
        issues.push(buildIssue({
            id: 'no-schema',
            category: 'Teknik SEO',
            severity: SEVERITY.ORTA,
            title: `${noSchema.length}/${pageCount} sayfada Schema.org yapılandırılmış veri tespit edilemedi`,
            detail: 'Schema.org etiketleri, arama motorlarının sayfanızı anlamasını kolaylaştırır ve zengin snippet (yıldız, fiyat, SSS) gösterme şansınızı artırır.',
            fix: 'Sayfa türüne uygun JSON-LD yapılandırılmış veri ekleyin (LocalBusiness, Organization, FAQPage vb.). Google Rich Results Test ile doğrulayın.',
            pages: noSchema.map(p => p.url)
        }));
    }

    // ─── ANALİZ ARACI EKSİKLİĞİ ───
    const noAnalytics = pages.filter(p => p.content && p.content.hasAnalytics === false);
    if (noAnalytics.length === pages.length && pages.length > 0) {
        issues.push(buildIssue({
            id: 'no-analytics',
            category: 'Ölçüm',
            severity: SEVERITY.ORTA,
            title: 'Google Analytics veya izleme aracı tespit edilemedi',
            detail: 'Trafik ve kullanıcı davranışı ölçülmeden SEO çalışmasının etkisini doğrulamak imkansızdır.',
            fix: 'Google Analytics 4 veya Matomo/Plausible gibi bir analiz aracı kurun ve Google Search Console\'a site ekleyin.',
            pages: [pages[0].url]
        }));
    }

    // ─── İÇ/DİŞ LİNK DENGESİ ───
    const noInternalLinks = pages.filter(p => p.linkHealth && p.linkHealth.internalLinks === 0 && p.linkHealth.totalChecked > 0);
    if (noInternalLinks.length > 0 && noInternalLinks.length < pages.length) {
        issues.push(buildIssue({
            id: 'no-internal-links',
            category: 'Link Sağlığı',
            severity: SEVERITY.DUSUK,
            title: `${noInternalLinks.length} sayfada iç link bulunamadı`,
            detail: 'İç linkler, otoritenin sayfalar arasında dağıtılmasını ve Google\'ın site yapısını anlamasını sağlar.',
            fix: 'Bu sayfalara ilgili diğer sayfalara bağlantı veren iç linkler ekleyin (breadcrumb, ilgili ürünler, footer).',
            pages: noInternalLinks.map(p => p.url)
        }));
    }

    // ─── YAVAŞ SAYFALAR ───
    const slowPages = (crawlData && (crawlData.slowPages || (crawlData.pages || []).filter(p => p.responseTimeMs >= 1500))) || [];
    if (slowPages.length > 0) {
        issues.push(buildIssue({
            id: 'slow-pages',
            category: 'Performans',
            severity: SEVERITY.ORTA,
            title: `${slowPages.length} sayfa yavaş yanıt veriyor (1500ms üzeri)`,
            detail: 'Yavaş sayfalar hem kullanıcı deneyimini hem de Google sıralamasını olumsuz etkiler (Core Web Vitals).',
            fix: 'CDN kullanın, görselleri sıkıştırın, sunucu tarafı önbellek (cache) açın.',
            pages: slowPages.map(p => p.url)
        }));
    }

    // ─── CANONICAL ───
    const noCanonical = pages.filter(p => p.canonical && p.canonical.present === false);
    if (noCanonical.length > 0) {
        issues.push(buildIssue({
            id: 'no-canonical',
            category: 'Teknik SEO',
            severity: SEVERITY.DUSUK,
            title: `${noCanonical.length} sayfada canonical etiketi eksik`,
            detail: 'Canonical etiketi, yinelenen içerik sorunlarını önleyerek hangi URL\'nin ana sürüm olduğunu belirtir.',
            fix: 'Her sayfaya kendi URL\'sini gösteren bir <link rel="canonical"> ekleyin.',
            pages: noCanonical.map(p => p.url)
        }));
    }

    // ─── ROBOTS NOINDEX ───
    const noindexPages = pages.filter(p => p.robots && (p.robots.status || '').includes('noindex'));
    if (noindexPages.length > 0) {
        issues.push(buildIssue({
            id: 'noindex',
            category: 'Teknik SEO',
            severity: SEVERITY.KRITIK,
            title: `${noindexPages.length} sayfa indexlenemez durumda (noindex)`,
            detail: 'noindex etiketi, Google\'ın bu sayfayı arama sonuçlarından çıkarmasını söyler. Bu sayfaların sıralamada görünmesi imkansızdır.',
            fix: 'Bu sayfaların indexlenmesini istiyorsanız noindex etiketini kaldırın.',
            pages: noindexPages.map(p => p.url)
        }));
    }

    // ─── GENEL YAZILIM DURUMU (HTTP) ───
    const httpsOk = (scanData.baseUrl || '').startsWith('https://');
    if (!httpsOk) {
        issues.push(buildIssue({
            id: 'no-https',
            category: 'Güvenlik',
            severity: SEVERITY.KRITIK,
            title: 'Site HTTPS kullanmıyor',
            detail: 'HTTPS, Google için resmi bir sıralama sinyalidir. HTTP siteler "Güvenli değil" uyarısı alır ve ziyaretçi kaybeder.',
            fix: 'SSL sertifikası alın (ücretsiz Let\'s Encrypt) ve tüm trafiği HTTPS\'e yönlendirin.',
            pages: [pages[0].url]
        }));
    }

    // ─── GEO / AI GÖRÜNÜRLÜĞÜ ───
    const geo = scanData.geo || (crawlData && crawlData.geo);
    if (geo) {
        if (geo.llmsTxt === false || geo.llmsTxtFound === false) {
            issues.push(buildIssue({
                id: 'no-llms',
                category: 'AI Görünürlüğü (GEO)',
                severity: SEVERITY.ORTA,
                title: 'llms.txt dosyası yok',
                detail: 'llms.txt, sitenizi ChatGPT, Claude ve Perplexity gibi yapay zeka araçlarına tanıtan standart bir dosyadır.',
                fix: 'Sitenizin kök dizinine sitenizi özetleyen bir llms.txt dosyası ekleyin.',
                pages: [pages[0].url]
            }));
        }
        if (geo.aiBotsBlocked) {
            issues.push(buildIssue({
                id: 'ai-bots-blocked',
                category: 'AI Görünürlüğü (GEO)',
                severity: SEVERITY.KRITIK,
                title: 'AI botları robots.txt tarafından engelleniyor',
                detail: 'ChatGPT, Claude, Perplexity gibi AI tarayıcıları robots.txt ile engelleniyorsa, siteniz AI arama sonuçlarında asla görünmez.',
                fix: 'robots.txt dosyasından AI botlarını (GPTBot, ClaudeBot, PerplexityBot vb.) engelleyen kuralları kaldırın.',
                pages: [pages[0].url]
            }));
        }
    }

    // Önem derecesine göre sırala
    const order = { 'Kritik': 0, 'Orta': 1, 'Düşük': 2 };
    issues.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));

    return issues;
}

function buildIssue({ id, category, severity, title, detail, fix, pages }) {
    return {
        id,
        category,
        severity,
        title,
        detail,
        fix,
        pages: (pages || []).slice(0, 10), // en fazla 10 sayfa listele
        pageCount: (pages || []).length
    };
}

/**
 * Genel skoru hedefe yaklaştırmak için hesaplanmış "kazanılabilir puan" listesi.
 * Her sorunun düzeltilmesinin tahmini puan etkisini döner.
 */
function scoreImpact(scored, issues) {
    if (!scored) return [];
    const current = scored.scores.overall || 0;
    // Her kategorinin ağırlığı (scoreEngine.js ile aynı)
    const weights = { performance: 0.20, seo: 0.30, accessibility: 0.10, bestPractices: 0.20, security: 0.20 };

    const impact = issues.map(issue => {
        let maxGain = 0;
        if (issue.id.startsWith('title') || issue.id.startsWith('desc') || issue.id.startsWith('h1') || issue.id.startsWith('img-alt')) {
            maxGain = Math.round(weights.seo * 15); // SEO kategorisinden ~15 puan potansiyel
        } else if (issue.id.startsWith('no-viewport')) {
            maxGain = Math.round((weights.seo * 10 + weights.bestPractices * 10) / 2);
        } else if (issue.id.startsWith('sec') || issue.id.startsWith('no-https')) {
            maxGain = Math.round(weights.security * 20);
        } else if (issue.id.startsWith('no-compression') || issue.id.startsWith('slow')) {
            maxGain = Math.round(weights.performance * 20);
        } else if (issue.id.startsWith('http') || issue.id.startsWith('noindex')) {
            maxGain = 5;
        } else {
            maxGain = 3;
        }
        return {
            issueId: issue.id,
            title: issue.title,
            currentScore: current,
            estimatedGain: Math.max(1, maxGain)
        };
    });

    return impact;
}

module.exports = { detectIssues, scoreImpact, SEVERITY };
