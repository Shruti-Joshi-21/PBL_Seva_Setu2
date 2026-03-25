const db = require('../config/db');
const userService = require('../services/user.service');

const getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT u.id, u.name, u.email, u.phone, u.is_active, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.deleted_at IS NULL
    `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [is_active, id]);

        res.json({ success: true, message: 'User status updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('UPDATE users SET deleted_at = NOW() WHERE id = ?', [id]);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getStats = async (req, res) => {
    try {
        const [[{ totalUsers }]] = await db.execute('SELECT COUNT(*) as totalUsers FROM users WHERE deleted_at IS NULL');
        const [[{ totalTasks }]] = await db.execute('SELECT COUNT(*) as totalTasks FROM tasks');
        const [[{ verifiedAttendances }]] = await db.execute("SELECT COUNT(*) as verifiedAttendances FROM attendance_records WHERE status = 'VERIFIED'");
        const [[{ flaggedAttendances }]] = await db.execute("SELECT COUNT(*) as flaggedAttendances FROM attendance_records WHERE status = 'FLAGGED'");

        res.json({
            success: true,
            data: {
                totalUsers,
                totalTasks,
                verifiedAttendances,
                flaggedAttendances
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    getAllUsers,
    toggleUserStatus,
    deleteUser,
    getStats
};
