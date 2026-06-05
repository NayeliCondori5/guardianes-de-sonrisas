const db = require('./db');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    console.log('Iniciando seed...');
    
    // Clean DB
    console.log('Limpiando base de datos anterior...');
    await db.query('DELETE FROM site_config');
    await db.query('DELETE FROM payments');
    await db.query('DELETE FROM reviews');
    await db.query('DELETE FROM bookings');
    await db.query('DELETE FROM services');
    await db.query('DELETE FROM certifications');
    await db.query('DELETE FROM availability');
    await db.query('DELETE FROM sitters');
    await db.query('DELETE FROM parents');
    await db.query('DELETE FROM users');

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash('Admin123!', salt);
    const hashUser = await bcrypt.hash('Test123!', salt);

    const now = new Date().toISOString();

    // 1 admin
    await db.query(`
      INSERT INTO users (id, email, password, role, full_name, is_active, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
    `, ['admin-id-1', 'superadmin@admin.com', hash, 'admin', 'Super Admin', 1, now, now]);

    // 3 parents
    for (let i = 1; i <= 3; i++) {
      const pid = `parent-id-${i}`;
      await db.query(`
        INSERT INTO users (id, email, password, role, full_name, city, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
      `, [pid, `papa${i}@ejemplo.com`, hashUser, 'parent', `Padre ${i}`, 'Madrid', 1, now, now]);
      
      await db.query(`
        INSERT INTO parents (user_id, children_ages, preferred_rate_min, preferred_rate_max)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [pid, JSON.stringify([2, 5]), 10, 20]);
    }

    // 5 sitters with varied ratings, rates, and cities
    const ratings = [4.2, 4.8, 3.9, 4.5, 5.0];
    const experiences = [3, 5, 2, 7, 4];
    const rates = [15, 18, 12, 25, 20];
    const cities = ['Madrid', 'Barcelona', 'Madrid', 'Valencia', 'Madrid'];

    for (let i = 1; i <= 5; i++) {
      const sid = `sitter-id-${i}`;
      await db.query(`
        INSERT INTO users (id, email, password, role, full_name, city, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
      `, [sid, `cuidador${i}@ejemplo.com`, hashUser, 'sitter', `Cuidador ${i}`, cities[i-1], 1, now, now]);
      
      await db.query(`
        INSERT INTO sitters (user_id, experience_years, hourly_rate, description, rating, total_reviews, is_verified, background_check_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [sid, experiences[i-1], rates[i-1], `Soy el cuidador ${i} con mucha experiencia en el área de cuidado infantil.`, ratings[i-1], i * 2, 1, 'approved']);
    }

    // Seed services for sitters in different categories
    const services = [
      { id: 'service-1', sitter_id: 'sitter-id-1', title: 'Cuidado de bebés y estimulación temprana', description: 'Atención personalizada para recién nacidos, cambio de pañales, preparación de biberones y estimulación motriz.', category: 'Cuidado de Bebés', hourly_rate: 18, status: 'approved', created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'service-2', sitter_id: 'sitter-id-1', title: 'Tutoría de matemáticas y apoyo escolar', description: 'Ayuda con las tareas de primaria y secundaria, técnicas de estudio y refuerzo en matemáticas.', category: 'Tutoría / Apoyo Escolar', hourly_rate: 22, status: 'approved', created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'service-3', sitter_id: 'sitter-id-2', title: 'Juegos recreativos y actividades creativas', description: 'Organización de talleres de dibujo, manualidades y juegos interactivos para mantener a los niños entretenidos de forma sana.', category: 'Cuidado General / Juegos', hourly_rate: 16, status: 'approved', created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'service-4', sitter_id: 'sitter-id-3', title: 'Cuidado nocturno y fines de semana', description: 'Disponibilidad para cuidar a tus niños durante tus salidas los fines de semana o emergencias por la noche.', category: 'Cuidado General / Juegos', hourly_rate: 25, status: 'approved', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'service-5', sitter_id: 'sitter-id-4', title: 'Enfermería infantil y primeros auxilios', description: 'Cuidadora certificada en enfermería, ideal para niños que requieran administración de medicamentos o cuidados especiales.', category: 'Primeros Auxilios / Enfermería', hourly_rate: 30, status: 'approved', created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'service-6', sitter_id: 'sitter-id-5', title: 'Cuidado integral de infantes y lectura de cuentos', description: 'Acompañamiento, narración de historias divertidas, actividades didácticas y preparación de meriendas nutritivas.', category: 'Cuidado de Bebés', hourly_rate: 20, status: 'approved', created_at: now }
    ];

    for (const svc of services) {
      await db.query(`
        INSERT INTO services (id, sitter_id, title, description, category, hourly_rate, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      `, [svc.id, svc.sitter_id, svc.title, svc.description, svc.category, svc.hourly_rate, svc.status, svc.created_at]);
    }

    // Seed bookings to test "most used" filter
    const bookings = [
      // Sitter 3: 5 bookings (most used)
      { id: 'booking-1', parent_id: 'parent-id-1', sitter_id: 'sitter-id-3', status: 'completed' },
      { id: 'booking-2', parent_id: 'parent-id-2', sitter_id: 'sitter-id-3', status: 'completed' },
      { id: 'booking-3', parent_id: 'parent-id-3', sitter_id: 'sitter-id-3', status: 'completed' },
      { id: 'booking-4', parent_id: 'parent-id-1', sitter_id: 'sitter-id-3', status: 'confirmed' },
      { id: 'booking-5', parent_id: 'parent-id-2', sitter_id: 'sitter-id-3', status: 'confirmed' },
      
      // Sitter 2: 3 bookings
      { id: 'booking-6', parent_id: 'parent-id-1', sitter_id: 'sitter-id-2', status: 'completed' },
      { id: 'booking-7', parent_id: 'parent-id-2', sitter_id: 'sitter-id-2', status: 'completed' },
      { id: 'booking-8', parent_id: 'parent-id-3', sitter_id: 'sitter-id-2', status: 'confirmed' },
      
      // Sitter 5: 2 bookings
      { id: 'booking-9', parent_id: 'parent-id-1', sitter_id: 'sitter-id-5', status: 'completed' },
      { id: 'booking-10', parent_id: 'parent-id-2', sitter_id: 'sitter-id-5', status: 'confirmed' },
      
      // Sitter 1: 1 booking
      { id: 'booking-11', parent_id: 'parent-id-1', sitter_id: 'sitter-id-1', status: 'completed' }
    ];

    for (const b of bookings) {
      await db.query(`
        INSERT INTO bookings (id, parent_id, sitter_id, status, start_datetime, end_datetime, total_hours, hourly_rate, subtotal, platform_fee, total_amount, message, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [b.id, b.parent_id, b.sitter_id, b.status, now, now, 4, 15, 60, 6, 66, 'Reserva de prueba', now]);
    }

    // Config default
    const config = [
      ['hero_title', 'Conectamos a tu familia con cuidadores de confianza'],
      ['hero_subtitle', 'Niñeras y cuidadores verificados, disponibles cuando los necesitas'],
      ['hero_btn_parent_text', 'Soy Padre'],
      ['hero_btn_sitter_text', 'Soy Cuidador'],
      ['how_it_works_steps', JSON.stringify([
        { title: 'Regístrate', description: 'Crea tu cuenta', icon: 'UserPlus' },
        { title: 'Busca', description: 'Encuentra al cuidador ideal', icon: 'Search' },
        { title: 'Reserva', description: 'Agenda y paga seguro', icon: 'Calendar' }
      ])],
      ['footer_facebook', 'https://facebook.com'],
      ['footer_instagram', 'https://instagram.com'],
      ['footer_tiktok', 'https://tiktok.com'],
      ['platform_fee_percent', '10'],
      ['company_bank_account', 'Banco XYZ / Cta: 1234-5678-9012'],
      ['company_qr_image_url', '']
    ];

    for (const c of config) {
      await db.query(`INSERT INTO site_config (key, value, updated_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [c[0], c[1], now]);
    }

    console.log('Seed completado!');
    process.exit(0);
  } catch (err) {
    console.error('Error en seed:', err);
    process.exit(1);
  }
};

// Wait for db to connect
setTimeout(seed, 1000);
