const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { encrypt, decrypt } = require('../utils/encryption');
const { otpRateLimiter } = require('../middleware/rateLimiter');

const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const faceVerificationService = require('../services/faceVerificationService');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const tempUploadsDir = './uploads/temp-verify';
if (!fs.existsSync(tempUploadsDir)) {
    fs.mkdirSync(tempUploadsDir, { recursive: true });
}

const tempDiskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempUploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'verify-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const tempUpload = multer({
    storage: tempDiskStorage,
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no soportado. Por favor use JPG, JPEG o PNG para verificación facial.'), false);
        }
    }
});


// GET /api/users/profile -> mi perfil
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const { rows: userRows } = await db.query('SELECT id, email, role, full_name, phone, avatar_url, city, is_active, email_verified, phone_verified, two_factor_enabled, identity_verified, identity_verified_at FROM users WHERE id = $1', [req.user.id]);
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
            const { rows: sitterRows } = await db.query('SELECT experience_years, hourly_rate, description, rating, total_reviews, is_verified, background_check_status, featured_until, age, education, driver_license, has_car, smoker, preferred_location, superpowers, comfortable_with, availability, identity_status, document_url, selfie_url FROM sitters WHERE user_id = $1', [user.id]);
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

// Almacén en memoria simple para códigos de verificación (mock/real)
const verificationCodes = new Map();

// POST /api/users/verify-identity/upload -> subir documentos para verificación biométrica
router.post('/verify-identity/upload', authenticateToken, (req, res) => {
    if (req.user.role !== 'parent' && req.user.role !== 'sitter') {
        return res.status(403).json({ success: false, message: 'No autorizado para verificar identidad.' });
    }

    const fieldsUpload = tempUpload.fields([
        { name: 'document', maxCount: 1 },
        { name: 'selfie', maxCount: 1 }
    ]);

    fieldsUpload(req, res, async (err) => {
        if (err) {
            console.error("Error al subir documentos:", err);
            return res.status(400).json({ 
                success: false, 
                message: `Error al subir archivos: ${err.message || err.toString()}` 
            });
        }

        if (!req.files || !req.files['document'] || !req.files['selfie']) {
            return res.status(400).json({ success: false, message: 'Debe subir tanto la foto del documento como la selfie de validación.' });
        }

        const documentFile = req.files['document'][0];
        const selfieFile = req.files['selfie'][0];
        const docPath = documentFile.path;
        const selfiePath = selfieFile.path;

        try {
            console.log(`[IDENTITY] Procesando comparación facial para usuario: ${req.user.id}`);
            const result = await faceVerificationService.compareFaces(docPath, selfiePath);

            const ipAddress = req.ip || req.connection.remoteAddress;
            const logId = uuidv4();

            if (result.isMatch && result.confidence >= 0.85) {
                // Marcar como verificado en la tabla de usuarios
                await db.query(
                    'UPDATE users SET identity_verified = 1, identity_verified_at = $1, updated_at = $1 WHERE id = $2',
                    [new Date().toISOString(), req.user.id]
                );

                // Si es sitter, también actualizamos su campo identity_status a 'verified'
                if (req.user.role === 'sitter') {
                    await db.query(
                        "UPDATE sitters SET identity_status = 'verified' WHERE user_id = $1",
                        [req.user.id]
                    );
                }

                // Registrar en verification_log
                await db.query(`
                    INSERT INTO verification_log (id, user_id, type, method, confidence_score, status, ip_address, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [logId, req.user.id, 'identity', result.mock ? 'mock' : 'azure_face', result.confidence, 'approved', ipAddress, new Date().toISOString()]);

                res.json({
                    success: true,
                    message: 'Identidad verificada exitosamente con biometría facial.',
                    confidence: result.confidence,
                    isMatch: true,
                    status: 'approved'
                });
            } else {
                // Registrar en verification_log
                await db.query(`
                    INSERT INTO verification_log (id, user_id, type, method, confidence_score, status, ip_address, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [logId, req.user.id, 'identity', result.mock ? 'mock' : 'azure_face', result.confidence, 'rejected', ipAddress, new Date().toISOString()]);

                res.status(400).json({
                    success: false,
                    message: `La verificación facial falló. Coincidencia de rostros insuficiente (${(result.confidence * 100).toFixed(1)}%). Requerido >= 85%.`,
                    confidence: result.confidence,
                    isMatch: false,
                    status: 'rejected'
                });
            }
        } catch (procErr) {
            console.error("Error al procesar verificación facial:", procErr);
            res.status(500).json({ success: false, message: `Error al procesar verificación: ${procErr.message}` });
        } finally {
            // ELIMINACIÓN SEGURA: eliminar imágenes del disco al terminar
            try {
                if (fs.existsSync(docPath)) {
                    fs.unlinkSync(docPath);
                    console.log(`[IDENTITY] Documento eliminado temporalmente de: ${docPath}`);
                }
                if (fs.existsSync(selfiePath)) {
                    fs.unlinkSync(selfiePath);
                    console.log(`[IDENTITY] Selfie eliminada temporalmente de: ${selfiePath}`);
                }
            } catch (cleanupErr) {
                console.error("Error al limpiar archivos temporales de verificación:", cleanupErr);
            }
        }
    });
});

// POST /api/users/verify-phone/request -> solicitar código de verificación telefónica
router.post('/verify-phone/request', authenticateToken, otpRateLimiter, async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Número de teléfono requerido.' });
    }
    
    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        verificationCodes.set(`phone:${req.user.id}`, { code, phone, expires: Date.now() + 10 * 60 * 1000 });
        
        await smsService.sendSmsCode(phone, code);
        
        // Guardar log en base de datos
        const ipAddress = req.ip || req.connection.remoteAddress;
        await db.query(`
            INSERT INTO verification_log (id, user_id, type, method, status, ip_address, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [uuidv4(), req.user.id, 'phone', 'otp_sms', 'pending', ipAddress, new Date().toISOString()]);
        
        await db.query('UPDATE users SET phone = $1, updated_at = $2 WHERE id = $3', [phone, new Date().toISOString(), req.user.id]);
        
        res.json({ success: true, message: 'Código de verificación enviado al celular.' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error al solicitar código de verificación.' });
    }
});

// POST /api/users/verify-phone/confirm -> verificar el código de teléfono
router.post('/verify-phone/confirm', authenticateToken, async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ success: false, message: 'Código requerido.' });
    }
    
    const key = `phone:${req.user.id}`;
    const entry = verificationCodes.get(key);
    
    if (!entry) {
        return res.status(400).json({ success: false, message: 'No se solicitó ningún código de verificación o ha expirado.' });
    }
    
    if (entry.expires < Date.now()) {
        verificationCodes.delete(key);
        return res.status(400).json({ success: false, message: 'El código de verificación ha expirado.' });
    }
    
    if (entry.code !== code) {
        return res.status(400).json({ success: false, message: 'Código de verificación incorrecto.' });
    }
    
    try {
        await db.query('UPDATE users SET phone_verified = 1, updated_at = $1 WHERE id = $2', [new Date().toISOString(), req.user.id]);
        
        // Guardar log en base de datos
        const ipAddress = req.ip || req.connection.remoteAddress;
        await db.query(`
            INSERT INTO verification_log (id, user_id, type, method, status, ip_address, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [uuidv4(), req.user.id, 'phone', 'otp_sms', 'approved', ipAddress, new Date().toISOString()]);
        
        verificationCodes.delete(key);
        res.json({ success: true, message: 'Número de teléfono verificado con éxito.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error al actualizar estado en base de datos.' });
    }
});

// POST /api/users/verify-email/request -> solicitar código de verificación de correo
router.post('/verify-email/request', authenticateToken, otpRateLimiter, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
        const email = rows[0]?.email;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Usuario no tiene correo registrado.' });
        }
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        verificationCodes.set(`email:${req.user.id}`, { code, email, expires: Date.now() + 10 * 60 * 1000 });
        
        await emailService.sendVerificationCode(email, code);
        
        // Guardar log en base de datos
        const ipAddress = req.ip || req.connection.remoteAddress;
        await db.query(`
            INSERT INTO verification_log (id, user_id, type, method, status, ip_address, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [uuidv4(), req.user.id, 'email', 'otp_email', 'pending', ipAddress, new Date().toISOString()]);
        
        res.json({ success: true, message: 'Código de verificación de correo enviado.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error al solicitar código de verificación.' });
    }
});

// POST /api/users/verify-email/confirm -> verificar código de correo
router.post('/verify-email/confirm', authenticateToken, async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ success: false, message: 'Código requerido.' });
    }
    
    const key = `email:${req.user.id}`;
    const entry = verificationCodes.get(key);
    
    if (!entry) {
        return res.status(400).json({ success: false, message: 'Código no solicitado o expirado.' });
    }
    
    if (entry.expires < Date.now()) {
        verificationCodes.delete(key);
        return res.status(400).json({ success: false, message: 'El código ha expirado.' });
    }
    
    if (entry.code !== code) {
        return res.status(400).json({ success: false, message: 'Código incorrecto.' });
    }
    
    try {
        await db.query('UPDATE users SET email_verified = 1, updated_at = $1 WHERE id = $2', [new Date().toISOString(), req.user.id]);
        
        // Guardar log en base de datos
        const ipAddress = req.ip || req.connection.remoteAddress;
        await db.query(`
            INSERT INTO verification_log (id, user_id, type, method, status, ip_address, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [uuidv4(), req.user.id, 'email', 'otp_email', 'approved', ipAddress, new Date().toISOString()]);
        
        verificationCodes.delete(key);
        res.json({ success: true, message: 'Correo verificado con éxito.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno.' });
    }
});

// POST /api/users/2fa/setup -> iniciar configuración de 2FA
router.post('/2fa/setup', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        const email = rows[0].email;

        // Generar secret
        const secret = speakeasy.generateSecret({
            name: `Guardianes de Sonrisas (${email})`
        });

        const encryptedSecret = encrypt(secret.base32);

        // Guardar secret temporal en BD pero mantener two_factor_enabled en 0 hasta confirmar
        await db.query(
            'UPDATE users SET totp_secret_encrypted = $1, two_factor_enabled = 0, updated_at = $2 WHERE id = $3',
            [encryptedSecret, new Date().toISOString(), req.user.id]
        );

        // Generar QR code
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        res.json({
            success: true,
            qrCode: qrCodeUrl,
            secret: secret.base32
        });
    } catch (err) {
        console.error('Error al configurar 2FA:', err);
        res.status(500).json({ success: false, message: 'Error al iniciar configuración de 2FA.' });
    }
});

// POST /api/users/2fa/confirm -> confirmar y activar 2FA
router.post('/2fa/confirm', authenticateToken, async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ success: false, message: 'Código de verificación requerido.' });
    }

    try {
        const { rows } = await db.query('SELECT totp_secret_encrypted FROM users WHERE id = $1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        const encryptedSecret = rows[0].totp_secret_encrypted;
        if (!encryptedSecret) {
            return res.status(400).json({ success: false, message: 'No se ha iniciado la configuración de 2FA.' });
        }

        const decryptedSecret = decrypt(encryptedSecret);
        if (!decryptedSecret) {
            return res.status(500).json({ success: false, message: 'Error de descifrado interno.' });
        }

        const verified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token: code,
            window: 1 // Permitir 1 paso de tolerancia
        });

        if (!verified) {
            return res.status(400).json({ success: false, message: 'Código de verificación incorrecto.' });
        }

        // Activar 2FA
        await db.query(
            'UPDATE users SET two_factor_enabled = 1, updated_at = $1 WHERE id = $2',
            [new Date().toISOString(), req.user.id]
        );

        res.json({ success: true, message: 'Autenticación de dos factores (2FA) activada correctamente.' });
    } catch (err) {
        console.error('Error al confirmar 2FA:', err);
        res.status(500).json({ success: false, message: 'Error al confirmar 2FA.' });
    }
});

// POST /api/users/2fa/disable -> desactivar 2FA
router.post('/2fa/disable', authenticateToken, async (req, res) => {
    const { code, password } = req.body;
    if (!code || !password) {
        return res.status(400).json({ success: false, message: 'Código y contraseña requeridos.' });
    }

    try {
        const { rows } = await db.query('SELECT password, totp_secret_encrypted FROM users WHERE id = $1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Contraseña incorrecta.' });
        }

        if (!user.totp_secret_encrypted) {
            return res.status(400).json({ success: false, message: '2FA no está activo para esta cuenta.' });
        }

        const decryptedSecret = decrypt(user.totp_secret_encrypted);
        const verified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ success: false, message: 'Código de verificación incorrecto.' });
        }

        // Desactivar 2FA
        await db.query(
            'UPDATE users SET two_factor_enabled = 0, totp_secret_encrypted = NULL, updated_at = $1 WHERE id = $2',
            [new Date().toISOString(), req.user.id]
        );

        res.json({ success: true, message: 'Autenticación de dos factores (2FA) desactivada correctamente.' });
    } catch (err) {
        console.error('Error al desactivar 2FA:', err);
        res.status(500).json({ success: false, message: 'Error al desactivar 2FA.' });
    }
});

module.exports = router;
