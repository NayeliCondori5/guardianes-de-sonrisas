const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/users/profile -> mi perfil
router.get('/profile', authenticateToken, (req, res) => {
    try {
        const user = db.prepare('SELECT id, email, role, full_name, phone, avatar_url, city, is_active FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        let extraData = {};
        if (user.role === 'parent') {
            extraData = db.prepare('SELECT children_ages, preferred_rate_min, preferred_rate_max FROM parents WHERE user_id = ?').get(user.id);
        } else if (user.role === 'sitter') {
            extraData = db.prepare('SELECT experience_years, hourly_rate, description, rating, total_reviews, is_verified, background_check_status, featured_until FROM sitters WHERE user_id = ?').get(user.id);
        }

        res.json({ success: true, data: { ...user, ...extraData } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// PUT /api/users/profile
router.put('/profile', authenticateToken, (req, res) => {
    const { full_name, phone, city, avatar_url } = req.body;
    try {
        db.prepare(`
            UPDATE users SET full_name = ?, phone = ?, city = ?, avatar_url = ?, updated_at = ?
            WHERE id = ?
        `).run(full_name || null, phone || null, city || null, avatar_url || null, new Date().toISOString(), req.user.id);
        
        res.json({ success: true, message: 'Perfil actualizado correctamente' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error actualizando perfil' });
    }
});

// PUT /api/users/change-password
router.put('/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });

        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(newPassword, salt);

        db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run(hash, new Date().toISOString(), req.user.id);
        res.json({ success: true, message: 'Contraseña cambiada' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// DELETE /api/users/account
router.delete('/account', authenticateToken, (req, res) => {
    try {
        db.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), req.user.id);
        res.json({ success: true, message: 'Cuenta desactivada' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

module.exports = router;
