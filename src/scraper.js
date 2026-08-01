/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeOnPageSEO(url) {
    try {
        console.log(`🔍 Taraniyor: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Title Analizi
        const title = $('title').text().trim();
        const titleLength = title.length;

        // Meta Description Analizi
        const description = $('meta[name="description"]').attr('content') || '';
        const descriptionLength = description.length;

        // H Etiketleri
        const h1Count = $('h1').length;
        const h1Texts = [];
        $('h1').each((i, el) => h1Texts.push($(el).text().trim()));

        const h2Count = $('h2').length;

        // Görseller (Alt Etiketi Eksik olanlar)
        let totalImages = 0;
        let imagesWithoutAlt = 0;
        $('img').each((i, el) => {
            totalImages++;
            const alt = $(el).attr('alt');
            if (!alt || alt.trim() === '') {
                imagesWithoutAlt++;
            }
        });

        // Linkler (İç/Dış)
        let internalLinks = 0;
        let externalLinks = 0;
        const parsedUrl = new URL(url);

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                if (href.startsWith('/') || href.includes(parsedUrl.hostname)) {
                    internalLinks++;
                } else if (href.startsWith('http')) {
                    externalLinks++;
                }
            }
        });

        const seoData = {
            url,
            title: {
                text: title,
                length: titleLength,
                status: titleLength >= 10 && titleLength <= 60 ? 'İyi' : 'Uyarı (İdeal uzunluk 10-60 karakter olmalıdır)'
            },
            description: {
                text: description,
                length: descriptionLength,
                status: descriptionLength >= 70 && descriptionLength <= 160 ? 'İyi' : 'Uyarı (İdeal uzunluk 70-160 karakter olmalıdır)'
            },
            headings: {
                h1Count,
                h1Texts,
                h2Count,
                status: h1Count === 1 ? 'İyi' : (h1Count === 0 ? 'Kritik: H1 etiketi eksik!' : 'Uyarı: Birden fazla H1 etiketi var.')
            },
            images: {
                totalImages,
                imagesWithoutAlt,
                status: imagesWithoutAlt === 0 ? 'İyi' : `Uyarı: ${imagesWithoutAlt} adet görselde alt (alternatif) metni eksik.`
            },
            links: {
                internalLinks,
                externalLinks
            }
        };

        return seoData;

    } catch (error) {
        console.error(`Hata oluştu (${url}):`, error.message);
        return { error: error.message };
    }
}

module.exports = { analyzeOnPageSEO };
