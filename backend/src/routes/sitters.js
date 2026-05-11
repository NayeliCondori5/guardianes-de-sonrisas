const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

// GET /api/sitters -> buscar
router.get('/', (req, res) => {
    const { city, min_price, max_price, min_exp, min_rating, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT u.id, u.full_name, u.city, u.avatar_url, s.experience_years, s.hourly_rate, s.rating, s.is_verified, s.description
        FROM users u
        JOIN sitters s ON u.id = s.user_id
        WHERE u.role = 'sitter' AND u.is_active = 1
    `;
    const params = [];

    if (city) { query += ` AND u.city LIKE ?`; params.push(`%${city}%`); }
    if (min_price) { query += ` AND s.hourly_rate >= ?`; params.push(min_price); }
    if (max_price) { query += ` AND s.hourly_rate <= ?`; params.push(max_price); }
    if (min_exp) { query += ` AND s.experience_years >= ?`; params.push(min_exp); }
    if (min_rating) { query += ` AND s.rating >= ?`; params.push(min_rating); }

    query += ` ORDER BY s.rating DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    try {
        const sitters = db.prepare(query).all(...params);
        res.json({ success: true, data: sitters });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// GET /api/sitters/featured
router.get('/featured', (req, res) => {
    try {
        const now = new Date().toISOString();
        const featured = db.prepare(`
            SELECT u.id, u.full_name, u.city, u.avatar_url, s.rating, s.hourly_rate
            FROM users u
            JOIN sitters s ON u.id = s.user_id
            WHERE u.role = 'sitter' AND u.is_active = 1 AND s.featured_until > ?
            ORDER BY s.rating DESC
        `).all(now);
        res.json({ success: true, data: featured });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// GET /api/sitters/:id
router.get('/:id', (req, res) => {
    try {
        const sitterInfo = db.prepare(`
            SELECT u.id, u.full_name, u.city, u.avatar_url, s.experience_years, s.hourly_rate, s.description, s.rating, s.total_reviews, s.is_verified
            FROM users u JOIN sitters s ON u.id = s.user_id
            WHERE u.id = ? AND u.role = 'sitter'
        `).get(req.params.id);

        if (!sitterInfo) return res.status(404).json({ success: false, message: 'Cuidador no encontrado' });

        const avail = db.prepare('SELECT day_of_week, start_time, end_time FROM availability WHERE sitter_id = ?').all(req.params.id);
        const certs = db.prepare('SELECT name, issuing_authority, is_verified FROM certifications WHERE sitter_id = ?').all(req.params.id);
        const reviews = db.prepare(`
            SELECT r.rating, r.comment, r.created_at, u.full_name as parent_name, u.avatar_url as parent_avatar
            FROM reviews r JOIN users u ON r.parent_id = u.id
            WHERE r.sitter_id = ? AND r.is_visible = 1 ORDER BY r.created_at DESC LIMIT 10
        `).all(req.params.id);

        res.json({ success: true, data: { ...sitterInfo, availability: avail, certifications: certs, reviews } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// PUT /api/sitters/profile
router.put('/profile', authenticateToken, (req, res) => {
    if (req.user.role !== 'sitter') return res.status(403).json({ success: false, message: 'Solo cuidadores' });
    const { description, hourly_rate, experience_years } = req.body;
    try {
        db.prepare(`UPDATE sitters SET description = ?, hourly_rate = ?, experience_years = ? WHERE user_id = ?`)
          .run(description, hourly_rate, experience_years, req.user.id);
        res.json({ success: true, message: 'Perfil cuidador actualizado' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

module.exports = router;
