const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.post('/', authenticateToken, (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ success: false, message: 'Solo los padres pueden crear contrataciones' });
    const { sitter_id, start_datetime, end_datetime, total_hours, message } = req.body;

    try {
        const sitter = db.prepare('SELECT hourly_rate, is_verified FROM sitters WHERE user_id = ?').get(sitter_id);
        if (!sitter) return res.status(404).json({ success: false, message: 'Cuidador no encontrado' });
        if (!sitter.is_verified) return res.status(400).json({ success: false, message: 'El cuidador no está verificado' });

        const feeConfig = db.prepare('SELECT value FROM site_config WHERE key = "platform_fee_percent"').get();
        const feePercent = feeConfig ? parseFloat(feeConfig.value) : 10;
        
        const subtotal = total_hours * sitter.hourly_rate;
        const platform_fee = subtotal * (feePercent / 100);
        const total_amount = subtotal + platform_fee;

        const id = uuidv4();
        db.prepare(`
            INSERT INTO bookings (id, parent_id, sitter_id, start_datetime, end_datetime, total_hours, hourly_rate, subtotal, platform_fee, total_amount, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, req.user.id, sitter_id, start_datetime, end_datetime, total_hours, sitter.hourly_rate, subtotal, platform_fee, total_amount, message, new Date().toISOString());

        res.json({ success: true, data: { id, total_amount }, message: 'Contratación solicitada con éxito' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

router.get('/my', authenticateToken, (req, res) => {
    try {
        let query;
        if (req.user.role === 'parent') {
            query = `SELECT b.*, u.full_name as sitter_name, u.avatar_url as sitter_avatar FROM bookings b JOIN users u ON b.sitter_id = u.id WHERE b.parent_id = ? ORDER BY b.created_at DESC`;
        } else if (req.user.role === 'sitter') {
            query = `SELECT b.*, u.full_name as parent_name, u.avatar_url as parent_avatar FROM bookings b JOIN users u ON b.parent_id = u.id WHERE b.sitter_id = ? ORDER BY b.created_at DESC`;
        } else {
            return res.status(403).json({ success: false });
        }
        const bookings = db.prepare(query).all(req.user.id);
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

router.put('/:id/accept', authenticateToken, (req, res) => {
    if (req.user.role !== 'sitter') return res.status(403).json({ success: false });
    try {
        const result = db.prepare(`UPDATE bookings SET status = 'awaiting_payment' WHERE id = ? AND sitter_id = ? AND status = 'pending'`).run(req.params.id, req.user.id);
        if (result.changes === 0) return res.status(400).json({ success: false, message: 'No se puede aceptar esta reserva' });
        res.json({ success: true, message: 'Reserva aceptada. Esperando pago del padre.' });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.put('/:id/reject', authenticateToken, (req, res) => {
    if (req.user.role !== 'sitter') return res.status(403).json({ success: false });
    try {
        db.prepare(`UPDATE bookings SET status = 'rejected', cancelled_reason = ?, cancelled_by = ? WHERE id = ? AND sitter_id = ? AND status = 'pending'`)
          .run(req.body.reason, req.user.id, req.params.id, req.user.id);
        res.json({ success: true, message: 'Reserva rechazada' });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.put('/:id/complete', authenticateToken, (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ success: false });
    try {
        const result = db.prepare(`UPDATE bookings SET status = 'completed' WHERE id = ? AND parent_id = ? AND status = 'confirmed'`).run(req.params.id, req.user.id);
        if (result.changes === 0) return res.status(400).json({ success: false, message: 'No se puede completar esta reserva' });
        res.json({ success: true, message: 'Reserva marcada como completada' });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
