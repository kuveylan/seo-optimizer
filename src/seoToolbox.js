/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
/**
 * Ücretsiz SEO Araç Kutusu
 *
 * SEOptimer'ın ücretsiz araç kutusuna benzer şekilde:
 * - XML Sitemap Üretici
 * - robots.txt Üretici
 * - Meta Etiket Üretici (Title + Description önerisi)
 * - .htaccess Üretici (güvenlik + sıkıştırma + yönlendirme)
 *
 * Bu araçlar site sahibinin eksiklikleri hemen düzeltebilmesini sağlar
 * ve sistemimizi "sadece rapor veren" değil "çözüm üreten" yapar.
 */

// 1. XML Sitemap Üretici
function generateSitemap(urls, baseUrl) {
    const today = new Date().toISOString().split('T')[0];
    const items = (urls || []).map(u => {
        const normalized = u || baseUrl;
        return `  <url>\n    <loc>${escapeXml(normalized)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${normalized === baseUrl ? '1.0' : '0.8'}</priority>\n  </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// 2. robots.txt Üretici
function generateRobotsTxt({ baseUrl, allowAllBots = false, blockAiBots = false }) {
    const hostname = new URL(baseUrl).hostname;
    let content = `User-agent: *\n`;
    content += allowAllBots ? `Allow: /\n` : `Disallow: /admin/\nDisallow: /panel/\nDisallow: /private/\n`;

    if (blockAiBots) {
        content += `\n# AI botlarını engelle (tercihe göre)\n`;
        ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'anthropic-ai', 'Google-Extended'].forEach(bot => {
            content += `\nUser-agent: ${bot}\nDisallow: /\n`;
        });
    }

    content += `\nSitemap: https://${hostname}/sitemap.xml\n`;
    return content;
}

// 3. Meta Etiket Üretici
function generateMetaTags({ title, description, siteName, ogImage }) {
    return `<title>${escapeXml(title || '')}</title>
<meta name="description" content="${escapeXml(description || '')}">
<meta property="og:title" content="${escapeXml(title || '')}">
<meta property="og:description" content="${escapeXml(description || '')}">
<meta property="og:type" content="website">
${siteName ? `<meta property="og:site_name" content="${escapeXml(siteName)}">` : ''}
${ogImage ? `<meta property="og:image" content="${escapeXml(ogImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${escapeXml(siteName ? 'https://' + siteName.toLowerCase().replace(/\s+/g, '') + '/' : '/')}">`;
}

// 4. .htaccess Üretici (güvenlik başlıkları + sıkıştırma + HTTPS)
function generateHtaccess({ httpsRedirect = true, gzip = true, securityHeaders = true }) {
    let content = `# ============================================\n# SEO Optimizer - .htaccess Üretici\n# ============================================\n`;

    if (httpsRedirect) {
        content += `
# HTTP -> HTTPS Yönlendirme
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [L,R=301]
</IfModule>
`;
    }

    if (gzip) {
        content += `
# Gzip Sıkıştırma
<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
`;
    }

    if (securityHeaders) {
        content += `
# Güvenlik Başlıkları
<IfModule mod_headers.c>
Header set X-Frame-Options "SAMEORIGIN"
Header set X-Content-Type-Options "nosniff"
Header set Referrer-Policy "strict-origin-when-cross-origin"
Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header set Content-Security-Policy "default-src 'self' https:; img-src 'self' data: https:; script-src 'self' https:; style-src 'self' 'unsafe-inline' https:"
</IfModule>
`;
    }

    return content;
}

module.exports = {
    generateSitemap,
    generateRobotsTxt,
    generateMetaTags,
    generateHtaccess
};
