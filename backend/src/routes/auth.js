const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

const generateTokens = (user) => {
    const access_token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const refresh_token = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });
    
    // Calcular expires_at para BD (7 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    db.prepare('INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), user.id, refresh_token, expiresAt.toISOString(), new Date().toISOString());

    return { access_token, refresh_token };
};

router.post('/register', async (req, res) => {
    const { email, password, role, full_name, city } = req.body;

    if (!email || !password || !role || !full_name) {
        return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
    }

    if (email.includes('@admin.com')) {
        return res.status(400).json({ success: false, message: 'No puedes registrarte con este email' });
    }

    if (role !== 'parent' && role !== 'sitter') {
        return res.status(400).json({ success: false, message: 'Rol inválido' });
    }

    try {
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ success: false, message: 'El email ya está en uso' });
        }

        const id = uuidv4();
        const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_ROUNDS) || 12);
        const hash = await bcrypt.hash(password, salt);
        const now = new Date().toISOString();

        db.transaction(() => {
            db.prepare('INSERT INTO users (id, email, password, role, full_name, city, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
              .run(id, email, hash, role, full_name, city || null, now, now);
            
            if (role === 'parent') {
                db.prepare('INSERT INTO parents (user_id) VALUES (?)').run(id);
            } else {
                db.prepare('INSERT INTO sitters (user_id) VALUES (?)').run(id);
            }
        })();

        const user = { id, email, role, full_name };
        const tokens = generateTokens(user);

        res.json({ success: true, data: { ...tokens, user } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
    }

    try {
        let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        const now = new Date().toISOString();

        if (email.includes('@admin.com')) {
            if (!user) {
                // Crear admin automático
                const id = uuidv4();
                const salt = await bcrypt.genSalt(12);
                const hash = await bcrypt.hash(password, salt);
                
                db.prepare('INSERT INTO users (id, email, password, role, full_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
                  .run(id, email, hash, 'admin', 'Administrador', now, now);
                user = { id, email, role: 'admin', full_name: 'Administrador' };
            } else {
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
                
                if (user.role !== 'admin') {
                    db.prepare('UPDATE users SET role = "admin" WHERE id = ?').run(user.id);
                    user.role = 'admin';
                }
            }
        } else {
            if (!user || user.role === 'admin') {
                return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
            }
            if (user.is_active === 0) {
                return res.status(403).json({ success: false, message: 'Cuenta desactivada' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }

        const tokens = generateTokens(user);
        res.json({ 
            success: true, 
            data: { 
                ...tokens, 
                user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, avatar_url: user.avatar_url } 
            } 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

module.exports = router;
