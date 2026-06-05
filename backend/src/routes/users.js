const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/users/profile -> mi perfil
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const { rows: userRows } = await db.query('SELECT id, email, role, full_name, phone, avatar_url, city, is_active FROM users WHERE id = $1', [req.user.id]);
        const user = userRows.length > 0 ? userRows[0] : null;
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        let extraData = {};
        if (user.role === 'parent') {
            const { rows: parentRows } = await db.query('SELECT children_ages, preferred_rate_min, preferred_rate_max, kids_count, family_desc, needs, budget, payment_pref FROM parents WHERE user_id = $1', [user.id]);
            const parent = parentRows.length > 0 ? parentRows[0] : null;
            if (parent) {
                extraData = {
                    ...parent,
                    kids_ages: parent.children_ages // alias for frontend
                };
            }
        } else if (user.role === 'sitter') {
            const { rows: sitterRows } = await db.query('SELECT experience_years, hourly_rate, description, rating, total_reviews, is_verified, background_check_status, featured_until, age, education, driver_license, has_car, smoker, preferred_location, superpowers, comfortable_with, availability FROM sitters WHERE user_id = $1', [user.id]);
            const sitter = sitterRows.length > 0 ? sitterRows[0] : null;
            if (sitter) {
                extraData = {
                    ...sitter,
                    rate: sitter.hourly_rate, // alias for frontend
                    experience: sitter.experience_years, // alias for frontend
                    driverLicense: sitter.driver_license === 1,
                    hasCar: sitter.has_car === 1,
                    smoker: sitter.smoker === 1,
                    preferredLocation: sitter.preferred_location
                };
                
                // Parse serialized JSON fields
                try {
                    extraData.superpowers = sitter.superpowers ? JSON.parse(sitter.superpowers) : [];
                } catch (e) {
                    extraData.superpowers = [];
                }
                
                try {
                    extraData.comfortableWith = sitter.comfortable_with ? JSON.parse(sitter.comfortable_with) : [];
                    extraData.comfortable_with = extraData.comfortableWith;
                } catch (e) {
                    extraData.comfortableWith = [];
                }
                
                try {
                    extraData.availability = sitter.availability ? JSON.parse(sitter.availability) : null;
                } catch (e) {
                    extraData.availability = null;
                }
            }
        }

        res.json({ success: true, data: { ...user, ...extraData } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// GET /api/users/parent/:id -> perfil público de un padre (usado por niñeras para ver info)
router.get('/parent/:id', authenticateToken, async (req, res) => {
    try {
        const { rows: userRows } = await db.query('SELECT id, full_name, city, avatar_url FROM users WHERE id = $1 AND role = $2', [req.params.id, 'parent']);
        const user = userRows.length > 0 ? userRows[0] : null;
        if (!user) return res.status(404).json({ success: false, message: 'Padre no encontrado' });

        const { rows: parentRows } = await db.query('SELECT children_ages as kids_ages, kids_count, family_desc, needs, budget, payment_pref FROM parents WHERE user_id = $1', [user.id]);
        const parentInfo = parentRows.length > 0 ? parentRows[0] : {};

        res.json({ success: true, data: { ...user, avatar: user.avatar_url, ...parentInfo } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});


// POST /api/users/avatar -> upload avatar image to Cloudinary
const upload = require('../middleware/upload');
router.post('/avatar', authenticateToken, (req, res, next) => {
    upload.single('avatar')(req, res, async (err) => {
        if (err) {
            console.error("Upload error caught in middleware wrapper:", err);
            return res.status(400).json({ 
                success: false, 
                message: `Error al subir archivo: ${err.message || err.toString()}` 
            });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se subió ninguna imagen' });
        }
        
        try {
            let avatarUrl = req.file.path; // Cloudinary URL or local path
            if (avatarUrl && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
                const host = req.get('host');
                const protocol = req.protocol;
                avatarUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
            }
            await db.query('UPDATE users SET avatar_url = $1, updated_at = $2 WHERE id = $3', [avatarUrl, new Date().toISOString(), req.user.id]);
            res.json({ success: true, avatar_url: avatarUrl, message: 'Foto de perfil actualizada exitosamente' });
        } catch (dbErr) {
            console.error("Database error in avatar upload:", dbErr);
            res.status(500).json({ success: false, message: `Error al guardar en base de datos: ${dbErr.message}` });
        }
    });
});

// PUT /api/users/profile
router.put('/profile', authenticateToken, async (req, res) => {
    const { 
        full_name, phone, city, avatar_url,
        // parent fields
        kids_count, kids_ages, children_ages, family_desc, needs, budget, payment_pref,
        // sitter fields
        age, rate, hourly_rate, experience, experience_years, description, education, 
        driverLicense, driver_license, hasCar, has_car, smoker, preferredLocation, preferred_location,
        superpowers, comfortableWith, comfortable_with, availability
    } = req.body;
    
    try {
        await db.transaction(async (client) => {
            // 1. Update basic user fields
            await client.query(`
                UPDATE users SET full_name = $1, phone = $2, city = $3, avatar_url = $4, updated_at = $5
                WHERE id = $6
            `, [full_name || null, phone || null, city || null, avatar_url || null, new Date().toISOString(), req.user.id]);
            
            // 2. Update role-specific table
            if (req.user.role === 'parent') {
                const finalKidsAges = kids_ages || children_ages || null;
                await client.query(`
                    INSERT INTO parents (user_id, kids_count, children_ages, family_desc, needs, budget, payment_pref)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT(user_id) DO UPDATE SET
                        kids_count = excluded.kids_count,
                        children_ages = excluded.children_ages,
                        family_desc = excluded.family_desc,
                        needs = excluded.needs,
                        budget = excluded.budget,
                        payment_pref = excluded.payment_pref
                `, [
                    req.user.id,
                    kids_count !== undefined ? Number(kids_count) : null,
                    finalKidsAges,
                    family_desc || null,
                    needs || null,
                    budget !== undefined ? Number(budget) : null,
                    payment_pref || null
                ]);
            } else if (req.user.role === 'sitter') {
                const finalRate = rate !== undefined ? Number(rate) : (hourly_rate !== undefined ? Number(hourly_rate) : null);
                const finalExp = experience !== undefined ? Number(experience) : (experience_years !== undefined ? Number(experience_years) : null);
                
                const dbDriverLicense = driverLicense !== undefined ? (driverLicense ? 1 : 0) : (driver_license ? 1 : 0);
                const dbHasCar = hasCar !== undefined ? (hasCar ? 1 : 0) : (has_car ? 1 : 0);
                // Note: fix logic for 'this.smoker' to fallback nicely if undefined
                const dbSmoker = smoker !== undefined ? (smoker ? 1 : 0) : 0;
                
                const dbSuperpowers = superpowers ? JSON.stringify(superpowers) : null;
                const dbComfortableWith = comfortableWith ? JSON.stringify(comfortableWith) : (comfortable_with ? JSON.stringify(comfortable_with) : null);
                const dbAvailability = availability ? JSON.stringify(availability) : null;
                
                await client.query(`
                    INSERT INTO sitters (user_id, age, hourly_rate, experience_years, description, education, driver_license, has_car, smoker, preferred_location, superpowers, comfortable_with, availability)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT(user_id) DO UPDATE SET
                        age = excluded.age,
                        hourly_rate = excluded.hourly_rate,
                        experience_years = excluded.experience_years,
                        description = excluded.description,
                        education = excluded.education,
                        driver_license = excluded.driver_license,
                        has_car = excluded.has_car,
                        smoker = excluded.smoker,
                        preferred_location = excluded.preferred_location,
                        superpowers = excluded.superpowers,
                        comfortable_with = excluded.comfortable_with,
                        availability = excluded.availability
                `, [
                    req.user.id,
                    age !== undefined ? Number(age) : null,
                    finalRate,
                    finalExp,
                    description || null,
                    education || null,
                    dbDriverLicense,
                    dbHasCar,
                    dbSmoker,
                    preferredLocation || preferred_location || null,
                    dbSuperpowers,
                    dbComfortableWith,
                    dbAvailability
                ]);
            }
        });
        
        res.json({ success: true, message: 'Perfil actualizado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error actualizando perfil' });
    }
});

// PUT /api/users/change-password
router.put('/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const { rows } = await db.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        const user = rows.length > 0 ? rows[0] : null;
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });

        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password = $1, updated_at = $2 WHERE id = $3', [hash, new Date().toISOString(), req.user.id]);
        res.json({ success: true, message: 'Contraseña cambiada' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// DELETE /api/users/account
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        await db.query('UPDATE users SET is_active = 0, updated_at = $1 WHERE id = $2', [new Date().toISOString(), req.user.id]);
        res.json({ success: true, message: 'Cuenta desactivada' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

module.exports = router;
