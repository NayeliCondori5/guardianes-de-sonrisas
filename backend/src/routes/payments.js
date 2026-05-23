const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

router.get('/info', (req, res) => {
    try {
        const info = db.prepare('SELECT key, value FROM site_config WHERE key IN ("company_bank_account", "company_qr_image_url")').all();
        const data = {};
        info.forEach(i => data[i.key] = i.value);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.post('/:bookingId/upload-receipt', authenticateToken, upload.single('receipt'), (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ success: false, message: 'Solo padres' });

    try {
        const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND parent_id = ?').get(req.params.bookingId, req.user.id);
        if (!booking) return res.status(400).json({ success: false, message: 'Reserva no encontrada o no pertenece a este usuario' });

        const receiptUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.receipt_url || '/uploads/default-receipt.png');
        
        db.transaction(() => {
            const existing = db.prepare('SELECT id FROM payments WHERE booking_id = ?').get(booking.id);
            if (existing) {
                db.prepare('UPDATE payments SET receipt_url = ?, status = "pending" WHERE booking_id = ?').run(receiptUrl, booking.id);
            } else {
                db.prepare(`
                    INSERT INTO payments (id, booking_id, amount, method, receipt_url, status)
                    VALUES (?, ?, ?, ?, ?, 'pending')
                `).run(uuidv4(), booking.id, booking.total_amount, req.body.method || 'deposit', receiptUrl);
            }
        })();

        res.json({ success: true, message: 'Comprobante subido. Esperando confirmación de un administrador.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

module.exports = router;
