/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
const { analyzeOnPageSEO } = require('./scraper');

async function test() {
    const testUrl = 'https://example.com';
    console.log("On-Page SEO Modülü Test Ediliyor...");
    const result = await analyzeOnPageSEO(testUrl);
    console.log("\n--- ANALİZ SONUCU ---");
    console.log(JSON.stringify(result, null, 2));
}

test();
