const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.get('/stats', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const usersTotal = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
        const bookingsTotal = db.prepare("SELECT COUNT(*) as c FROM bookings").get().c;
        const revenueTotal = db.prepare("SELECT SUM(platform_fee) as c FROM bookings WHERE status IN ('confirmed','completed')").get().c || 0;
        
        res.json({
            success: true,
            data: {
                users: { total: usersTotal },
                bookings: { total: bookingsTotal },
                revenue: { total_fees: revenueTotal }
                // Here we would implement the full stats queries
            }
        });
    } catch (err) {
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

router.put('/payments/:id/confirm', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false });
    try {
        const payment = db.prepare('SELECT booking_id FROM payments WHERE id = ?').get(req.params.id);
        if (!payment) return res.status(404).json({ success: false });

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
