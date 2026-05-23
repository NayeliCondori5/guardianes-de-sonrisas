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
        SELECT u.id, u.full_name, u.city, u.avatar_url, s.experience_years, s.hourly_rate, s.rating, s.is_verified, s.description, s.age, s.superpowers, s.comfortable_with, s.availability
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
        
        // Parse JSON fields for each sitter
        const mappedSitters = sitters.map(s => {
            const parsed = {
                ...s,
                rate: s.hourly_rate,
                experience: s.experience_years,
                name: s.full_name,
                avatar: s.avatar_url,
                verified: s.is_verified === 1
            };
            
            try {
                parsed.superpowers = s.superpowers ? JSON.parse(s.superpowers) : [];
            } catch(e) {
                parsed.superpowers = [];
            }
            try {
                parsed.comfortableWith = s.comfortable_with ? JSON.parse(s.comfortable_with) : [];
                parsed.comfortable_with = parsed.comfortableWith;
            } catch(e) {
                parsed.comfortableWith = [];
            }
            try {
                parsed.availability = s.availability ? JSON.parse(s.availability) : null;
            } catch(e) {
                parsed.availability = null;
            }
            
            return parsed;
        });

        res.json({ success: true, data: mappedSitters });
    } catch (err) {
        console.error(err);
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
            SELECT u.id, u.full_name, u.city, u.avatar_url, s.experience_years, s.hourly_rate, s.description, s.rating, s.total_reviews, s.is_verified, s.age, s.education, s.driver_license, s.has_car, s.smoker, s.preferred_location, s.superpowers, s.comfortable_with, s.availability
            FROM users u JOIN sitters s ON u.id = s.user_id
            WHERE u.id = ? AND u.role = 'sitter'
        `).get(req.params.id);

        if (!sitterInfo) return res.status(404).json({ success: false, message: 'Cuidador no encontrado' });

        // Add aliases and parse fields
        sitterInfo.rate = sitterInfo.hourly_rate;
        sitterInfo.experience = sitterInfo.experience_years;
        sitterInfo.driverLicense = sitterInfo.driver_license === 1;
        sitterInfo.hasCar = sitterInfo.has_car === 1;
        sitterInfo.smoker = sitterInfo.smoker === 1;
        sitterInfo.name = sitterInfo.full_name;
        sitterInfo.avatar = sitterInfo.avatar_url;
        sitterInfo.verified = sitterInfo.is_verified === 1;
        
        try {
            sitterInfo.superpowers = sitterInfo.superpowers ? JSON.parse(sitterInfo.superpowers) : [];
        } catch(e) {
            sitterInfo.superpowers = [];
        }
        try {
            sitterInfo.comfortableWith = sitterInfo.comfortable_with ? JSON.parse(sitterInfo.comfortable_with) : [];
            sitterInfo.comfortable_with = sitterInfo.comfortableWith;
        } catch(e) {
            sitterInfo.comfortableWith = [];
        }
        try {
            sitterInfo.availability = sitterInfo.availability ? JSON.parse(sitterInfo.availability) : null;
        } catch(e) {
            sitterInfo.availability = null;
        }

        const certs = db.prepare('SELECT name, issuing_authority, is_verified FROM certifications WHERE sitter_id = ?').all(req.params.id);
        const reviews = db.prepare(`
            SELECT r.rating, r.comment, r.created_at, u.full_name as parent_name, u.avatar_url as parent_avatar
            FROM reviews r JOIN users u ON r.parent_id = u.id
            WHERE r.sitter_id = ? AND r.is_visible = 1 ORDER BY r.created_at DESC LIMIT 10
        `).all(req.params.id);

        res.json({ success: true, data: { ...sitterInfo, certifications: certs, reviews } });
    } catch (err) {
        console.error(err);
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
