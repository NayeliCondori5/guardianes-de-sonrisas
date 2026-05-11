const db = require('./db');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    console.log('Iniciando seed...');
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash('Admin123!', salt);
    const hashUser = await bcrypt.hash('Test123!', salt);

    const now = new Date().toISOString();

    // 1 admin
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password, role, full_name, is_active, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('admin-id-1', 'superadmin@admin.com', hash, 'admin', 'Super Admin', 1, now, now);

    // 3 parents
    for (let i = 1; i <= 3; i++) {
      const pid = `parent-id-${i}`;
      db.prepare(`
        INSERT OR IGNORE INTO users (id, email, password, role, full_name, city, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(pid, `papa${i}@ejemplo.com`, hashUser, 'parent', `Padre ${i}`, 'Madrid', 1, now, now);
      
      db.prepare(`
        INSERT OR IGNORE INTO parents (user_id, children_ages, preferred_rate_min, preferred_rate_max)
        VALUES (?, ?, ?, ?)
      `).run(pid, JSON.stringify([2, 5]), 10, 20);
    }

    // 5 sitters
    for (let i = 1; i <= 5; i++) {
      const sid = `sitter-id-${i}`;
      db.prepare(`
        INSERT OR IGNORE INTO users (id, email, password, role, full_name, city, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sid, `cuidador${i}@ejemplo.com`, hashUser, 'sitter', `Cuidador ${i}`, 'Madrid', 1, now, now);
      
      db.prepare(`
        INSERT OR IGNORE INTO sitters (user_id, experience_years, hourly_rate, description, rating, total_reviews, is_verified, background_check_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sid, i + 2, 12 + i, `Soy cuidador ${i} con mucha experiencia.`, 4.5, 3, 1, 'approved');
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

    const insertConfig = db.prepare(`INSERT OR IGNORE INTO site_config (key, value, updated_at) VALUES (?, ?, ?)`);
    config.forEach(c => insertConfig.run(c[0], c[1], now));

    console.log('Seed completado!');
  } catch (err) {
    console.error('Error en seed:', err);
  }
};

seed();
