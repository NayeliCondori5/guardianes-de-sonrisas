const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configure PostgreSQL connection pool
// En entorno local (desarrollo), puede que no necesites SSL, pero en Render (producción) sí.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/guardianes',
    ssl: (process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com'))) ? { rejectUnauthorized: false } : false
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
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INTEGER DEFAULT 0;');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified INTEGER DEFAULT 0;');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled INTEGER DEFAULT 0;');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret_encrypted TEXT;');
        await pool.query("ALTER TABLE sitters ADD COLUMN IF NOT EXISTS identity_status TEXT DEFAULT 'none';");
        await pool.query('ALTER TABLE sitters ADD COLUMN IF NOT EXISTS document_url TEXT;');
        await pool.query('ALTER TABLE sitters ADD COLUMN IF NOT EXISTS selfie_url TEXT;');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified INTEGER DEFAULT 0;');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified_at TEXT;');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS verification_log (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                type TEXT CHECK(type IN ('identity','email','phone')),
                method TEXT,
                confidence_score REAL,
                status TEXT CHECK(status IN ('pending','approved','rejected')),
                ip_address TEXT,
                created_at TEXT
            );
        `);
        await pool.query('CREATE INDEX IF NOT EXISTS idx_verification_log_user ON verification_log(user_id);');
        console.log('PostgreSQL: migración de columnas y tablas de verificación completada.');
    } catch (err) {
        console.error('Error inicializando esquema o migraciones PostgreSQL:', err);
    }
})();

module.exports = db;
