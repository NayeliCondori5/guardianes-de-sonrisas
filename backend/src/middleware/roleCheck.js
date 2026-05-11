const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
    }
};

const isParent = (req, res, next) => {
    if (req.user && req.user.role === 'parent') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de padre' });
    }
};

const isSitter = (req, res, next) => {
    if (req.user && req.user.role === 'sitter') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de cuidador' });
    }
};

const isAdminOrSelf = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.id === req.params.id) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
};

module.exports = { isAdmin, isParent, isSitter, isAdminOrSelf };
