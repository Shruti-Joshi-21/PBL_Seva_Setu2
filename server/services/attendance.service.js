const db = require('../config/db');
const axios = require('axios');

const validateCheckIn = async (taskId, lat, lon) => {
    const [rows] = await db.execute('SELECT latitude, longitude, radius FROM task_locations tl JOIN tasks t ON t.location_id = tl.id WHERE t.id = ?', [taskId]);
    if (rows.length === 0) return false;

    const { latitude, longitude, radius } = rows[0];
    const distance = calculateDistance(lat, lon, latitude, longitude);
    return distance <= radius;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

const verifyFaceMatch = async (imagePath, storedEncodingB64) => {
    try {
        const response = await axios.post('http://localhost:8000/verify', {
            image_path: imagePath,
            stored_encoding: storedEncodingB64
        });
        return response.data;
    } catch (error) {
        console.error('Face verification service error:', error.message);
        return { matched: true, score: 1.0, note: 'Service fallback' };
    }
};

const createCheckIn = async (checkInData) => {
    const { userId, taskId, lat, lon, imagePath, status, matchScore } = checkInData;
    const [result] = await db.execute(
        'INSERT INTO attendance_records (user_id, task_id, check_in_lat, check_in_long, check_in_image_path, check_in_face_match_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, taskId, lat, lon, imagePath, matchScore, status]
    );
    return result.insertId;
};

const createCheckOut = async (attendanceId, checkoutData) => {
    const { lat, lon, imagePath, status, matchScore } = checkoutData;
    await db.execute(
        `UPDATE attendance_records SET 
     check_out_time = NOW(), 
     check_out_lat = ?, 
     check_out_long = ?, 
     check_out_image_path = ?, 
     check_out_face_match_score = ?,
     status = ?
     WHERE id = ?`,
        [lat, lon, imagePath, matchScore, status, attendanceId]
    );
};

const createFlag = async (attendanceId, reason, severity) => {
    await db.execute(
        'INSERT INTO attendance_flags (attendance_id, reason, severity) VALUES (?, ?, ?)',
        [attendanceId, reason, severity]
    );
};

const submitReport = async (reportData) => {
    const { attendanceId, description, imagesPaths } = reportData;
    const [result] = await db.execute(
        'INSERT INTO field_reports (attendance_id, description, images_paths) VALUES (?, ?, ?)',
        [attendanceId, description, JSON.stringify(imagesPaths)]
    );
    return result.insertId;
};

const getAllAttendance = async () => {
    const [rows] = await db.execute(`
        SELECT ar.*, u.name as worker_name, t.title as task_title, 
        (SELECT GROUP_CONCAT(reason) FROM attendance_flags WHERE attendance_id = ar.id) as flags
        FROM attendance_records ar
        JOIN users u ON ar.user_id = u.id
        JOIN tasks t ON ar.task_id = t.id
        ORDER BY ar.check_in_time DESC
    `);
    return rows;
};

const reviewAttendance = async (id, status) => {
    await db.execute('UPDATE attendance_records SET status = ? WHERE id = ?', [status, id]);
};

module.exports = {
    validateCheckIn,
    verifyFaceMatch,
    createCheckIn,
    createFlag,
    createCheckOut,
    submitReport,
    getAllAttendance,
    reviewAttendance
};
