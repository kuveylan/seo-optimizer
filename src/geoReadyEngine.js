/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
/**
 * GeoReady & Claude SEO analizlerinden ilham alan GEO (Generative Engine Optimization)
 * ve AI Görünürlük Skorlama Motoru.
 * Yapay zeka arama motorlarının (ChatGPT, Claude, Perplexity, Gemini) sitenizi
 * tarayıp tarayamayacağını ve alıntılama (citability) potansiyelinizi ölçer.
 */

const axios = require('axios');

async function checkAiReadiness(baseUrl) {
    let robotsTxtExists = false;
    let allowsAiBots = true;
    let llmsTxtExists = false;

    try {
        const robotsUrl = new URL('/robots.txt', baseUrl).href;
        const res = await axios.get(robotsUrl, { timeout: 5000, validateStatus: s => s < 500 });
        if (res.status === 200) {
            robotsTxtExists = true;
            const content = res.data.toLowerCase();
            // GPTBot veya ClaudeBot engellenmiş mi?
            if (content.includes('disallow: /') && (content.includes('gptbot') || content.includes('claudebot') || content.includes('perplexitybot'))) {
                allowsAiBots = false;
            }
        }
    } catch (e) {
        // robots.txt yoksa
    }

    try {
        const llmsUrl = new URL('/llms.txt', baseUrl).href;
        const res = await axios.get(llmsUrl, { timeout: 5000, validateStatus: s => s < 500 });
        if (res.status === 200) {
            llmsTxtExists = true;
        }
    } catch (e) {
        // llms.txt yoksa
    }

    return {
        robotsTxtExists,
        allowsAiBots,
        llmsTxtExists
    };
}

function calculateGeoScore(page, aiReadiness) {
    let score = 0;
    const checks = [];

    // 1. OpenGraph / Sosyal Paylaşım (AI'lar snippet üretirken og:image ve og:description kullanır) - 20 puan
    if (page.social && page.social.ogComplete) {
        score += 20;
        checks.push({ name: 'OpenGraph Etiketleri', status: 'OK (+20)' });
    } else {
        checks.push({ name: 'OpenGraph Etiketleri', status: 'Eksik (0)' });
    }

    // 2. robots.txt ve AI bot izinleri - 25 puan
    if (aiReadiness.robotsTxtExists) {
        score += 10;
        checks.push({ name: 'robots.txt Dosyası', status: 'Mevcut (+10)' });
    }
    if (aiReadiness.allowsAiBots) {
        score += 15;
        checks.push({ name: 'AI Bot İzinleri (GPTBot/ClaudeBot)', status: 'İzin Veriliyor (+15)' });
    } else {
        checks.push({ name: 'AI Bot İzinleri', status: 'Engellenmiş (0)' });
    }

    // 3. llms.txt (AI-native siteler için yeni standart) - 15 puan
    if (aiReadiness.llmsTxtExists) {
        score += 15;
        checks.push({ name: 'llms.txt Dosyası', status: 'Mevcut (+15)' });
    } else {
        checks.push({ name: 'llms.txt Dosyası', status: 'Bulunamadı (Öneri: ekleyin) (0)' });
    }

    // 4. İçerik ve Başlık Yapısı (H1, başlık hiyerarşisi, kelime yoğunluğu) - 20 puan
    if (page.headings && page.headings.h1Count === 1) {
        score += 10;
        checks.push({ name: 'H1 Başlık Hiyerarşisi', status: 'Mükemmel (+10)' });
    } else {
        checks.push({ name: 'H1 Başlık Hiyerarşisi', status: 'Eksik veya Hatalı (0)' });
    }
    if (page.keywords && page.keywords.totalWords > 200) {
        score += 10;
        checks.push({ name: 'İçerik Derinliği (200+ kelime)', status: 'Yeterli (+10)' });
    } else {
        checks.push({ name: 'İçerik Derinliği', status: 'Yetersiz (<200 kelime) (0)' });
    }

    // 5. Teknik Hız ve Mobil Uyumluluk - 10 puan
    if (page.technical && page.technical.hasViewport && page.performance && page.performance.responseTimeMs < 1000) {
        score += 10;
        checks.push({ name: 'Performans & Mobil', status: 'İyi (+10)' });
    } else {
        checks.push({ name: 'Performans & Mobil', status: 'İyileştirilmeli (0)' });
    }

    return {
        geoScore: Math.min(100, score),
        checks,
        aiReadiness
    };
}

module.exports = { checkAiReadiness, calculateGeoScore };
