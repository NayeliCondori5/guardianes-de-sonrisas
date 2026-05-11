const jwt = require('jsonwebtoken');
const db = require('../database/db');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Acceso denegado: Token no proporcionado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
        }

        // Obtener usuario actualizado de BD para asegurar que sigue activo
        const dbUser = db.prepare('SELECT id, role, is_active FROM users WHERE id = ?').get(user.id);
        
        if (!dbUser || dbUser.is_active === 0) {
            return res.status(403).json({ success: false, message: 'Usuario inactivo o no existe' });
        }

        req.user = dbUser;
        next();
    });
};

module.exports = { authenticateToken };
