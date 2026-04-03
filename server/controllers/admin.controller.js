const User = require('../models/User');
const Task = require('../models/Task');
const AttendanceRecord = require('../models/AttendanceRecord');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ isDeleted: false }).select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        await User.findByIdAndUpdate(id, { $set: { isActive: !!is_active } });

        res.json({ success: true, message: 'User status updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndUpdate(id, { $set: { isDeleted: true, isActive: false } });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getStats = async (req, res) => {
    try {
        const [totalUsers, totalTasks, verifiedAttendances, flaggedAttendances] = await Promise.all([
            User.countDocuments({ isDeleted: false }),
            Task.countDocuments({ isDeleted: false }),
            AttendanceRecord.countDocuments({ status: 'VERIFIED', isDeleted: false }),
            AttendanceRecord.countDocuments({ status: 'FLAGGED', isDeleted: false }),
        ]);

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

module.exports = { getAllUsers, toggleUserStatus, deleteUser, getStats };
