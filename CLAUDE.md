# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Hakkında

**SEO Optimizer** — Yapay zeka destekli kapsamlı SEO denetim, rakip analizi ve PDF raporlama aracı. Tek Node.js (Express + EJS) uygulaması; hem web arayüzü hem terminal (CLI) kullanımı sunar. Dili ağırlıklı Türkçe'dir (kullanıcı mesajları, konsol çıktıları, şablonlar). Kullanıcıyla tüm iletişim Türkçe yapılır.

## Çalıştırma Komutları

```bash
npm start                      # Web arayüzü → http://localhost:3000
node bin/seo-audit.js audit <URL>          # CLI: tam site SEO denetimi
node bin/seo-audit.js audit <URL> --pdf    # CLI: + PDF raporu indir
node bin/seo-audit.js compare <A> <B>      # CLI: rakip karşılaştırma
node bin/seo-audit.js sitemap <URL>        # CLI: XML sitemap üret
npm run seo-audit -- audit <URL>           # npm script alternatifi
```

Test dosyaları (bağımsız çalışır):
```bash
node src/test-ai.js            # AI servisi bağlantı testi
node src/test-scraper.js       # Tarama motoru testi
```

## Mimari: Veri Akışı

Tüm modüller **tek yönlü bir pipeline** ile çalışır. Hem web (`src/server.js`) hem CLI (`bin/seo-audit.js`) aynı akışı kullanır:

```
crawlSite() → buildScanData() → scoreSite() → detectIssues() + scoreImpact() → analyzeWithAI()
```

1. **`crawlSite(url)`** — `siteCrawler.js`. Sitemap.xml'den URL keşfi; yoksa BFS link keşfi. Paralel tarama (concurrency 5). `{ baseUrl, pages[], totalPagesScanned, linkHealth, geo }` döndürür.
2. **`buildScanData(crawlData)`** — `crawlData.pages`'i skor motorunun beklediği normalize yapıya çevirir. **Bu fonksiyon `server.js` içinde tanımlıdır**, ayrı modül değildir; `bin/seo-audit.js`'de kopyası vardır. Değiştirirsen iki yeri de güncelle.
3. **`scoreSite(scanData)`** — `scoreEngine.js`. Lighthouse tarzı 0-100, 5 kategori (Performance %20, SEO %30, Accessibility %10, Best Practices %20, Security %20). `{ scores, labels, pages }` döndürür; `scores.overall` genel skordur.
4. **`detectIssues(scanData, crawlData)`** — `reportIssues.js`. Puan kaybı nedenlerini `{ id, severity: Kritik/Orta/Düşük, title, detail, fix, pages }` olarak üretir. `scoreImpact()` bir `estimatedGain` dizisi döndürür — **dizi, `totalLost` alanı yoktur**.
5. **`analyzeWithAI(seoData)`** — `aiAgent.js`. Claude API / 9routers proxy / OpenAI uyumlu / SSE streaming hepsini destekler, yanıt formatını otomatik algılar. `thinking_delta` (deepseek gibi proxy'ler) dahil tüm SSE delta'larını toplar.

## Kritik Konfigürasyon: `.private/.env`

- Tüm gizli yapılandırma `.private/.env` içindedir (gitignore'da, asla commit edilmez). Örnek: `.env.example`.
- `server.js` ve `aiAgent.js` dotenv'i sabit yolla yükler: `path.join(__dirname, '..', '.private', '.env')`.
- **`bin/seo-audit.js`** birkaç konumda arar: repo içi `.private/.env`, `cwd/.private/.env`, `cwd/.env` — global/farklı dizinden çalışabilmek için.
- Anahtarlar: `ANTHROPIC_API_KEY`, `AI_API_URL` (proxy), `AI_MODEL`, `SMTP_HOST/USER/PASS/FROM`.
- API anahtarı yoksa sistem sorunsuz çalışır, yalnızca AI raporu bölümü atlanır.

## E-posta Mantığı (önemli)

E-posta gönderimi **SMTP yapılandırılmadıkça gizlidir**:
- `emailSender.js::isEmailConfigured()` → `SMTP_HOST && SMTP_USER && SMTP_PASS` kontrol eder.
- Web şablonlarında e-posta alanı/kartı yalnızca `emailConfigured` değişkeni true ise render edilir.
- `/send-report` endpoint'i SMTP yoksa baştan 400 döndürür.
- `server.js` `/` ve `/result` rotaları `emailConfigured: isEmailConfigured()` geçer.
- E-posta akışını genişletirsen bu koşullu davranışı koru.

## Git ve Repo Kuralları

- Repo: `github.com/kuveylan/seo-optimizer`, branch: `main`.
- **Git geçmişi tek commit'e temizlendi** (`dd70cc3`, orphan rebase). Eski commit'lerdeki hassas dosyaları (`.private/DEV_LOG.md`, `githup_repolari/`, `ATTRIBUTIONS/`, `fetch_repos.js`) hiçbir yeni commit'e ekleme.
- `.private/`, `githup_repolari/`, `ATTRIBUTIONS/`, `fetch_repos.js` **diskte durur ama git'e girmez** (gitignore).
- Kullanıcı tam yetki verdi: bash/curl/git işlemlerinde onay istenmez, doğrudan çalıştırılır. Tüm konuşma Türkçe.
- Commit mesajları `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` ile biter.

## Yapı Notları

- `views/` — EJS şablonları. `index.ejs` dinamik `baseUrl` kullanır (canonical/og/JSON-LD); sabit `localhost:3000` koyma.
- `public/css/` — iki CSS dosyası (`app.css`, `style.css`).
- `src/index.js` — eski basit CLI, kullanılmıyor. Güncel CLI: `bin/seo-audit.js`.
- CLI çıktısı ANSI renk kodları kullanır (Windows CMD dahil çalışır).
- AI raporu markdown'dır; web'de `marked.js` ile render edilir, CLI'da ham yazdırılır.
