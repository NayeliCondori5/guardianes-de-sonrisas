const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, async (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ success: false });
    const { booking_id, rating, comment } = req.body;

    try {
        const { rows: bookingRows } = await db.query('SELECT * FROM bookings WHERE id = $1 AND parent_id = $2', [booking_id, req.user.id]);
        const booking = bookingRows.length > 0 ? bookingRows[0] : null;
        if (!booking || booking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Solo puedes reseñar reservas completadas' });
        }

        const { rows: existingRows } = await db.query('SELECT id FROM reviews WHERE booking_id = $1', [booking_id]);
        if (existingRows.length > 0) return res.status(400).json({ success: false, message: 'Ya reseñaste esta reserva' });

        const id = require('uuid').v4();
        await db.transaction(async (client) => {
            await client.query(`
                INSERT INTO reviews (id, booking_id, parent_id, sitter_id, rating, comment, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [id, booking_id, req.user.id, booking.sitter_id, rating, comment, new Date().toISOString()]);

            // Update sitter avg
            const { rows: statsRows } = await client.query('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE sitter_id = $1 AND is_visible = 1', [booking.sitter_id]);
            const stats = statsRows[0] || {};
            await client.query('UPDATE sitters SET rating = $1, total_reviews = $2 WHERE user_id = $3', [
                stats.avg ? parseFloat(stats.avg) : 0, 
                stats.count ? parseInt(stats.count, 10) : 0, 
                booking.sitter_id
            ]);
        });

        res.json({ success: true, message: 'Reseña enviada con éxito' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

router.get('/sitter/:sitterId', async (req, res) => {
    try {
        const { rows: reviews } = await db.query(`
            SELECT r.*, u.full_name as parent_name, u.avatar_url as parent_avatar 
            FROM reviews r JOIN users u ON r.parent_id = u.id 
            WHERE r.sitter_id = $1 AND r.is_visible = 1 ORDER BY r.created_at DESC LIMIT 20
        `, [req.params.sitterId]);
        res.json({ success: true, data: reviews });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

module.exports = router;
