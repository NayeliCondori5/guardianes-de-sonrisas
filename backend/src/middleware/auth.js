const jwt = require('jsonwebtoken');
const db = require('../database/db');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Acceso denegado: Token no proporcionado' });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        
        // Obtener usuario actualizado de BD para asegurar que sigue activo
        const { rows } = await db.query('SELECT id, role, is_active FROM users WHERE id = $1', [user.id]);
        const dbUser = rows.length > 0 ? rows[0] : null;
        
        if (!dbUser || dbUser.is_active === 0) {
            return res.status(403).json({ success: false, message: 'Usuario inactivo o no existe' });
        }

        req.user = dbUser;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
    }
};

module.exports = { authenticateToken };
