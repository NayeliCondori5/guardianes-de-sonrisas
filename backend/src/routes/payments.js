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
    if (!req.file) return res.status(400).json({ success: false, message: 'Comprobante requerido' });

    try {
        const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND parent_id = ? AND status = "awaiting_payment"').get(req.params.bookingId, req.user.id);
        if (!booking) return res.status(400).json({ success: false, message: 'Reserva no válida para pago' });

        const receiptUrl = `/uploads/${req.file.filename}`;
        db.transaction(() => {
            db.prepare(`
                INSERT INTO payments (id, booking_id, amount, method, receipt_url, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            `).run(uuidv4(), booking.id, booking.total_amount, req.body.method || 'deposit', receiptUrl);
        })();

        res.json({ success: true, message: 'Comprobante subido. Esperando confirmación de un administrador.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

module.exports = router;
