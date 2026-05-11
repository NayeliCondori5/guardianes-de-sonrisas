const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ success: false });
    const { booking_id, rating, comment } = req.body;

    try {
        const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND parent_id = ?').get(booking_id, req.user.id);
        if (!booking || booking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Solo puedes reseñar reservas completadas' });
        }

        const existingReview = db.prepare('SELECT id FROM reviews WHERE booking_id = ?').get(booking_id);
        if (existingReview) return res.status(400).json({ success: false, message: 'Ya reseñaste esta reserva' });

        const id = require('uuid').v4();
        db.transaction(() => {
            db.prepare(`
                INSERT INTO reviews (id, booking_id, parent_id, sitter_id, rating, comment, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(id, booking_id, req.user.id, booking.sitter_id, rating, comment, new Date().toISOString());

            // Update sitter avg
            const stats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE sitter_id = ? AND is_visible = 1').get(booking.sitter_id);
            db.prepare('UPDATE sitters SET rating = ?, total_reviews = ? WHERE user_id = ?').run(stats.avg || 0, stats.count || 0, booking.sitter_id);
        })();

        res.json({ success: true, message: 'Reseña enviada con éxito' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

router.get('/sitter/:sitterId', (req, res) => {
    try {
        const reviews = db.prepare(`
            SELECT r.*, u.full_name as parent_name, u.avatar_url as parent_avatar 
            FROM reviews r JOIN users u ON r.parent_id = u.id 
            WHERE r.sitter_id = ? AND r.is_visible = 1 ORDER BY r.created_at DESC LIMIT 20
        `).all(req.params.sitterId);
        res.json({ success: true, data: reviews });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

module.exports = router;
