/**
 * SEO Optimizer — © 2026 kuveylan
 * MIT License — Özgün çalışma. İzinsiz kopyalanması / sahiplenilmesi yasaktır.
 */
/**
 * E-posta ile Rapor Gönderim Modülü
 *
 * Müşteriye/prospekte üretilen SEO raporunu PDF eki olarak gönderir.
 * SMTP ayarları .env dosyasından okunur:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

const nodemailer = require('nodemailer');

function isEmailConfigured() {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

/**
 * SEO raporunu PDF ekiyle e-posta olarak gönderir
 * @param {string} to - Alıcı e-posta adresi
 * @param {string} subject - Konu
 * @param {string} htmlBody - HTML içerik
 * @param {Buffer} pdfBuffer - PDF rapor eki
 * @param {string} pdfFilename - Ek dosya adı
 */
async function sendReportEmail({ to, subject, htmlBody, pdfBuffer, pdfFilename }) {
    if (!isEmailConfigured()) {
        console.log('⚠️  SMTP yapılandırılmadı. E-posta gönderilmedi. (.env içinde SMTP_HOST, SMTP_USER, SMTP_PASS tanımlayın)');
        return { sent: false, reason: 'SMTP yapılandırılmadı' };
    }

    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject: subject || 'SEO Denetim Raporunuz Hazır',
            html: htmlBody || '<p>Web sitenizin kapsamlı SEO denetim raporu ekte sunulmuştur.</p>',
            attachments: pdfBuffer ? [{ filename: pdfFilename, content: pdfBuffer, contentType: 'application/pdf' }] : []
        });

        console.log(`📧 Rapor e-postası gönderildi -> ${to} (Message ID: ${info.messageId})`);
        return { sent: true, messageId: info.messageId };
    } catch (e) {
        console.error('❌ E-posta gönderme hatası:', e.message);
        return { sent: false, reason: e.message };
    }
}

module.exports = { sendReportEmail, isEmailConfigured };
