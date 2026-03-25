const pool = require('./config/db');
const bcrypt = require('bcrypt');

const seed = async () => {
  try {
    console.log('Starting comprehensive database seeding...');

    // 1. Roles
    await pool.query("INSERT IGNORE INTO roles (id, name) VALUES (1, 'ADMIN'), (2, 'TEAM_LEAD'), (3, 'FIELD_WORKER')");

    // 2. Users
    const hashedPwd = await bcrypt.hash('password123', 10);

    // Admin
    await pool.query("INSERT IGNORE INTO users (id, name, email, password, role_id, phone) VALUES (1, 'Suresh Admin', 'admin@sevasetu.gov.in', ?, 1, '9999999999')", [hashedPwd]);
    // Team Leads
    await pool.query("INSERT IGNORE INTO users (id, name, email, password, role_id, phone) VALUES (2, 'Vikram Lead', 'lead@sevasetu.gov.in', ?, 2, '8888888888')", [hashedPwd]);
    // Workers
    await pool.query("INSERT IGNORE INTO users (id, name, email, password, role_id, phone) VALUES (3, 'Rahul Worker', 'worker@sevasetu.gov.in', ?, 3, '7777777777')", [hashedPwd]);
    await pool.query("INSERT IGNORE INTO users (id, name, email, password, role_id, phone) VALUES (4, 'Anjali Field', 'anjali@sevasetu.gov.in', ?, 3, '7777777666')", [hashedPwd]);

    // 3. Locations
    await pool.query("INSERT IGNORE INTO task_locations (id, name, address, latitude, longitude, radius) VALUES (1, 'Juhu Beach', 'Juhu Tara Rd, Juhu, Mumbai, Maharashtra 400049', 19.0988, 72.8264, 500)");
    await pool.query("INSERT IGNORE INTO task_locations (id, name, address, latitude, longitude, radius) VALUES (2, 'Gateway of India', 'Apollo Bandar, Colaba, Mumbai, Maharashtra 400001', 18.9220, 72.8347, 300)");

    // 4. Tasks
    await pool.query("INSERT IGNORE INTO tasks (id, title, description, location_id, created_by, start_time, end_time) VALUES (1, 'Beach Cleanliness Survey', 'Assess the cleanliness of Juhu beach after morning hours.', 1, 2, NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR))");
    await pool.query("INSERT IGNORE INTO tasks (id, title, description, location_id, created_by, start_time, end_time) VALUES (2, 'Monument Site Inspection', 'Security and maintenance check at Gateway.', 2, 2, NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR))");

    // 5. Assignments
    await pool.query("INSERT IGNORE INTO task_assignments (task_id, user_id) VALUES (1, 3), (2, 4)");

    console.log('Comprehensive seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
