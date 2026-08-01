# 🚀 SEO Optimizer

> **Yapay zeka destekli kapsamlı SEO denetim, rakip analizi ve kurumsal PDF raporlama aracı**

SEO Optimizer, web sitelerini **50'den fazla teknik kriterle** tarayan, Lighthouse standartlarında 0-100 puanlayan ve tespit ettiği tüm eksiklikleri **somut düzeltme adımlarıyla** sunan profesyonel bir SEO hizmet aracıdır. Site sahipleri ve ajanslar için kurumsal kapaklı PDF raporları üretir; müşteriye parasının karşılığını verdiğini hissettiren eksiksiz bir deneyim sunar.

---

## ✨ Öne Çıkan Özellikler

### 🔍 Tam Site Taraması
- Sitemap.xml'den otomatik URL keşfi + BFS link keşfi (sitemap yoksa)
- 15 sayfaya kadar paralel tarama (concurrency: 5)
- TTFB / sunucu yanıt süresi ölçümü
- HTTP durum kodları, yavaş sayfa ve hata sayfası tespiti

### 📊 Lighthouse Tarzı Skorlama (0-100)
| Kategori | Ağırlık | Ölçülen Kriterler |
|---|---|---|
| Performance | %20 | TTFB, yavaş sayfalar |
| SEO | %30 | Title, Meta Description, H1, Görsel Alt, Viewport |
| Erişilebilirlik | %10 | Alt etiketleri, başlık hiyerarşisi |
| Best Practices | %20 | Kırık link, HTTP durumu, sıkıştırma, canonical, schema |
| Güvenlik | %20 | Güvenlik başlıkları (CSP, HSTS, X-Frame), HTTPS |

### ⚠️ Somut Puan Kaybı Nedenleri
Genel skorun 100 olmamasına neden olan **her eksikliği** önem derecesiyle (🔴 Kritik / 🟡 Orta / 🔵 Düşük) listeler:
- **Gerçek kırık link kontrolü** (HEAD+GET doğrulama, redirect izleme)
- Title/Description uzunluk uyarıları
- H1-H6 hiyerarşi analizi
- Thin content (zayıf içerik) tespiti
- Schema.org / JSON-LD varlığı
- Google Analytics / izleme aracı tespiti
- İç/dış link dengesi ve nofollow dağılımı
- Güvenlik başlıkları ve sıkıştırma durumu

### 🤖 Yapay Zeka Uzman Raporu (Claude AI)
- Sitenin özel durumuna göre önceliklendirilmiş aksiyon planı
- **Falsifiable** (doğrulanabilir) metriklerle hedef belirleme
- Teknik bilgisi olmayan site sahibinin anlayabileceği dil

### 📑 Kurumsal PDF Raporu
- Markalaştırılabilir kapak sayfası (logo, renk, marka)
- Genel skor dairesi + kategori bazlı skor kartları
- Sorun kartları: "Neden önemli?" + "Nasıl düzeltilir?"
- AI raporu markdown olarak işlenmiş
- A4 boyutunda, print-optimized tasarım

### ⚔️ Rakip Karşılaştırma (`/compare`)
- İki siteyi paralel tarar, yan yana skorlar
- Kategori bazlı fark tablosu + kazanan tespiti
- Anahtar kelime karşılaştırması

### 🛠️ Ücretsiz SEO Araç Kutusu (`/tools`)
- XML Sitemap üretici
- robots.txt üretici (AI bot engelleme seçenekli)
- SEO-uyumlu meta etiket üretici
- .htaccess güvenlik & hız üreticisi

### 📧 E-posta ile Rapor Gönderimi *(SMTP yapılandırılırsa)*
- PDF raporunu e-posta eki olarak gönderir (SMTP)
- Markalı HTML e-posta şablonu
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` tanımlı değilse e-posta alanları gizlenir, sistem sorunsuz çalışmaya devam eder

### 🔍 SERP Önizleme
- Title + Description'ın Google arama sonucunda nasıl görüneceğinin canlı simülasyonu
- Uzunluk uyarıları ve düzeltme önerileri

---

## ⚡ Terminal (CLI) Kullanımı

SEO Optimizer'ı doğrudan terminalden kullanabilirsiniz. Global kurulum gerekmez.

### Kurulum

**Seçenek 1 — Global komut (önerilen):** tek komutla her dizinden çalışır.

```bash
# npm paketi olarak (npm'e publish edildikten sonra)
npm install -g seo-audit

# veya doğrudan GitHub'dan
npm install -g github:kuveylan/seo-optimizer

# Denetimi çalıştır
seo-audit audit https://example.com
```

**Seçenek 2 — Repo içinde:** global kurulum istemezseniz.

```bash
git clone https://github.com/kuveylan/seo-optimizer.git
cd seo-optimizer
npm install

node bin/seo-audit.js audit https://example.com
```

### Kullanım

```bash
# 🔍 Tam site SEO denetimi
seo-audit audit https://example.com

# 🔍 Denetim + kurumsal PDF raporu indir
seo-audit audit https://example.com --pdf

# ⚔️ Rakip karşılaştırma
seo-audit compare https://example.com https://example.org

# 🗺️ XML Sitemap üret
seo-audit sitemap https://example.com
```

### 🤖 AI raporu için tek komut: `seo-audit config`

AI uzman raporunu üretmek için bir API anahtarı gerekir. Kurulumdan sonra tek komutla ayarlayın — anahtar ev dizininizdeki `~/.seo-audit.env` dosyasında güvenle saklanır:

```bash
seo-audit config
```

`config` önce **sağlayıcıyı** sorar, sonra ona uygun alanları ister:

| # | Sağlayıcı | Anahtar formatı | Model örneği |
|---|---|---|---|
| 1 | **Anthropic Claude** (resmi API) | `sk-ant-...` | `claude-sonnet-4-5` |
| 2 | **9routers** (lokal proxy) | herhangi | `mycombo` |
| 3 | **OpenRouter** | `sk-or-v1-...` | `openrouter/openrouter/free` |

### Sağlayıcıya göre ortam değişkenleri

`config` bunları otomatik yazar; isterseniz elle de ayarlayabilirsiniz (`~/.seo-audit.env` veya `.private/.env`):

```bash
# ── Seçenek 1: Anthropic ──
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# ── Seçenek 2: 9routers (lokal proxy) ──
AI_PROVIDER=9routers
ANTHROPIC_API_KEY=proxy-anahtari
AI_API_URL=http://localhost:20128/v1
AI_MODEL=mycombo

# ── Seçenek 3: OpenRouter ──
AI_PROVIDER=openrouter
ANTHROPIC_API_KEY=sk-or-v1-...
AI_API_URL=https://openrouter.ai/api/v1
AI_MODEL=openrouter/openrouter/free
```

> 💡 **Otomatik algılama:** `AI_PROVIDER` boşsa, anahtar `sk-or-` ile başlıyorsa **OpenRouter**, URL `localhost`/`127.0.0.1` içeriyorsa **9routers**, değilse **Anthropic** seçilir.

### Terminal export ile (Strix tarzı)

Kullanıcının kendi ortamında çalıştırmak istiyorsa `export` komutlarıyla da verebilir:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."          # Anthropic
# veya
export LLM_API_KEY="sk-or-v1-..."              # OpenRouter
export LLM_API_BASE="https://openrouter.ai/api/v1"
export STRIX_LLM="openrouter/openrouter/free"  # sağlayıcı/model

seo-audit audit https://example.com
```

> Export değerleri (`LLM_*`, `STRIX_LLM`) `.env` dosyasındakilerden önceliklidir.

> 💡 Anahtar girmezseniz denetim yine çalışır — yalnızca AI raporu bölümü atlanır.

### Kullanım İpuçları

> Repo içinde çalışıyorsanız `node bin/seo-audit.js` veya `npm run seo-audit -- ` de kullanabilirsiniz.
>
> `example.com` resmî bir test alanıdır (IANA) — ilk denemede onu kullanın, kendi sitenizi taramadan önce aracın nasıl çalıştığını görün.

### CLI çıktısı

Denetim terminalde şunları gösterir:

```
╔══════════════════════════════════════════════╗
║   SEO OPTIMIZER  v1.1                        ║
║   Yapay Zeka Destekli SEO Denetimi           ║
╚══════════════════════════════════════════════╝

🎯 Hedef  : https://example.com

📊 GENEL SKOR — https://example.com 🟡
  75/100 🟡 (1 sayfa, 1.5s)

🚀 Performance     ████████████████░░░░ 100  🟢 Mükemmel
🔍 SEO             ████████████░░░░░░░░  70  🟡 İyileştirilmeli
...
⚠️ Tespit Edilen Sorunlar (6)
  🔴 [Kritik] Meta Description eksik
  🟡 [Orta] Güvenlik başlıkları eksik
  ...

🤖 Yapay Zeka Uzman Raporu  ← API anahtarı varsa
✔ Denetim tamamlandı. (17.4s)
```

> 💡 CLI'da AI raporu yapılandırması için **`seo-audit config`** komutunu kullanın (yukarıda anlatıldı). Anahtar yoksa denetim yine çalışır — yalnızca AI raporu bölümü atlanır.

---

## 🚀 Hızlı Başlangıç (Web Arayüzü)

### Gereksinimler
- **Node.js 18+** (fetch API için)
- **npm** veya **yarn**

### Kurulum

```bash
# 1. Depoyu indirip dizine girin
git clone https://github.com/kuveylan/seo-optimizer.git
cd seo-optimizer

# 2. Bağımlılıkları kurun
npm install

# 3. (Opsiyonel) AI anahtarını ayarlayın
seo-audit config          # AI raporu için (veya el ile .private/.env düzenleyin)
# Not: .private/ ve ~/.seo-audit.env gitignore'da — anahtarlar asla dışarı açılmaz.

# 4. Sunucuyu başlatın
npm start
```

Tarayıcıda açın: **http://localhost:3000**

> 💡 AI anahtarı ve SMTP gerekmez — ikisi de yapılandırılmazsa sistem sorunsuz çalışır; yalnızca AI raporu ve e-posta gönderimi atlanır.

---

## 📖 Kullanım Kılavuzu

### Web Arayüzü ile (tarayıcıdan)

1. `npm start` ile sunucuyu başlatın → **http://localhost:3000**
2. Ana sayfadaki kutuya analiz edilecek sitenin URL'sini yazın (örn. `https://example.com`)
3. *(Opsiyonel)* SMTP yapılandırıldıysa e-posta adresi girin → rapor e-postanıza PDF olarak gönderilir
4. **Analiz Başlat** → site taranır, 0-100 skorlanır, AI raporu üretilir (30-60 sn)

**Web arayüzünün alt sayfaları:**

| Sayfa | Adres | Ne işe yarar? |
|---|---|---|
| 🏠 Ana Sayfa | `/` | Yeni SEO analizi başlatma |
| 📊 Analiz Sonucu | `/result?url=...` | Skorlar, sorunlar, AI raporu |
| ⚔️ Rakip Karşılaştırma | `/compare` | İki siteyi yan yana kıyaslar |
| 🛠️ Araç Kutusu | `/tools` | Sitemap / robots.txt / meta / .htaccess üretici |
| 📄 PDF Rapor | `/download-pdf?url=...` | Kurumsal PDF raporunu indirir |

### Test dosyaları (geliştiriciler için)

```bash
# AI servisi bağlantısını test et (önce .private/.env'yi ayarlayın)
node src/test-ai.js

# Tarama motorunu test et
node src/test-scraper.js
```

---

## ⚙️ Ortam Değişkenleri (.private/.env)

| Değişken | Açıklama | Zorunlu |
|---|---|---|
| `AI_PROVIDER` | Sağlayıcı: `anthropic` / `9routers` / `openrouter` (boşsa otomatik algılanır) | Hayır |
| `ANTHROPIC_API_KEY` | API anahtarı (Anthropic `sk-ant-`, OpenRouter `sk-or-`) | Hayır* |
| `AI_API_URL` | 9routers gibi proxy URL'si veya OpenRouter base | Hayır* |
| `AI_MODEL` | Kullanılacak AI modeli | Hayır |
| `LLM_API_KEY` | Export alternatifi (OpenRouter `sk-or-`) | Hayır* |
| `LLM_API_BASE` | Export alternatifi (OpenRouter base URL) | Hayır* |
| `STRIX_LLM` | Export alternatifi (`sağlayıcı/model` formatında) | Hayır* |
| `SMTP_HOST` | E-posta gönderimi için SMTP sunucusu | Hayır |
| `SMTP_PORT` | SMTP portu (varsayılan 587) | Hayır |
| `SMTP_USER` | SMTP kullanıcı adı | Hayır |
| `SMTP_PASS` | SMTP şifresi | Hayır |
| `SMTP_FROM` | Gönderici adresi | Hayır |

*AI raporu yoksa sistem teknik skorlamayla çalışmaya devam eder.
*SMTP (e-posta) yapılandırılmazsa e-posta alanları gizlenir, sistem sorunsuz çalışır.
*`config` komutu bu değerleri `~/.seo-audit.env`'e otomatik yazar.

---

## 🤖 Yapay Zeka Model Entegrasyonu

SEO Optimizer, AI uzman raporunu **birden fazla model ve servisle** üretebilir. Kod, tek dosyada (`src/aiAgent.js`) hepsini destekler:

### Desteklenen AI servisleri

| Servis | Nasıl çalışır | `.env` ayarı |
|---|---|---|
| **Anthropic Claude** (resmi API) | `/v1/messages` uç noktası, `x-api-key` başlığı | `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY=sk-ant-...` |
| **9routers / lokal proxy** | Localhost üzerinde çalışan proxy'ye istek atar, Anthropic formatında | `AI_PROVIDER=9routers` + `AI_API_URL=http://localhost:20128/v1` |
| **OpenRouter** | Bearer auth + `/chat/completions`, yüzlerce model | `AI_PROVIDER=openrouter` + `ANTHROPIC_API_KEY=sk-or-...` |
| **OpenAI uyumlu API'ler** | `/chat/completions` formatında yanıtları otomatik tanır | `AI_API_URL=https://.../v1` |
| **SSE streaming destekleyenler** | Cloudflare Workers AI vb. streaming yanıtları otomatik ayrıştırılır | `AI_API_URL` ile birlikte |

> Sağlayıcı **otomatik algılanır**: `AI_PROVIDER` boşsa, anahtar `sk-or-` ile başlıyorsa OpenRouter, URL `localhost` içeriyorsa 9routers, değilse Anthropic seçilir.

### Desteklenen model örnekleri (AI_MODEL)

```bash
# Anthropic Claude — en yeni aile
AI_MODEL=claude-sonnet-4-5          # hızlı / dengeli
AI_MODEL=claude-opus-4              # en yetenekli (ağır analiz)

# 9routers / proxy üzerinden gelen modeller
AI_MODEL=mycombo                    # 9routers kombo modeli
AI_MODEL=gpt-4o                     # OpenAI modeli (proxy üzerinden)

# OpenRouter (sk-or- anahtarı gerektirir)
AI_MODEL=openrouter/openrouter/free # ücretsiz model
AI_MODEL=openrouter/auto            # otomatik seçim
AI_MODEL=anthropic/claude-3.5-sonnet
```

> 💡 **İpucu:** Doğrudan Anthropic API'si kullanacaksanız yalnızca `ANTHROPIC_API_KEY` yeterlidir. 9routers gibi bir proxy kullanıyorsanız `AI_API_URL` + `AI_MODEL`; OpenRouter için `sk-or-` anahtarı + model adı yeterli. Hepsi `seo-audit config` ile kolayca ayarlanır.

### Model nasıl seçilir?

- **Doğru öncelik:** `AI_MODEL` değişkeni kullanılan modeli belirler.
- **Varsayılan:** `AI_MODEL` boşsa kod `claude-sonnet-4-5` kullanır.
- **Akıllı yanıt ayrıştırma:** Kod, gelen yanıtın Anthropic mi OpenAI mı streaming mi olduğunu **otomatik algılar** — böylece proxy'den gelen veri formatından bağımsız çalışır.

### AI olmadan çalışma

`ANTHROPIC_API_KEY` girilmemişse sistem **sorunsuz çalışmaya devam eder**: teknik tarama, 0-100 skorlama, sorun tespiti ve PDF raporu tam olarak üretilir; yalnızca "AI Uzman Raporu" bölümü atlanır.

---

## 📁 Proje Yapısı

```
seo-optimizer/
├── src/
│   ├── server.js              # Express web sunucusu + rotalar
│   ├── siteCrawler.js         # Tam site tarama motoru (sitemap + BFS)
│   ├── scoreEngine.js         # Lighthouse tarzı 0-100 skorlama
│   ├── reportIssues.js        # Puan kaybı / SEO sorun tespiti
│   ├── keywordAnalyzer.js     # Türkçe anahtar kelime analizi
│   ├── geoReadyEngine.js      # AI görünürlük (GEO) skorlama
│   ├── aiAgent.js             # Claude AI rapor motoru
│   ├── pdfReportGenerator.js  # Puppeteer PDF üretici
│   ├── competitorAnalyzer.js  # Rakip karşılaştırma modülü
│   ├── seoToolbox.js          # Ücretsiz SEO araç kutusu
│   ├── emailSender.js         # E-posta gönderim modülü (SMTP)
│   └── index.js               # (eski, kullanılmıyor) basit tek sayfa CLI
├── bin/
│   ├── seo-audit.js           # Terminal denetim aracı (node bin/seo-audit.js)
│   └── seo-audit              # (eski shebang girişi, kullanılmıyor)
├── views/                     # EJS şablonları
│   ├── index.ejs              # SEO-optimize landing page
│   ├── result.ejs             # Analiz sonuç sayfası
│   ├── compare.ejs            # Rakip karşılaştırma
│   ├── tools.ejs              # Araç kutusu
│   └── loading.ejs            # Yükleme ekranı
├── public/css/                # Stil dosyaları
├── install.sh                 # Tek satır kurulum betiği
└── .env.example               # Örnek ortam değişkenleri
```

---

## 🔌 Rotalar

| Rota | Açıklama |
|---|---|
| `GET /` | Landing page (SEO-optimize) |
| `POST /audit` | Analiz başlatma (loading ekranı) |
| `GET /result?url=` | Analiz sonuçları (`&email=` opsiyonel, SMTP varsa) |
| `GET /download-pdf?url=` | Kurumsal PDF raporu |
| `GET /compare` / `POST /compare` | Rakip karşılaştırma |
| `GET /tools` / `POST /tools` | Ücretsiz araç kutusu |
| `POST /send-report` | E-posta ile rapor gönderimi |

---

## 🌍 SEO & GEO (AI Görünürlük)

Sistem, sitelerin **yapay zeka arama motorlarındaki** (ChatGPT, Claude, Perplexity) görünürlüğünü de değerlendirir:
- robots.txt'te AI botları (GPTBot, ClaudeBot) engellenmiş mi?
- llms.txt dosyası var mı?
- Yapılandırılmış veri (schema) ve içerik AI alıntılanabilirliğini etkiler mi?

---

## 📜 Atıflar & Lisans

> **© 2026 kuveylan** — Bu proje, kuveylan tarafından geliştirilen **özgün bir çalışmadır**. Tüm kod MIT Lisansı altında sunulur; ancak projenin bütünü **başkası tarafından sahiplenilemez ve kaynak gösterilmeden yeniden yayınlanamaz.** Her kod dosyasının başında telif bildirimi bulunur.

Bu proje, açık kaynak SEO araçlarının **yaklaşımlarından ve metodolojilerinden** ilham alarak tamamen özgün kodla geliştirilmiştir. Hiçbir repodan kod kopyalanmamıştır; yalnızca teknik kavramlar (Lighthouse tarzı skorlama, sitemap taraması, GEO denetimi gibi) benimsenmiştir.

Kod, **MIT Lisansı** altında yayınlanmaktadır.

### İlham Alınan Açık Kaynak Araçlar
| Repo | Lisans | Katkısı |
|---|---|---|
| [every-app/open-seo](https://github.com/every-app/open-seo) | MIT | Site audit iş akışı, anahtar kelime analizi yaklaşımı |
| [GoogleChrome/lighthouse](https://github.com/GoogleChrome/lighthouse) | Apache-2.0 | 0-100 kategori bazlı skorlama modeli |
| [janreges/siteone-crawler](https://github.com/janreges/siteone-crawler) | MIT | Güvenlik başlıkları, sitemap/link keşfi |
| [sethblack/python-seo-analyzer](https://github.com/sethblack/python-seo-analyzer) | MIT | Meta etiket / başlık analiz metodolojisi |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) | MIT | AI tabanlı önceliklendirilmiş aksiyon planı |
| [Auriti-Labs/geo-optimizer-skill](https://github.com/Auriti-Labs/geo-optimizer-skill) | MIT | GEO / AI görünürlük skorlama |
| [stevenvachon/broken-link-checker](https://github.com/stevenvachon/broken-link-checker) | MIT | Kırık link tespiti yaklaşımı |

İncelenen 100'den fazla açık kaynak repo'nun tam arşivi ve atıf tablosu (`ATTRIBUTIONS/` + `githup_repolari/`) yalnızca geliştiricinin yerel dizininde tutulur, repoya dahil edilmez.

---

## 🛠️ Teknoloji Yığını

- **Node.js / Express** — Web sunucusu
- **Puppeteer** — PDF rapor üretimi
- **Cheerio** — HTML ayrıştırma
- **Axios** — HTTP istekleri
- **EJS** — Şablon motoru
- **Claude API** — AI uzman raporu
- **Nodemailer** — E-posta gönderimi

---

## ⚠️ Sorumluluk Reddi

- Bu araç **teşhis** (diagnostic) amaçlıdır; skorlar bir kılavuzdur, resmi Google sıralama göstergesi değildir.
- Taranan sitelerden alınan veriler yalnızca raporlama için kullanılır, saklanmaz.
- Ticari kullanım öncesi hedef sitenin robots.txt kurallarına saygı gösterin.
