const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/guardianes',
});

async function main() {
    try {
        console.log("Conectando a la base de datos...");
        const users = await pool.query("SELECT id, email, role, full_name FROM users");
        console.log("\n--- USUARIOS ---");
        console.table(users.rows);

        const parents = await pool.query("SELECT * FROM parents");
        console.log("\n--- PADRES ---");
        console.table(parents.rows);

        const bookings = await pool.query("SELECT id, parent_id, sitter_id, status FROM bookings");
        console.log("\n--- RESERVAS ---");
        console.table(bookings.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

main();
