/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { analyzeKeywords } = require('./keywordAnalyzer');
const { checkAiReadiness, calculateGeoScore } = require('./geoReadyEngine');

async function analyzeAdvancedSEO(url) {
    const startTime = Date.now();
    try {
        console.log(`🔍 Derinlemesine SEO Taraması Başlatıldı: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000,
            validateStatus: function (status) {
                return status < 500; // 404 gibi hataları da yakalamak için
            }
        });

        const responseTime = Date.now() - startTime;
        const html = response.data;
        const $ = cheerio.load(html);

        // 1. HTTP Durum Kodu & Hız
        const statusCode = response.status;
        const speedStatus = responseTime < 500 ? 'Mükemmel (<500ms)' : (responseTime < 1500 ? 'İyi (<1.5s)' : 'Kritik: Yavaş Yanıt Süresi (>1.5s)');

        // 2. HTTP Başlıkları (Güvenlik + Sıkıştırma)
        const headers = response.headers || {};
        const serverHeader = headers['server'] || headers['x-powered-by'] || '';
        const securityHeaders = {
            'Content-Security-Policy': !!headers['content-security-policy'],
            'X-Frame-Options': !!headers['x-frame-options'],
            'X-Content-Type-Options': !!headers['x-content-type-options'],
            'Strict-Transport-Security': !!headers['strict-transport-security'],
            'Referrer-Policy': !!headers['referrer-policy']
        };
        const securityHeaderCount = Object.values(securityHeaders).filter(Boolean).length;
        const compressionUsed = !!(headers['content-encoding'] && headers['content-encoding'].match(/gzip|br|deflate/));

        // 3. Yönlendirme Takibi (redirect chain)
        const redirectChain = response.request && response.request.res ? response.request.res.responseUrl || [] : [];
        const wasRedirected = response.request && response.request.res ? !!response.request.res.headers?.location : false;

        // 4. Title & Meta
        const title = $('title').text().trim();
        const titleLength = title.length;
        const description = $('meta[name="description"]').attr('content') || '';
        const descriptionLength = description.length;
        const viewport = $('meta[name="viewport"]').attr('content') || '';
        const hasViewport = viewport.length > 0;

        // 5. OpenGraph / Sosyal Medya Etiketleri (OpenSEO ve SEO analizörlerinin kapsamlı özelliği)
        const ogTags = {
            ogTitle: $('meta[property="og:title"]').attr('content') || '',
            ogDescription: $('meta[property="og:description"]').attr('content') || '',
            ogImage: $('meta[property="og:image"]').attr('content') || '',
            ogType: $('meta[property="og:type"]').attr('content') || '',
            twitterCard: $('meta[name="twitter:card"]').attr('content') || ''
        };
        const ogComplete = !!(ogTags.ogTitle && ogTags.ogDescription && ogTags.ogImage);

        // 6. Canonical & Robots Meta
        const canonical = $('link[rel="canonical"]').attr('href') || '';
        const robotsMeta = $('meta[name="robots"]').attr('content') || '';

        // 7. HTML lang attribute
        const htmlLang = $('html').attr('lang') || '';
        const hasLang = htmlLang.length > 0;

        // 8. Sayfa Boyutu ve DOM Derinliği
        const pageSize = Buffer.byteLength(html, 'utf8');
        const pageSizeKB = Math.round(pageSize / 1024);
        const domElements = $('*').length;

        // 3. Headings (Hiyerarşi)
        const h1Count = $('h1').length;
        const h1Texts = [];
        $('h1').each((i, el) => h1Texts.push($(el).text().trim()));
        const h2Count = $('h2').length;
        const h3Count = $('h3').length;

        // 4. Görseller & Alt Etiketleri
        let totalImages = 0;
        let imagesWithoutAlt = 0;
        $('img').each((i, el) => {
            totalImages++;
            const alt = $(el).attr('alt');
            if (!alt || alt.trim() === '') {
                imagesWithoutAlt++;
            }
        });

        // 5. Link Sağlığı (Kırık Link Testi için toplama)
        const links = [];
        const parsedUrl = new URL(url);

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                try {
                    const absoluteUrl = new URL(href, url).href;
                    links.push(absoluteUrl);
                } catch (e) {}
            }
        });

        // Benzersiz ilk 10 linki kontrol edelim (Performans ve kırık link simülasyonu için)
        const uniqueLinks = [...new Set(links)].slice(0, 10);
        const brokenLinks = [];

        for (const link of uniqueLinks) {
            try {
                const linkRes = await axios.head(link, { timeout: 3000, validateStatus: s => s < 500 });
                if (linkRes.status >= 400) {
                    brokenLinks.push({ url: link, status: linkRes.status });
                }
            } catch (err) {
                // CORS veya Timeout durumları
                // İsteğe bağlı olarak geçilebilir
            }
        }

        // Anahtar kelime ve metin analizi (OpenSEO tarzı)
        let keywordData = null;
        try {
            keywordData = analyzeKeywords(html);
        } catch (e) {
            console.log('⚠️ Anahtar kelime analizi yapılamadı:', e.message);
        }

        // GEO / AI Görünürlük analizi (GeoReady & Claude SEO tarzı)
        let geoData = null;
        try {
            const aiReadiness = await checkAiReadiness(url);
            const geoCalc = calculateGeoScore({
                social: { ogComplete },
                headings: { h1Count },
                keywords: keywordData,
                technical: { hasViewport },
                performance: { responseTimeMs: responseTime }
            }, aiReadiness);
            geoData = geoCalc;
        } catch (e) {
            console.log('⚠️ GEO analizi yapılamadı:', e.message);
        }

        const seoData = {
            url,
            keywords: keywordData,
            geo: geoData,
            performance: {
                statusCode,
                responseTimeMs: responseTime,
                status: speedStatus
            },
            security: {
                securityHeaders,
                securityHeaderCount,
                securityHeaderStatus: securityHeaderCount >= 4 ? 'İyi' : `Uyarı: ${securityHeaderCount}/5 güvenlik başlığı mevcut (Güvenli site için daha fazla gerekli)`,
                compressionUsed,
                compressionStatus: compressionUsed ? 'İyi (Gzip/Brotli sıkıştırma aktif)' : 'Uyarı: Sıkıştırma (gzip/brotli) kullanılmıyor',
                server: serverHeader || 'Bilinmiyor'
            },
            redirects: {
                wasRedirected,
                redirectChain,
                status: wasRedirected ? 'Uyarı: Yönlendirme tespit edildi' : 'İyi (Doğrudan yanıt)'
            },
            technical: {
                hasViewport,
                viewportContent: viewport,
                hasLang,
                htmlLang,
                status: hasViewport ? 'İyi (Mobil Uyumlu)' : 'Kritik: Viewport meta etiketi eksik (Mobil uyumsuz!)'
            },
            social: {
                ogTags,
                ogComplete,
                status: ogComplete ? 'İyi (OpenGraph etiketleri tam)' : 'Uyarı: OpenGraph / Sosyal paylaşım etiketleri eksik'
            },
            canonical: {
                present: canonical.length > 0,
                url: canonical,
                status: canonical.length > 0 ? 'İyi' : 'Uyarı: Canonical etiketi bulunamadı (duplicate içerik riski)'
            },
            robots: {
                metaContent: robotsMeta,
                status: robotsMeta.includes('noindex') ? 'Kritik: Sayfa noindex ile engellenmiş!' : (robotsMeta ? 'İyi' : 'Nötr: Robots meta etiketi bulunamadı')
            },
            pageSize: {
                bytes: pageSize,
                kb: pageSizeKB,
                domElements,
                status: pageSizeKB > 500 ? `Uyarı: Sayfa büyük (${pageSizeKB} KB)` : 'İyi'
            },
            title: {
                text: title,
                length: titleLength,
                status: titleLength >= 10 && titleLength <= 60 ? 'İyi' : 'Uyarı (İdeal: 10-60 karakter)'
            },
            description: {
                text: description,
                length: descriptionLength,
                status: descriptionLength >= 70 && descriptionLength <= 160 ? 'İyi' : 'Uyarı (İdeal: 70-160 karakter)'
            },
            headings: {
                h1Count,
                h1Texts,
                h2Count,
                h3Count,
                status: h1Count === 1 ? 'İyi' : (h1Count === 0 ? 'Kritik: H1 etiketi eksik!' : 'Uyarı: Birden fazla H1 var.')
            },
            images: {
                totalImages,
                imagesWithoutAlt,
                status: imagesWithoutAlt === 0 ? 'İyi' : `Uyarı: ${imagesWithoutAlt} görselde alt (alt) metni yok.`
            },
            linkHealth: {
                totalChecked: uniqueLinks.length,
                brokenLinksCount: brokenLinks.length,
                brokenLinks,
                status: brokenLinks.length === 0 ? 'İyi (Kırık link bulunamadı)' : `Kritik: ${brokenLinks.length} kırık link tespit edildi!`
            }
        };

        return seoData;

    } catch (error) {
        console.error(`Tarama hatası (${url}):`, error.message);
        return { error: error.message };
    }
}

async function analyzeSiteComprehensively(baseUrl) {
    // Ana sayfa ve temel bileşen analizi
    const mainData = await analyzeAdvancedSEO(baseUrl);
    return {
        baseUrl,
        totalPagesScanned: 1,
        pages: [mainData]
    };
}

module.exports = { analyzeSiteComprehensively };
