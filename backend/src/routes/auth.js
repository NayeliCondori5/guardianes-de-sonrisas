const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

const generateTokens = async (user) => {
    const access_token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const refresh_token = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });
    
    // Calcular expires_at para BD (7 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
        'INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), user.id, refresh_token, expiresAt.toISOString(), new Date().toISOString()]
    );

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
        const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (rows.length > 0) {
            return res.status(400).json({ success: false, message: 'El email ya está en uso' });
        }

        const id = uuidv4();
        const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_ROUNDS) || 12);
        const hash = await bcrypt.hash(password, salt);
        const now = new Date().toISOString();

        await db.transaction(async (client) => {
            await client.query(
                'INSERT INTO users (id, email, password, role, full_name, city, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [id, email, hash, role, full_name, city || null, now, now]
            );
            
            if (role === 'parent') {
                await client.query('INSERT INTO parents (user_id) VALUES ($1)', [id]);
            } else {
                await client.query('INSERT INTO sitters (user_id) VALUES ($1)', [id]);
            }
        });

        const user = { id, email, role, full_name };
        const tokens = await generateTokens(user);

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
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        let user = rows.length > 0 ? rows[0] : null;
        const now = new Date().toISOString();

        if (email.includes('@admin.com')) {
            if (!user) {
                // Crear admin automático
                const id = uuidv4();
                const salt = await bcrypt.genSalt(12);
                const hash = await bcrypt.hash(password, salt);
                
                await db.query(
                    'INSERT INTO users (id, email, password, role, full_name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [id, email, hash, 'admin', 'Administrador', now, now]
                );
                user = { id, email, role: 'admin', full_name: 'Administrador' };
            } else {
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
                
                if (user.role !== 'admin') {
                    await db.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', user.id]);
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

        if (user.two_factor_enabled === 1 || user.two_factor_enabled === true) {
            return res.json({
                success: true,
                requires2FA: true,
                userId: user.id
            });
        }

        const tokens = await generateTokens(user);
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

router.post('/2fa/verify', async (req, res) => {
    const { userId, code } = req.body;
    if (!userId || !code) {
        return res.status(400).json({ success: false, message: 'ID de usuario y código requeridos.' });
    }

    try {
        const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = rows.length > 0 ? rows[0] : null;
        if (!user || user.is_active === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado o inactivo.' });
        }

        if (!user.two_factor_enabled || !user.totp_secret_encrypted) {
            return res.status(400).json({ success: false, message: '2FA no está configurado para este usuario.' });
        }

        const { decrypt } = require('../utils/encryption');
        const decryptedSecret = decrypt(user.totp_secret_encrypted);
        if (!decryptedSecret) {
            return res.status(500).json({ success: false, message: 'Error interno de descifrado.' });
        }

        const speakeasy = require('speakeasy');
        const verified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ success: false, message: 'Código de verificación incorrecto.' });
        }

        const tokens = await generateTokens(user);
        res.json({
            success: true,
            data: {
                ...tokens,
                user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, avatar_url: user.avatar_url }
            }
        });
    } catch (err) {
        console.error('Error al verificar código 2FA:', err);
        res.status(500).json({ success: false, message: 'Error interno en el servidor.' });
    }
});

module.exports = router;
