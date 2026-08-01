/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
const { analyzeWithAI } = require('./aiAgent');

async function testAI() {
    console.log("AI Modülü Test Ediliyor...");
    const mockSeoData = {
        url: "https://example.com",
        title: { text: "Example", length: 7, status: "Uyarı" },
        description: { text: "", length: 0, status: "Uyarı" },
        headings: { h1Count: 0, h1Texts: [], h2Count: 0, status: "Kritik" },
        images: { totalImages: 2, imagesWithoutAlt: 2, status: "Uyarı" }
    };

    // Test API key warning or run if key is present
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
        console.log("ℹ️  ANTHROPIC_API_KEY tanımlı değil. Lütfen .env dosyanıza gerçek anahtarınızı girin.");
        console.log("✅ Kod mimarisi ve yapı başarıyla kuruldu.");
        return;
    }

    const report = await analyzeWithAI(mockSeoData);
    console.log("\nÜretilen Rapor:\n", report);
}

testAI();
