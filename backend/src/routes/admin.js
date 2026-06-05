const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

router.get('/stats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const { rows: usersRows } = await db.query("SELECT COUNT(*) as c FROM users");
        const { rows: parentsRows } = await db.query("SELECT COUNT(*) as c FROM users WHERE role = 'parent'");
        const { rows: sittersRows } = await db.query("SELECT COUNT(*) as c FROM users WHERE role = 'sitter'");
        
        const { rows: bookingsRows } = await db.query("SELECT COUNT(*) as c FROM bookings");
        const { rows: revenueRows } = await db.query("SELECT SUM(platform_fee) as c FROM bookings WHERE status IN ('confirmed','completed')");
        const { rows: paymentsRows } = await db.query("SELECT COUNT(*) as c FROM payments WHERE status = 'pending'");
        
        res.json({
            success: true,
            data: {
                users: { 
                    total: parseInt(usersRows[0].c, 10),
                    parents: parseInt(parentsRows[0].c, 10),
                    sitters: parseInt(sittersRows[0].c, 10)
                },
                bookings: { total: parseInt(bookingsRows[0].c, 10) },
                revenue: { total_fees: parseFloat(revenueRows[0].c || 0) },
                payments: { pending: parseInt(paymentsRows[0].c, 10) }
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

router.get('/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const { rows: users } = await db.query("SELECT id, full_name, email, role, city, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 50");
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
        const { rows: existingRows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingRows.length > 0) {
            return res.status(400).json({ success: false, message: 'El email ya está en uso' });
        }

        const id = uuidv4();
        const salt = await bcrypt.genSalt(12);
        // Default password for admin-created users is '123456'
        const hash = await bcrypt.hash('123456', salt);
        const now = new Date().toISOString();

        await db.transaction(async (client) => {
            await client.query('INSERT INTO users (id, email, password, role, full_name, city, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
              [id, email, hash, role, full_name, city || null, now, now]);
            
            if (role === 'parent') {
                await client.query('INSERT INTO parents (user_id) VALUES ($1)', [id]);
            } else if (role === 'sitter') {
                await client.query('INSERT INTO sitters (user_id, age, hourly_rate, experience_years, description) VALUES ($1, $2, $3, $4, $5)',
                  [id, age ? Number(age) : null, rate ? Number(rate) : null, experience ? Number(experience) : null, description || null]);
            }
        });

        res.json({ success: true, message: 'Usuario creado exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// PUT /users/:id -> Admin updates a user
router.put('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    const { email, role, full_name, city, age, rate, description, experience } = req.body;

    try {
        const { rows: userRows } = await db.query('SELECT role FROM users WHERE id = $1', [req.params.id]);
        const user = userRows.length > 0 ? userRows[0] : null;
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        await db.transaction(async (client) => {
            // Update user table
            await client.query('UPDATE users SET email = $1, role = $2, full_name = $3, city = $4, updated_at = $5 WHERE id = $6',
              [email, role, full_name, city || null, new Date().toISOString(), req.params.id]);

            // Clean up or create records if role changed
            if (user.role !== role) {
                if (user.role === 'parent') await client.query('DELETE FROM parents WHERE user_id = $1', [req.params.id]);
                if (user.role === 'sitter') await client.query('DELETE FROM sitters WHERE user_id = $1', [req.params.id]);
            }

            if (role === 'parent') {
                await client.query('INSERT INTO parents (user_id) VALUES ($1) ON CONFLICT(user_id) DO NOTHING', [req.params.id]);
            } else if (role === 'sitter') {
                await client.query(`
                    INSERT INTO sitters (user_id, age, hourly_rate, experience_years, description)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT(user_id) DO UPDATE SET
                        age = excluded.age,
                        hourly_rate = excluded.hourly_rate,
                        experience_years = excluded.experience_years,
                        description = excluded.description
                `, [req.params.id, age ? Number(age) : null, rate ? Number(rate) : null, experience ? Number(experience) : null, description || null]);
            }
        });

        res.json({ success: true, message: 'Usuario actualizado exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// DELETE /users/:id -> Admin deletes a user
router.delete('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });

    try {
        const { rows: userRows } = await db.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
        if (userRows.length === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Usuario eliminado permanentemente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /bookings -> List all bookings for admin metrics
router.get('/bookings', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const { rows: bookings } = await db.query(`
            SELECT b.*, 
                   u1.full_name as "parentName", 
                   u2.full_name as "sitterName"
            FROM bookings b
            JOIN users u1 ON b.parent_id = u1.id
            JOIN users u2 ON b.sitter_id = u2.id
            ORDER BY b.created_at DESC
        `);
        res.json({ success: true, data: bookings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

router.put('/payments/:id/confirm', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const { rows: paymentRows } = await db.query('SELECT booking_id FROM payments WHERE id = $1', [req.params.id]);
        const payment = paymentRows.length > 0 ? paymentRows[0] : null;
        if (!payment) return res.status(404).json({ success: false, message: 'Pago no encontrado' });

        await db.transaction(async (client) => {
            await client.query('UPDATE payments SET status = $1, admin_confirmed_at = $2, admin_id = $3, notes = $4 WHERE id = $5',
              ['confirmed', new Date().toISOString(), req.user.id, req.body.notes || null, req.params.id]);
            await client.query('UPDATE bookings SET status = $1 WHERE id = $2', ['confirmed', payment.booking_id]);
        });

        res.json({ success: true, message: 'Pago confirmado exitosamente' });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// GET site config
router.get('/site-config', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const { rows } = await db.query('SELECT key, value FROM site_config');
        const config = {};
        rows.forEach(r => config[r.key] = r.value);
        res.json({ success: true, data: config });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// GET /admin/sitters -> List all sitters with verification status
router.get('/sitters', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const { rows: sitters } = await db.query(`
            SELECT u.id, u.full_name, u.email, u.city, u.avatar_url, u.created_at,
                   s.is_verified, s.hourly_rate, s.experience_years, s.rating, s.description
            FROM users u
            JOIN sitters s ON u.id = s.user_id
            WHERE u.role = 'sitter' AND u.is_active = 1
            ORDER BY s.is_verified ASC, u.created_at DESC
        `);
        res.json({ success: true, data: sitters });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// PUT /admin/sitters/:id/verify -> Verify or unverify a sitter
router.put('/sitters/:id/verify', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    const { is_verified } = req.body;
    try {
        const { rows: sitterRows } = await db.query('SELECT user_id FROM sitters WHERE user_id = $1', [req.params.id]);
        if (sitterRows.length === 0) return res.status(404).json({ success: false, message: 'Cuidador no encontrado' });

        await db.query(`
            UPDATE sitters SET is_verified = $1, verified_by = $2, verified_at = $3 WHERE user_id = $4
        `, [is_verified ? 1 : 0, req.user.id, new Date().toISOString(), req.params.id]);

        res.json({
            success: true,
            message: is_verified ? 'Cuidador verificado exitosamente' : 'Verificación removida'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

module.exports = router;
