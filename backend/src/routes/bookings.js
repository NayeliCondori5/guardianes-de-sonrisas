const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.post('/', authenticateToken, async (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ success: false, message: 'Solo los padres pueden crear contrataciones' });
    const { sitter_id, start_datetime, end_datetime, total_hours: providedHours, message } = req.body;
    // Validate required fields
    if (!sitter_id || !start_datetime || !end_datetime) {
        return res.status(400).json({ success: false, message: 'Se requieren sitter_id, start_datetime y end_datetime' });
    }
    // Compute total hours if not provided
    const start = new Date(start_datetime);
    const end = new Date(end_datetime);
    if (isNaN(start) || isNaN(end) || end <= start) {
        return res.status(400).json({ success: false, message: 'Fechas inválidas' });
    }
    const total_hours = providedHours ?? Math.round((end - start) / (1000 * 60 * 60));
    // Ensure total_hours is a positive number
    if (total_hours <= 0) {
        return res.status(400).json({ success: false, message: 'Horas totales inválidas' });
    }

    try {
        const { rows: sitterRows } = await db.query('SELECT hourly_rate, is_verified FROM sitters WHERE user_id = $1', [sitter_id]);
        const sitter = sitterRows.length > 0 ? sitterRows[0] : null;
        if (!sitter) return res.status(404).json({ success: false, message: 'Cuidador no encontrado' });
        if (!sitter.is_verified) return res.status(400).json({ success: false, message: 'El cuidador no está verificado' });

        const { rows: configRows } = await db.query("SELECT value FROM site_config WHERE key = 'platform_fee_percent'");
        const feeConfig = configRows.length > 0 ? configRows[0] : null;
        const feePercent = feeConfig ? parseFloat(feeConfig.value) : 10;
        
        const subtotal = total_hours * sitter.hourly_rate;
        const platform_fee = subtotal * (feePercent / 100);
        const total_amount = subtotal + platform_fee;

        const id = uuidv4();
                        await db.query(`
                    INSERT INTO bookings (id, parent_id, sitter_id, start_datetime, end_datetime, total_hours, hourly_rate, subtotal, platform_fee, total_amount, message, num_children, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [id, req.user.id, sitter_id, start_datetime, end_datetime, total_hours, sitter.hourly_rate, subtotal, platform_fee, total_amount, message, req.body.num_children || 1, new Date().toISOString()]);

        res.json({ success: true, data: { id, total_amount }, message: 'Contratación solicitada con éxito' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});


// GET /api/bookings/parent/:parentId/pending - Retrieves pending booking requests for a specific parent
router.get('/parent/:parentId/pending', authenticateToken, async (req, res) => {
    try {
        // Only allow sitters to view pending requests of parents they are interested in
        if (req.user.role !== 'sitter') return res.status(403).json({ success: false, message: 'Solo los cuidadores pueden ver solicitudes pendientes' });
        const { parentId } = req.params;
        const query = `
            SELECT id, start_datetime, end_datetime, total_hours, num_children, message, total_amount, hourly_rate
            FROM bookings
            WHERE parent_id = $1 AND status = 'pending'
            ORDER BY created_at DESC
        `;
        const { rows: bookings } = await db.query(query, [parentId]);
        res.json({ success: true, data: bookings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

router.put('/:id/accept', authenticateToken, async (req, res) => {
    if (req.user.role !== 'sitter') return res.status(403).json({ success: false });
    try {
        const result = await db.query(`UPDATE bookings SET status = 'awaiting_payment' WHERE id = $1 AND sitter_id = $2 AND status = 'pending'`, [req.params.id, req.user.id]);
        if (result.rowCount === 0) return res.status(400).json({ success: false, message: 'No se puede aceptar esta reserva' });
        res.json({ success: true, message: 'Reserva aceptada. Esperando pago del padre.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

router.put('/:id/reject', authenticateToken, async (req, res) => {
    if (req.user.role !== 'sitter') return res.status(403).json({ success: false });
    try {
        await db.query(`UPDATE bookings SET status = 'rejected', cancelled_reason = $1, cancelled_by = $2 WHERE id = $3 AND sitter_id = $4 AND status = 'pending'`,
          [req.body.reason, req.user.id, req.params.id, req.user.id]);
        res.json({ success: true, message: 'Reserva rechazada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

router.put('/:id/complete', authenticateToken, async (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ success: false });
    try {
        const result = await db.query(`UPDATE bookings SET status = 'completed' WHERE id = $1 AND parent_id = $2 AND status = 'confirmed'`, [req.params.id, req.user.id]);
        if (result.rowCount === 0) return res.status(400).json({ success: false, message: 'No se puede completar esta reserva' });
        res.json({ success: true, message: 'Reserva marcada como completada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

router.put('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT parent_id, sitter_id FROM bookings WHERE id = $1', [req.params.id]);
        const booking = rows.length > 0 ? rows[0] : null;
        if (!booking) return res.status(404).json({ success: false, message: 'Reserva no encontrada' });
        
        // Either parent or sitter can cancel
        if (booking.parent_id !== req.user.id && booking.sitter_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }
        
        await db.query("UPDATE bookings SET status = 'cancelled', cancelled_by = $1 WHERE id = $2", [req.user.id, req.params.id]);
        res.json({ success: true, message: 'Reserva cancelada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

router.put('/:id/confirm', authenticateToken, async (req, res) => {
    if (req.user.role !== 'sitter') return res.status(403).json({ success: false });
    try {
        await db.transaction(async (client) => {
            const result = await client.query("UPDATE bookings SET status = 'confirmed' WHERE id = $1 AND sitter_id = $2", [req.params.id, req.user.id]);
            if (result.rowCount === 0) throw new Error('No se pudo confirmar esta reserva');
            
            // Also confirm the payment record if exists
            await client.query("UPDATE payments SET status = 'confirmed', admin_confirmed_at = $1 WHERE booking_id = $2", [new Date().toISOString(), req.params.id]);
        });
        
        res.json({ success: true, message: 'Pago confirmado por el cuidador' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message || 'Error interno' });
    }
});

module.exports = router;
