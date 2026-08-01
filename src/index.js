/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
const { analyzeOnPageSEO } = require('./scraper');
const { analyzeWithAI } = require('./aiAgent');

async function runFullAudit(url) {
    console.log("=== SEO OPTIMIZER ===");
    console.log("=== Tam Kapsamlı SEO Denetimi Başlatıldı ===\n");

    // Adım 1: On-Page SEO Taraması
    console.log("Adım 1: Sayfa Taraması Yapılıyor...");
    const seoData = await analyzeOnPageSEO(url);

    if (seoData.error) {
        console.error("Tarama hatası:", seoData.error);
        return;
    }

    console.log("✓ Tarama tamamlandı. Veriler Yapay Zeka analizine gönderiliyor...\n");

    // Adım 2: Yapay Zeka Analizi
    console.log("Adım 2: Yapay Zeka raporu oluşturuluyor (30-60 saniye sürebilir)...\n");
    const report = await analyzeWithAI(seoData);

    if (report) {
        console.log("=== YAPAY ZEKA SEO RAPORU ===\n");
        console.log(report);
    } else {
        console.log("Rapor oluşturulamadı.");
    }
}

// Komut satırından URL alma
const url = process.argv[2];
if (!url) {
    console.log("Kullanım: node src/index.js <URL>");
    console.log("Örnek: node src/index.js https://example.com");
    process.exit(1);
}

runFullAudit(url);
