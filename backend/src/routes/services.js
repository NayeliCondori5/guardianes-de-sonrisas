const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// GET /api/services -> List all approved services or filter by sitter_id / status
router.get('/', (req, res) => {
    const { sitter_id, status } = req.query;
    let query = `
        SELECT s.*, u.full_name as sitter_name 
        FROM services s
        JOIN users u ON s.sitter_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (sitter_id) {
        query += ` AND s.sitter_id = ?`;
        params.push(sitter_id);
    }
    if (status) {
        query += ` AND s.status = ?`;
        params.push(status);
    } else {
        // By default, if not specified and not filtered by sitter, only return approved services
        if (!sitter_id) {
            query += ` AND s.status = 'approved'`;
        }
    }

    try {
        const services = db.prepare(query).all(...params);
        res.json({ success: true, data: services });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno al buscar servicios' });
    }
});

// POST /api/services -> Create a new service (Caregivers only)
router.post('/', authenticateToken, (req, res) => {
    if (req.user.role !== 'sitter') {
        return res.status(403).json({ success: false, message: 'Solo los cuidadores pueden registrar servicios' });
    }

    const { title, description, category, hourly_rate } = req.body;
    if (!title || !description || !category || !hourly_rate) {
        return res.status(400).json({ success: false, message: 'Todos los campos básicos son obligatorios' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    try {
        db.prepare(`
            INSERT INTO services (id, sitter_id, title, description, category, hourly_rate, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `).run(id, req.user.id, title, description, category, Number(hourly_rate), now, now);

        res.status(201).json({
            success: true,
            message: 'Servicio registrado correctamente. Se encuentra pendiente de aprobación por el administrador.',
            data: { id, sitter_id: req.user.id, title, description, category, hourly_rate, status: 'pending' }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno al registrar servicio' });
    }
});

// PUT /api/services/:id -> Update a service (Caregiver owner only)
router.put('/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'sitter') {
        return res.status(403).json({ success: false, message: 'Solo los cuidadores pueden editar servicios' });
    }

    const { title, description, category, hourly_rate } = req.body;
    if (!title || !description || !category || !hourly_rate) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios para actualizar' });
    }

    try {
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }
        if (service.sitter_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'No estás autorizado para modificar este servicio' });
        }

        const now = new Date().toISOString();

        // HU-02: Any critical edit returns the product/service state to "pending"
        db.prepare(`
            UPDATE services 
            SET title = ?, description = ?, category = ?, hourly_rate = ?, status = 'pending', updated_at = ?
            WHERE id = ?
        `).run(title, description, category, Number(hourly_rate), now, req.params.id);

        res.json({
            success: true,
            message: 'Servicio editado con éxito. Al realizar cambios, ha vuelto al estado pendiente para revisión del administrador.',
            data: { id: req.params.id, sitter_id: req.user.id, title, description, category, hourly_rate, status: 'pending' }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno al actualizar servicio' });
    }
});

// DELETE /api/services/:id -> Delete a service (Caregiver owner only)
router.delete('/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'sitter') {
        return res.status(403).json({ success: false, message: 'Solo los cuidadores pueden eliminar servicios' });
    }

    try {
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }
        if (service.sitter_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'No estás autorizado para eliminar este servicio' });
        }

        db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
        res.json({ success: true, message: 'Servicio eliminado permanentemente de la plataforma' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno al eliminar servicio' });
    }
});

// PUT /api/services/:id/validate -> Validate a service (Admin only)
router.put('/:id/validate', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Solo administradores pueden realizar esta acción' });
    }

    const { status } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Estado inválido. Debe ser approved o rejected' });
    }

    try {
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }

        const now = new Date().toISOString();
        db.prepare('UPDATE services SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);

        res.json({
            success: true,
            message: `Servicio ${status === 'approved' ? 'aprobado' : 'rechazado'} correctamente.`,
            data: { ...service, status }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error interno al validar servicio' });
    }
});

module.exports = router;
