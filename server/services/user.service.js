const db = require('../config/db');
const bcrypt = require('bcrypt');

const createUser = async (userData) => {
    const { name, email, password, role_id, phone } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
        'INSERT INTO users (name, email, password, role_id, phone) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, role_id, phone]
    );

    return result.insertId;
};

const findByEmail = async (email) => {
    const [rows] = await db.execute(
        'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = ? AND u.deleted_at IS NULL',
        [email]
    );
    return rows[0];
};

const findById = async (id) => {
    const [rows] = await db.execute(
        'SELECT u.id, u.name, u.email, u.role_id, r.name as role_name, u.phone FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ? AND u.deleted_at IS NULL',
        [id]
    );
    return rows[0];
};

module.exports = {
    createUser,
    findByEmail,
    findById
};
