const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');

// Run every 6 hours
cron.schedule('0 */6 * * *', async () => {
    console.log('[CRON] Iniciando Job de Limpieza de Archivos Huérfanos...');
    try {
        const uploadsDir = process.env.UPLOADS_DIR || './uploads';
        if (!fs.existsSync(uploadsDir)) {
            console.log('[CRON] Directorio de subidas no existe, saltando.');
            return;
        }

        // 1. Get all local files in uploads folder
        const files = fs.readdirSync(uploadsDir);
        if (files.length === 0) {
            console.log('[CRON] No hay archivos locales en el directorio de subidas.');
            return;
        }

        // 2. Fetch all active file urls referenced in the database
        const activeUrls = new Set();

        const { rows: users } = await db.query('SELECT avatar_url FROM users WHERE avatar_url IS NOT NULL');
        users.forEach(u => activeUrls.add(u.avatar_url));

        const { rows: sitters } = await db.query('SELECT document_url, selfie_url FROM sitters');
        sitters.forEach(s => {
            if (s.document_url) activeUrls.add(s.document_url);
            if (s.selfie_url) activeUrls.add(s.selfie_url);
        });

        const { rows: payments } = await db.query('SELECT receipt_url FROM payments WHERE receipt_url IS NOT NULL');
        payments.forEach(p => activeUrls.add(p.receipt_url));

        const { rows: contentCards } = await db.query('SELECT image_url FROM content_cards WHERE image_url IS NOT NULL');
        contentCards.forEach(c => activeUrls.add(c.image_url));

        // 3. Compare local files and delete if not referenced and older than 1 hour
        let deletedCount = 0;
        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            if (file === '.gitkeep' || file === '.placeholder') return;

            const stats = fs.statSync(filePath);
            const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

            // Avoid race conditions: only delete files created more than 1 hour ago
            if (ageHours < 1) return;

            // Check if file is referenced by any URL
            let isReferenced = false;
            for (const url of activeUrls) {
                if (url && url.endsWith(file)) {
                    isReferenced = true;
                    break;
                }
            }

            if (!isReferenced) {
                try {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`[CRON] Archivo huérfano local eliminado: ${file}`);
                } catch (err) {
                    console.error(`[CRON] Error al eliminar archivo: ${file}`, err);
                }
            }
        });

        console.log(`[CRON] Job completado: Se eliminaron ${deletedCount} archivos huérfanos.`);
    } catch (error) {
        console.error('[CRON] Error ejecutando el job de limpieza:', error);
    }
});
