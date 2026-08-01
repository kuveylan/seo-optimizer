/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
/**
 * OpenSEO tarzı Anahtar Kelime ve Metin Analizi
 * Sayfadaki metinleri tarayarak en çok geçen kelimeleri (stop-words hariç) bulur
 * ve SEO uyumluluğunu değerlendirir.
 */

const cheerio = require('cheerio');

const TURKISH_STOP_WORDS = new Set([
    've', 'bir', 'bu', 'da', 'de', 'için', 'ile', 'en', 'o', 'ama', 'lakin',
    'fakat', 'ancak', 'gibi', 'kadar', 'ki', 'ne', 'ya', 'hem', 'ya da',
    'her', 'daha', 'çok', 'az', 'ile', 'ise', 'sen', 'ben', 'biz', 'siz',
    'onlar', 'şunu', 'bunu', 'şu', 'o', 'diye', 'olarak', 'olan', 'olarak'
]);

function analyzeKeywords(htmlText) {
    const $ = cheerio.load(htmlText);

    // Script ve style etiketlerini temizle
    $('script, style, noscript').remove();

    const bodyText = $('body').text().toLowerCase();
    // Türkçe karakterleri koruyarak kelimelere ayır
    const words = bodyText.match(/[\p{L}\p{N}]+/gu) || [];

    const frequency = {};
    for (const word of words) {
        if (word.length > 2 && !TURKISH_STOP_WORDS.has(word)) {
            frequency[word] = (frequency[word] || 0) + 1;
        }
    }

    // En çok geçen ilk 10 anahtar kelimeyi sırala
    const sortedKeywords = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count, density: ((count / words.length) * 100).toFixed(2) + '%' }));

    return {
        totalWords: words.length,
        topKeywords: sortedKeywords
    };
}

module.exports = { analyzeKeywords };
