/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
/**
 * Puppeteer Tabanlı Profesyonel PDF Rapor Üretici
 *
 * Müşteriye parasının karşılığını verdiğini hissettiren,
 * markalaştırılabilir, kapak sayfalı, grafikli ve adım adım
 * çözümlü kurumsal SEO Raporu (PDF) oluşturur.
 */

const { launchBrowser } = require('./browser');
const marked = require('marked');

async function generatePdfReport({ scanData, crawlData, scored, issues, aiReport, userEmail, baseUrl }) {
    const browser = await launchBrowser();

    try {
        const page = await browser.newPage();

        // Rapor Tarihi
        const todayStr = new Date().toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // AI Raporunu Markdown -> HTML dönüştür
        let aiReportHtml = '';
        if (aiReport && typeof aiReport === 'string' && !aiReport.startsWith('Hata') && !aiReport.startsWith('❌')) {
            aiReportHtml = marked.parse(aiReport);
        } else {
            aiReportHtml = `<p class="text-red-500 font-semibold">${aiReport || 'AI Raporu oluşturulamadı.'}</p>`;
        }

        // Skor kartları için yardımcı renk tanımları
        const overallScore = scored ? scored.scores.overall : 0;
        const scoreColor = overallScore >= 90 ? '#10B981' : overallScore >= 50 ? '#F59E0B' : '#EF4444';

        const perfScore = scored ? scored.scores.performance : 0;
        const seoScore = scored ? scored.scores.seo : 0;
        const a11yScore = scored ? scored.scores.accessibility : 0;
        const bpScore = scored ? scored.scores.bestPractices : 0;
        const secScore = scored ? scored.scores.security : 0;

        // Sorunların listesini hazırlayalım
        const issuesRowsHtml = issues.map((iss, index) => {
            const badgeClass = iss.severity === 'Kritik' ? 'bg-red-100 text-red-700 border-red-200' :
                iss.severity === 'Orta' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200';

            const severityBadge = `<span class="badge ${badgeClass}">${iss.severity}</span>`;

            return `
                <div class="issue-card">
                    <div class="issue-header">
                        <div class="issue-title-group">
                            <span class="issue-number">#${index + 1}</span>
                            <span class="category-tag">${iss.category}</span>
                            <h3 class="issue-title">${iss.title}</h3>
                        </div>
                        ${severityBadge}
                    </div>
                    <div class="issue-body">
                        <p class="issue-detail"><b>Neden Önemli:</b> ${iss.detail}</p>
                        <div class="fix-box">
                            <span class="fix-label">🛠️ Düzeltme Adımı / Çözüm:</span>
                            <p class="fix-text">${iss.fix}</p>
                        </div>
                        ${iss.pages && iss.pages.length > 0 ? `
                        <div class="affected-pages">
                            <span class="pages-label">Etkilenen Sayfalar (${iss.pageCount}):</span>
                            <ul class="pages-list">
                                ${iss.pages.slice(0, 3).map(p => `<li><code>${p}</code></li>`).join('')}
                                ${iss.pageCount > 3 ? `<li class="more-pages">+ ${iss.pageCount - 3} sayfa daha...</li>` : ''}
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        const htmlContent = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <title>Kapsamlı SEO Denetim ve Analiz Raporu</title>

            <!-- Inter Yazı Tipi & Tailwind CSS -->
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <script src="https://cdn.tailwindcss.com"></script>

            <style>
                @page {
                    size: A4;
                    margin: 0;
                }
                body {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    background-color: #F8FAFC;
                    color: #0F172A;
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                }
                .page {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm;
                    margin: 0 auto;
                    background: white;
                    box-sizing: border-box;
                    position: relative;
                    page-break-after: always;
                }
                .page:last-child {
                    page-break-after: avoid;
                }

                /* Kapak Sayfası Stilleri */
                .cover-page {
                    background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .cover-badge {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    display: inline-block;
                    padding: 6px 16px;
                    border-radius: 50px;
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                }
                .cover-title {
                    font-size: 42px;
                    font-weight: 800;
                    line-height: 1.15;
                    margin-top: 20px;
                    background: linear-gradient(to right, #FFFFFF, #C7D2FE);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .meta-box {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 24px;
                }

                /* Skor Dairesi */
                .score-circle {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    border: 8px solid ${scoreColor};
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 25px -5px ${scoreColor}40;
                }

                /* Kart Stilleri */
                .card {
                    background: white;
                    border: 1px solid #E2E8F0;
                    border-radius: 14px;
                    padding: 20px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
                }

                /* Sorun Kartı Stilleri */
                .issue-card {
                    background: white;
                    border: 1px solid #E2E8F0;
                    border-left: 4px solid #6366F1;
                    border-radius: 12px;
                    padding: 18px;
                    margin-bottom: 16px;
                    page-break-inside: avoid;
                }
                .issue-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 10px;
                }
                .issue-title-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .issue-number {
                    font-weight: 800;
                    color: #6366F1;
                    font-size: 14px;
                }
                .category-tag {
                    background: #EEF2FF;
                    color: #4F46E5;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 6px;
                    text-transform: uppercase;
                }
                .issue-title {
                    font-size: 15px;
                    font-weight: 700;
                    color: #1E293B;
                    margin: 0;
                }
                .badge {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: 50px;
                    border: 1px solid;
                }
                .issue-detail {
                    font-size: 13px;
                    color: #475569;
                    margin-bottom: 12px;
                    line-height: 1.5;
                }
                .fix-box {
                    background: #F8FAFC;
                    border: 1px dashed #CBD5E1;
                    border-radius: 8px;
                    padding: 10px 14px;
                    font-size: 12px;
                }
                .fix-label {
                    font-weight: 700;
                    color: #0F172A;
                    display: block;
                    margin-bottom: 2px;
                }
                .fix-text {
                    color: #334155;
                    margin: 0;
                }
                .affected-pages {
                    margin-top: 10px;
                    font-size: 11px;
                }
                .pages-label {
                    font-weight: 600;
                    color: #64748B;
                }
                .pages-list {
                    list-style: none;
                    padding: 0;
                    margin: 4px 0 0 0;
                }
                .pages-list code {
                    background: #F1F5F9;
                    color: #475569;
                    padding: 1px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                }

                /* Prose / Markdown düzenlemeleri */
                .prose {
                    font-size: 13px;
                    line-height: 1.6;
                    color: #334155;
                }
                .prose h2 {
                    font-size: 18px;
                    font-weight: 800;
                    color: #0F172A;
                    border-bottom: 2px solid #E2E8F0;
                    padding-bottom: 6px;
                    margin-top: 20px;
                    margin-bottom: 12px;
                }
                .prose h3 {
                    font-size: 15px;
                    font-weight: 700;
                    color: #1E293B;
                    margin-top: 14px;
                    margin-bottom: 6px;
                }
                .prose table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 12px;
                    font-size: 11px;
                }
                .prose th, .prose td {
                    border: 1px solid #CBD5E1;
                    padding: 8px;
                    text-align: left;
                }
                .prose th {
                    background: #F1F5F9;
                    font-weight: 700;
                }
            </style>
        </head>
        <body>

            <!-- SAYFA 1: KAPAK SAYFASI -->
            <div class="page cover-page">
                <div>
                    <div class="flex justify-between items-center mb-12">
                        <div class="cover-badge">🚀 AI-POWERED AUDIT AGENT</div>
                        <div class="text-xs text-indigo-200">${todayStr}</div>
                    </div>

                    <div class="text-xs text-indigo-300 font-bold uppercase tracking-widest mb-2">Kurumsal SEO Denetim Raporu</div>
                    <h1 class="cover-title">${baseUrl}</h1>
                    <p class="text-indigo-200 mt-4 text-base max-w-lg">Sitenizin 50+ teknik kriter üzerinden taranarak oluşturulmuş kapsamlı analiz, puan kaybı nedenleri ve öncelikli aksiyon planı.</p>
                </div>

                <div>
                    <div class="grid grid-cols-2 gap-4 mb-8">
                        <div class="meta-box">
                            <span class="text-xs text-indigo-300 block uppercase font-semibold">Taranan Hedef URL</span>
                            <span class="text-sm font-bold text-white truncate block mt-1">${baseUrl}</span>
                        </div>
                        <div class="meta-box">
                            <span class="text-xs text-indigo-300 block uppercase font-semibold">Müşteri / Alıcı E-Posta</span>
                            <span class="text-sm font-bold text-white truncate block mt-1">${userEmail}</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-6 border-t border-indigo-900/50 text-xs text-indigo-300">
                        <div>Gizli & Özel Rapor • Sadece İlgili Alıcı İçindir</div>
                        <div>Taranan Sayfa: <b>${crawlData ? crawlData.totalPagesScanned : 1}</b></div>
                    </div>
                </div>
            </div>

            <!-- SAYFA 2: GENEL SKOR VE ÖZET -->
            <div class="page">
                <div class="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                    <h2 class="text-xl font-extrabold text-gray-800">📊 Genel SEO Skoru & Performans Özeti</h2>
                    <span class="text-xs text-gray-400 font-medium">${baseUrl}</span>
                </div>

                <!-- Genel Skor Kartı -->
                <div class="card mb-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-xs text-indigo-300 font-bold uppercase tracking-wider">Mevcut Durum Puanı</span>
                            <h2 class="text-2xl font-black mt-1">Lighthouse Standart Puanı</h2>
                            <p class="text-xs text-slate-300 mt-1 max-w-md">100 üzerinden hesaplanan genel skorunuz. Aşağıda puanınızın kırılmasına neden olan ${issues.length} ana eksikliği inceleyebilirsiniz.</p>
                        </div>
                        <div class="score-circle bg-white/10 backdrop-blur">
                            <span class="text-3xl font-black text-white">${overallScore}</span>
                            <span class="text-xs font-bold text-slate-300">/ 100</span>
                        </div>
                    </div>
                </div>

                <!-- Kategori Puanları Gridi -->
                <div class="grid grid-cols-4 gap-3 mb-8">
                    <div class="card text-center p-4">
                        <span class="text-xs font-bold text-gray-500 uppercase">SEO</span>
                        <div class="text-2xl font-black text-gray-800 mt-1">${seoScore}</div>
                        <span class="text-[10px] font-semibold ${seoScore >= 80 ? 'text-green-600' : 'text-amber-600'}">${seoScore >= 80 ? '🟢 Mükemmel' : '🟡 İyileştirilmeli'}</span>
                    </div>
                    <div class="card text-center p-4">
                        <span class="text-xs font-bold text-gray-500 uppercase">Performans</span>
                        <div class="text-2xl font-black text-gray-800 mt-1">${perfScore}</div>
                        <span class="text-[10px] font-semibold ${perfScore >= 80 ? 'text-green-600' : 'text-amber-600'}">${perfScore >= 80 ? '🟢 Hızlı' : '🟡 Yavaş'}</span>
                    </div>
                    <div class="card text-center p-4">
                        <span class="text-xs font-bold text-gray-500 uppercase">Erişilebilirlik</span>
                        <div class="text-2xl font-black text-gray-800 mt-1">${a11yScore}</div>
                        <span class="text-[10px] font-semibold ${a11yScore >= 80 ? 'text-green-600' : 'text-amber-600'}">${a11yScore >= 80 ? '🟢 Uygun' : '🟡 Eksik'}</span>
                    </div>
                    <div class="card text-center p-4">
                        <span class="text-xs font-bold text-gray-500 uppercase">Güvenlik</span>
                        <div class="text-2xl font-black text-gray-800 mt-1">${secScore}</div>
                        <span class="text-[10px] font-semibold ${secScore >= 80 ? 'text-green-600' : 'text-amber-600'}">${secScore >= 80 ? '🟢 Güvenli' : '🟡 Eksik Başlıklar'}</span>
                    </div>
                </div>

                <!-- Puan Kaybı Nedenleri Başlığı -->
                <div class="mb-4">
                    <h2 class="text-lg font-bold text-gray-800">⚠️ Puan Kaybına Neden Olan Eksiklikler (${issues.length} Sorun)</h2>
                    <p class="text-xs text-gray-500">Puanınızın 100 olmasını engelleyen ve düzeltilmesi gereken tüm eksikler önem sırasına göre aşağıda listelenmiştir.</p>
                </div>

                <!-- Sorunlar Listesi -->
                <div>
                    ${issuesRowsHtml || '<p class="text-green-600 text-sm font-semibold">Tebrikler! Sitenizde puan kaybettirecek kritik bir sorun bulunamadı.</p>'}
                </div>
            </div>

            <!-- SAYFA 3: AI UZMAN RAPORU VE ÖNCELLİKLİ AKSİYON PLANI -->
            <div class="page">
                <div class="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                    <h2 class="text-xl font-extrabold text-gray-800">🤖 Yapay Zeka Uzman Raporu & Strateji</h2>
                    <span class="text-xs text-indigo-600 font-bold">Claude AI Engine</span>
                </div>

                <div class="prose">
                    ${aiReportHtml}
                </div>

                <!-- Alt Bilgi Dipnotu -->
                <div class="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
                    Bu rapor SEO Optimizer tarafından otomatik oluşturulmuştur. Sorularınız için bizimle iletişime geçebilirsiniz.
                </div>
            </div>

        </body>
        </html>
        `;

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
        });

        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

module.exports = { generatePdfReport };
