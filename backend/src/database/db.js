const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configure PostgreSQL connection pool
// En entorno local (desarrollo), puede que no necesites SSL, pero en Render (producción) sí.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/guardianes',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const db = {
    // Para consultas normales: await db.query('SELECT * FROM users WHERE id = $1', [id])
    query: (text, params) => pool.query(text, params),
    
    // Para transacciones: await db.transaction(async (client) => { await client.query(...) })
    transaction: async (callback) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await callback(client);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
};

// Sincronizar el esquema al arrancar
(async () => {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(schema);
            console.log('PostgreSQL: esquema de base de datos verificado.');
        }
        // Ejecutar migración para añadir num_children si no existe
        await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS num_children INTEGER DEFAULT 1;');
        console.log('PostgreSQL: migración de columnas completada.');
    } catch (err) {
        console.error('Error inicializando esquema o migraciones PostgreSQL:', err);
    }
})();

module.exports = db;
