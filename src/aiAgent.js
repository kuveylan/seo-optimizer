/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.private', '.env') });

async function analyzeWithAI(seoData, apiKey) {
    const ANTHROPIC_API_KEY = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
        console.error('⚠️  ANTHROPIC_API_KEY bulunamadı.');
        return 'Hata: ANTHROPIC_API_KEY tanımlı değil.';
    }

    const prompt = `
Sen kıdemli bir SEO (Arama Motoru Optimizasyonu) uzmanısın. Görevin, aşağıdaki kapsamlı teknik SEO tarama sonuçlarını analiz edip, site sahibine anlaşılır ve eyleme geçirilebilir bir rapor sunmak.

Aşağıdaki ham tarama verilerini ve 0-100 skorlarını analiz et:

${JSON.stringify(seoData, null, 2)}

Lütfen aşağıdaki formatta detaylı bir analiz raporu oluştur:

## GENEL DEĞERLENDİRME
Sitenin genel durumu hakkında kısa bir özet (maks 2-3 cümle). Genel skorun ne anlama geldiğini yorumla.

## KATEGORİ BAZLI ANALİZ
Her kategori için sorunları ve durumu yaz. Bulunmayan/baz kategorileri "Kontrol edilmedi" olarak belirtme, veri varsa raporla:

### 1. PERFORMANS VE HIZ
- Sunucu yanıt süresi (TTFB) ne kadar?
- Bu hız iyi mi kötü mü? Hangi değerler hedeflenmeli (örn. 200ms altı)?
- Yavaşsa hangi yöntemlerle hızlandırılabilir (cache, CDN, görsel sıkıştırma, hosting yükseltme)?

### 2. MOBİL UYUMLULUK
- Viewport meta etiketi var mı?
- Mobil uyumluluk neden kritik? (Google'ın mobile-first indexing kuralı)
- Nasıl düzeltilir?

### 3. ON-PAGE SEO (Başlıklar ve Meta)
- Title ve Meta Description uzunlukları uygun mu?
- H1, H2, H3 hiyerarşisi doğru mu? (Sayfa başına tam 1 H1 olmalı)
- Başlık ve açıklama önerileri ver.

### 4. GÖRSEL OPTİMİZASYONU
- Kaç görselde alt (alt) metni eksik?
- Alt metinleri neden önemli? (Görsel SEO, erişilebilirlik, engelli kullanıcılar)
- Nasıl optimize edilir?

### 5. LINK SAĞLIĞI (Kırık Linkler)
- Kaç link kontrol edildi, kaç tanesi kırık (404/500)?
- Kırık linkler neden zararlı? (Crawl budget israfı, kullanıcı deneyimi)
- Nasıl düzeltilir?

### 6. GÜVENLİK BAŞLIKLARI
- Hangi güvenlik başlıkları mevcut/değil? (CSP, X-Frame-Options, HSTS vb.)
- Güvenlik başlıkları neden önemli? (Güven ve sıralama sinyali)
- Nasıl eklenir?

### 7. AI GÖRÜNÜRLÜĞÜ (GEO / Generative Engine Optimization)
- Siteniz ChatGPT, Claude, Perplexity gibi AI arama motorlarında görünür mü?
- robots.txt ve llms.txt durumu nasıl?
- AI alıntılama (citability) potansiyeli nasıl artırılır?

## ÖNCELİKLİ AKSİYON PLANI (Kritik - claude-seo metodolojisi)
Her aksiyon için şu formatta bir tablo/liste ver:

| # | Öncelik | Aksiyon | Beklenen Etki | Nasıl Doğrularız? (Falsifiable) |

- **Öncelik**: 🔴 Kritik / 🟡 Orta / 🟢 Düşük
- **Beklenen Etki**: Bu aksiyon uygulanırsa ne olur?
- **Nasıl Doğrularız?**: Uygulamadan SONRA ölçülebilir hangi metrik değişmeli? (örn. "Google Search Console'da indexlenen sayfa sayısı 2 hafta içinde +%20 artmalı")

En yüksek etkili 5 aksiyonu öncelik sırasına göre ver. Teknik bilgisi olmayan bir site sahibinin anlayabileceği dil kullan. Raporu markdown formatında, başlıklar ve listeler kullanarak profesyonel ve okunaklı yaz.`;

    let apiUrl = process.env.AI_API_URL || 'https://api.anthropic.com/v1/messages';
    const apiModel = process.env.AI_MODEL || 'claude-sonnet-4-5';

    // 9routers gibi proxy'ler için URL normalizasyonu:
    // .env'de "http://localhost:20128/v1" yazılırsa otomatik "/messages" eklenir.
    if (!apiUrl.endsWith('/messages') && !apiUrl.endsWith('/chat/completions')) {
        apiUrl = apiUrl.replace(/\/+$/, '') + '/messages';
    }

    console.log(`🤖 AI Servisine İstek Gönderiliyor -> URL: ${apiUrl} | Model: ${apiModel}`);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: apiModel,
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        const responseText = await response.text();

        // Gelen yanıtın boş olup olmadığını kontrol et
        if (!responseText || responseText.trim() === '') {
            return `❌ AI Hatası: Sunucu (Proxy) boş yanıt döndürdü. HTTP Status: ${response.status} ${response.statusText}`;
        }

        // 9routers gibi proxy'ler bazen SSE (streaming) formatında yanıt verir.
        // SSE formatı: "event: message_start\ndata: {json}\n\n"
        if (responseText.includes('event:') && responseText.includes('data:')) {
            console.log('📡 Streaming (SSE) yanıtı tespit edildi, ayrıştırılıyor...');
            const fullText = parseSSE(responseText);
            if (fullText.startsWith('❌')) return fullText; // Hata varsa döndür
            return fullText;
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ JSON Parse Hatası. Gelen ham yanıt:', responseText.substring(0, 500));
            return `❌ AI Hatası: Sunucu geçerli bir JSON döndürmedi. Gelen ham yanıt: \n\`\`\`\n${responseText.substring(0, 500)}\n\`\`\``;
        }

        if (data.error) {
            console.error('❌ AI API Hatası:', data.error);
            return `❌ AI API Hatası: ${typeof data.error === 'object' ? JSON.stringify(data.error) : data.error}`;
        }

        // OpenAI uyumlu /chat/completions yanıtı
        if (data.choices && data.choices[0]) {
            return data.choices[0].message?.content || data.choices[0].text || 'Boş yanıt';
        }

        // Anthropic uyumlu yanıt
        if (!data.content || !data.content[0] || !data.content[0].text) {
            return `❌ AI Hatası: Beklenmeyen yanıt formatı alındı: ${JSON.stringify(data).substring(0, 300)}`;
        }

        return data.content[0].text;

    } catch (networkError) {
        console.error('❌ Ağ veya Bağlantı Hatası:', networkError.message);
        return `❌ Bağlantı Hatası: ${networkError.message}. Lütfen 9routers uygulamanızın açık olduğundan ve ${apiUrl} adresinin erişilebilir olduğundan emin olun.`;
    }
}

// SSE (Server-Sent Events) streaming yanıtını ayrıştırır
// Çoklu proxy formatını destekler (Anthropic, OpenAI, Cloudflare Workers AI)
function parseSSE(rawText) {
    try {
        const lines = rawText.split(/\r?\n/);
        const texts = [];
        const collectedJson = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const jsonStr = trimmed.replace(/^data:\s*/, '');
            if (jsonStr === '[DONE]') continue;
            collectedJson.push(jsonStr);

            try {
                const parsed = JSON.parse(jsonStr);

                // --- Anthropic formatı: content_block_delta ---
                if (parsed.type === 'content_block_delta') {
                    const delta = parsed.delta || {};
                    // İçerik doğrudan delta.text'te olabilir veya delta.content'ta
                    if (delta.text) texts.push(delta.text);
                    if (delta.content) texts.push(typeof delta.content === 'string' ? delta.content : JSON.stringify(delta.content));
                    // Bazı proxy'ler text yerine yalnızca thinking_delta gönderir (deepseek vb.)
                    if (delta.thinking) texts.push(delta.thinking);
                    if (parsed.text) texts.push(parsed.text);
                }

                // --- OpenAI/OpenAI-uyumlu format: choices[0].delta.content ---
                if (parsed.choices && parsed.choices[0]) {
                    const delta = parsed.choices[0].delta || parsed.choices[0];
                    if (delta.content) texts.push(delta.content);
                    if (delta.text) texts.push(delta.text);
                    if (parsed.choices[0].message?.content) texts.push(parsed.choices[0].message.content);
                }

                // --- Bazı proxy'ler delta yerine doğrudan text alanı koyar ---
                if (parsed.text && !parsed.content_block && !parsed.choices) texts.push(parsed.text);
            } catch (e) {
                // JSON parse hatasını yut, devam et
            }
        }

        if (texts.length > 0) {
            return texts.join('');
        }

        // ── Fallback: Satır bazlı ayrıştırma başarısız oldu, regex ile text alanlarını çek ──
        // Bazı proxy'ler JSON'u tek satıra sıkıştırır veya bozuk karakterle gönderir.
        const regexFallback = tryExtractTextViaRegex(rawText);
        if (regexFallback) {
            return regexFallback;
        }

        // ── Son çare: Son JSON bloğu bütün olarak parse et (stream değilse) ──
        if (collectedJson.length > 0) {
            try {
                // Tüm data bloklarını birleştirip dene
                const joined = collectedJson.join('\n');
                const parsedFinal = JSON.parse(joined);
                if (parsedFinal.content && parsedFinal.content[0]?.text) return parsedFinal.content[0].text;
                if (parsedFinal.choices && parsedFinal.choices[0]?.message?.content) return parsedFinal.choices[0].message.content;
            } catch (e) { /* geçersiz, atla */ }
        }

        return `❌ AI Hatası: SSE akışından metin çıkarılamadı. Ham veri: ${rawText.substring(0, 300)}`;
    } catch (e) {
        return `❌ AI Hatası: SSE ayrıştırılamadı: ${e.message}`;
    }
}

// Regex tabanlı fallback: Tüm "text": "..." değerlerini topla
function tryExtractTextViaRegex(rawText) {
    try {
        // Escape'li \n, \" karakterlerini doğru işleyen bir text alanı eşleştirici
        const matches = [];
        const regex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
        let m;
        while ((m = regex.exec(rawText)) !== null) {
            if (m[1] && m[1].trim().length > 0) {
                matches.push(decodeEscapes(m[1]));
            }
        }
        if (matches.length > 0) {
            return matches.join('');
        }
        return null;
    } catch (e) {
        return null;
    }
}

function decodeEscapes(str) {
    try {
        return str
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t');
    } catch (e) {
        return str;
    }
}

module.exports = { analyzeWithAI };
