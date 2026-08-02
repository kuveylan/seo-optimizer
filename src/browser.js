/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
/**
 * Hibrit Chromium / Chrome Başlatıcı (browser.js)
 *
 * Derlenmiş tekil executable (.exe) içinde Puppeteer'ın kendi Chromium'u
 * bulunmayabilir (/snapshot/ sanal dosya sistemi). Bu yardımcı, tarayıcıyı
 * şu sırayla bulur:
 *   1. PUPPETEER_EXECUTABLE_PATH (açıkça ayarlanmışsa)
 *   2. Puppeteer'ın kendi indirdiği Chromium (dev ortamı)
 *   3. Sistemde kurulu Chrome / Edge / Chromium (platform bazlı arama)
 *   4. Bulunamazsa: Türkçe anlaşılır hata — Chrome/Edge kurun veya
 *      PUPPETEER_EXECUTABLE_PATH ile işaret edin.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer');

/** Windows ve macOS/Linux için en yaygın sistem tarayıcı yolları. */
function getSystemBrowserPaths() {
    const paths = [];
    const home = os.homedir();

    if (process.platform === 'win32') {
        const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
        const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        const localAppData = process.env['LOCALAPPDATA'] || path.join(home, 'AppData', 'Local');

        const winVariants = [
            // Google Chrome
            path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(progFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            // Microsoft Edge (Chromium tabanlı)
            path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            path.join(progFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            // Chromium (Portable)
            path.join(localAppData, 'Chromium', 'Application', 'chrome.exe'),
        ];
        paths.push(...winVariants);
    } else if (process.platform === 'darwin') {
        paths.push(
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            path.join(home, 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
            '/usr/bin/google-chrome',
            '/usr/bin/chromium'
        );
    } else {
        // Linux
        paths.push(
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/usr/bin/microsoft-edge',
            '/snap/bin/chromium',
            '/opt/google/chrome/chrome'
        );
    }
    return paths;
}

/** Belirtilen yollar arasından var olan ilkini döndürür; yoksa null. */
function findExisting(paths) {
    for (const p of paths) {
        try {
            if (p && fs.existsSync(p)) return p;
        } catch (_) { /* erişim hatası görmezden gelinir */ }
    }
    return null;
}

/**
 * Çalıştırılabilir bir Chrome/Chromium yolu çözer.
 * Bulunamazsa null döndürür (çağıran hata fırlatmalıdır).
 */
function resolveBrowserPath() {
    // 1) Açıkça ayarlanmış env değişkeni
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
        if (fs.existsSync(envPath)) return envPath;
    }

    // 2) Puppeteer'ın kendi indirdiği Chromium (dev ortamı)
    try {
        const bundled = puppeteer.executablePath();
        if (bundled && fs.existsSync(bundled)) return bundled;
    } catch (_) { /* pkg içinde bulunmayabilir */ }

    // 3) Sistemde kurulu Chrome / Edge / Chromium
    const systemPath = findExisting(getSystemBrowserPaths());
    if (systemPath) return systemPath;

    return null;
}

/**
 * PDF vb. için yapılandırılmış bir Puppeteer tarayıcı örneği başlatır.
 * @param {Object} [options] puppeteer.launch'a ek seçenekler
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function launchBrowser(options = {}) {
    const executablePath = resolveBrowserPath();

    if (!executablePath) {
        throw new Error(
            'Tarayıcı bulunamadı. PDF raporu için Chrome, Edge veya Chromium kurulu olmalı.\n' +
            'Kurulu bir tarayıcıyı işaret etmek için PUPPETEER_EXECUTABLE_PATH ortam değişkenini kullanın:\n' +
            '  Windows: set PUPPETEER_EXECUTABLE_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\n' +
            '  Linux:   export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome'
        );
    }

    return puppeteer.launch({
        executablePath,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ],
        ...options
    });
}

module.exports = { launchBrowser, resolveBrowserPath, getSystemBrowserPaths };
