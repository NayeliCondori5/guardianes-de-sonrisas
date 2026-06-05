const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

router.get('/info', async (req, res) => {
    try {
        const { rows: info } = await db.query("SELECT key, value FROM site_config WHERE key IN ('company_bank_account', 'company_qr_image_url')");
        const data = {};
        info.forEach(i => data[i.key] = i.value);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.post('/:bookingId/upload-receipt', authenticateToken, upload.single('receipt'), async (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ success: false, message: 'Solo padres' });

    try {
        const { rows: bookingRows } = await db.query('SELECT * FROM bookings WHERE id = $1 AND parent_id = $2', [req.params.bookingId, req.user.id]);
        const booking = bookingRows.length > 0 ? bookingRows[0] : null;
        if (!booking) return res.status(400).json({ success: false, message: 'Reserva no encontrada o no pertenece a este usuario' });

        // Cloudinary returns the full URL in req.file.path
        let receiptUrl = req.file ? req.file.path : (req.body.receipt_url || '/uploads/default-receipt.png');
        if (req.file && !receiptUrl.startsWith('http://') && !receiptUrl.startsWith('https://')) {
            const host = req.get('host');
            const protocol = req.protocol;
            receiptUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
        }
        
        await db.transaction(async (client) => {
            const { rows: existingRows } = await client.query('SELECT id FROM payments WHERE booking_id = $1', [booking.id]);
            if (existingRows.length > 0) {
                await client.query('UPDATE payments SET receipt_url = $1, status = $2 WHERE booking_id = $3', [receiptUrl, 'pending', booking.id]);
            } else {
                await client.query(`
                    INSERT INTO payments (id, booking_id, amount, method, receipt_url, status)
                    VALUES ($1, $2, $3, $4, $5, 'pending')
                `, [uuidv4(), booking.id, booking.total_amount, req.body.method || 'deposit', receiptUrl]);
            }
        });

        res.json({ success: true, message: 'Comprobante subido. Esperando confirmación de un administrador.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

module.exports = router;
