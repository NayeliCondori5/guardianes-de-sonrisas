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
            const parent = db.prepare('SELECT children_ages, preferred_rate_min, preferred_rate_max, kids_count, family_desc, needs, budget, payment_pref FROM parents WHERE user_id = ?').get(user.id);
            if (parent) {
                extraData = {
                    ...parent,
                    kids_ages: parent.children_ages // alias for frontend
                };
            }
        } else if (user.role === 'sitter') {
            const sitter = db.prepare('SELECT experience_years, hourly_rate, description, rating, total_reviews, is_verified, background_check_status, featured_until, age, education, driver_license, has_car, smoker, preferred_location, superpowers, comfortable_with, availability FROM sitters WHERE user_id = ?').get(user.id);
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

// PUT /api/users/profile
router.put('/profile', authenticateToken, (req, res) => {
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
        db.transaction(() => {
            // 1. Update basic user fields
            db.prepare(`
                UPDATE users SET full_name = ?, phone = ?, city = ?, avatar_url = ?, updated_at = ?
                WHERE id = ?
            `).run(full_name || null, phone || null, city || null, avatar_url || null, new Date().toISOString(), req.user.id);
            
            // 2. Update role-specific table
            if (req.user.role === 'parent') {
                const finalKidsAges = kids_ages || children_ages || null;
                db.prepare(`
                    INSERT INTO parents (user_id, kids_count, children_ages, family_desc, needs, budget, payment_pref)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(user_id) DO UPDATE SET
                        kids_count = excluded.kids_count,
                        children_ages = excluded.children_ages,
                        family_desc = excluded.family_desc,
                        needs = excluded.needs,
                        budget = excluded.budget,
                        payment_pref = excluded.payment_pref
                `).run(
                    req.user.id,
                    kids_count !== undefined ? Number(kids_count) : null,
                    finalKidsAges || null,
                    family_desc || null,
                    needs || null,
                    budget !== undefined ? Number(budget) : null,
                    payment_pref || null
                );
            } else if (req.user.role === 'sitter') {
                const finalRate = rate !== undefined ? Number(rate) : (hourly_rate !== undefined ? Number(hourly_rate) : null);
                const finalExp = experience !== undefined ? Number(experience) : (experience_years !== undefined ? Number(experience_years) : null);
                
                const dbDriverLicense = driverLicense !== undefined ? (driverLicense ? 1 : 0) : (driver_license ? 1 : 0);
                const dbHasCar = hasCar !== undefined ? (hasCar ? 1 : 0) : (has_car ? 1 : 0);
                const dbSmoker = smoker !== undefined ? (smoker ? 1 : 0) : (this.smoker ? 1 : 0);
                
                const dbSuperpowers = superpowers ? JSON.stringify(superpowers) : null;
                const dbComfortableWith = comfortableWith ? JSON.stringify(comfortableWith) : (comfortable_with ? JSON.stringify(comfortable_with) : null);
                const dbAvailability = availability ? JSON.stringify(availability) : null;
                
                db.prepare(`
                    INSERT INTO sitters (user_id, age, hourly_rate, experience_years, description, education, driver_license, has_car, smoker, preferred_location, superpowers, comfortable_with, availability)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                `).run(
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
                );
            }
        })();
        
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
