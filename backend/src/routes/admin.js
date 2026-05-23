const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

router.get('/stats', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const usersTotal = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
        const parentsTotal = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'parent'").get().c;
        const sittersTotal = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'sitter'").get().c;
        
        const bookingsTotal = db.prepare("SELECT COUNT(*) as c FROM bookings").get().c;
        const revenueTotal = db.prepare("SELECT SUM(platform_fee) as c FROM bookings WHERE status IN ('confirmed','completed')").get().c || 0;
        const pendingPaymentsTotal = db.prepare("SELECT COUNT(*) as c FROM payments WHERE status = 'pending'").get().c;
        
        res.json({
            success: true,
            data: {
                users: { 
                    total: usersTotal,
                    parents: parentsTotal,
                    sitters: sittersTotal
                },
                bookings: { total: bookingsTotal },
                revenue: { total_fees: revenueTotal },
                payments: { pending: pendingPaymentsTotal }
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

router.get('/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const users = db.prepare("SELECT id, full_name, email, role, city, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 50").all();
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// POST /users -> Admin creates a user
router.post('/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    const { email, role, full_name, city, age, rate, description, experience } = req.body;

    if (!email || !role || !full_name) {
        return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
    }

    try {
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ success: false, message: 'El email ya está en uso' });
        }

        const id = uuidv4();
        const salt = await bcrypt.genSalt(12);
        // Default password for admin-created users is '123456'
        const hash = await bcrypt.hash('123456', salt);
        const now = new Date().toISOString();

        db.transaction(() => {
            db.prepare('INSERT INTO users (id, email, password, role, full_name, city, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
              .run(id, email, hash, role, full_name, city || null, now, now);
            
            if (role === 'parent') {
                db.prepare('INSERT INTO parents (user_id) VALUES (?)').run(id);
            } else if (role === 'sitter') {
                db.prepare('INSERT INTO sitters (user_id, age, hourly_rate, experience_years, description) VALUES (?, ?, ?, ?, ?)')
                  .run(id, age ? Number(age) : null, rate ? Number(rate) : null, experience ? Number(experience) : null, description || null);
            }
        })();

        res.json({ success: true, message: 'Usuario creado exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// PUT /users/:id -> Admin updates a user
router.put('/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    const { email, role, full_name, city, age, rate, description, experience } = req.body;

    try {
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        db.transaction(() => {
            // Update user table
            db.prepare('UPDATE users SET email = ?, role = ?, full_name = ?, city = ?, updated_at = ? WHERE id = ?')
              .run(email, role, full_name, city || null, new Date().toISOString(), req.params.id);

            // Clean up or create records if role changed
            if (user.role !== role) {
                if (user.role === 'parent') db.prepare('DELETE FROM parents WHERE user_id = ?').run(req.params.id);
                if (user.role === 'sitter') db.prepare('DELETE FROM sitters WHERE user_id = ?').run(req.params.id);
            }

            if (role === 'parent') {
                db.prepare('INSERT INTO parents (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING').run(req.params.id);
            } else if (role === 'sitter') {
                db.prepare(`
                    INSERT INTO sitters (user_id, age, hourly_rate, experience_years, description)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(user_id) DO UPDATE SET
                        age = excluded.age,
                        hourly_rate = excluded.hourly_rate,
                        experience_years = excluded.experience_years,
                        description = excluded.description
                `).run(req.params.id, age ? Number(age) : null, rate ? Number(rate) : null, experience ? Number(experience) : null, description || null);
            }
        })();

        res.json({ success: true, message: 'Usuario actualizado exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// DELETE /users/:id -> Admin deletes a user
router.delete('/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });

    try {
        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
        res.json({ success: true, message: 'Usuario eliminado permanentemente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /bookings -> List all bookings for admin metrics
router.get('/bookings', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const bookings = db.prepare(`
            SELECT b.*, 
                   u1.full_name as parentName, 
                   u2.full_name as sitterName
            FROM bookings b
            JOIN users u1 ON b.parent_id = u1.id
            JOIN users u2 ON b.sitter_id = u2.id
            ORDER BY b.created_at DESC
        `).all();
        res.json({ success: true, data: bookings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

router.put('/payments/:id/confirm', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const payment = db.prepare('SELECT booking_id FROM payments WHERE id = ?').get(req.params.id);
        if (!payment) return res.status(404).json({ success: false, message: 'Pago no encontrado' });

        db.transaction(() => {
            db.prepare('UPDATE payments SET status = "confirmed", admin_confirmed_at = ?, admin_id = ?, notes = ? WHERE id = ?')
              .run(new Date().toISOString(), req.user.id, req.body.notes || null, req.params.id);
            db.prepare('UPDATE bookings SET status = "confirmed" WHERE id = ?').run(payment.booking_id);
        })();

        res.json({ success: true, message: 'Pago confirmado exitosamente' });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// GET site config
router.get('/site-config', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const rows = db.prepare('SELECT key, value FROM site_config').all();
        const config = {};
        rows.forEach(r => config[r.key] = r.value);
        res.json({ success: true, data: config });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
