const db = require('../config/db');

const createTask = async (taskData) => {
    const { title, description, location_id, start_time, end_time, created_by } = taskData;
    const [result] = await db.execute(
        'INSERT INTO tasks (title, description, location_id, start_time, end_time, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [title, description, location_id, start_time, end_time, created_by]
    );
    return result.insertId;
};

const assignWorkers = async (taskId, workerIds) => {
    const values = workerIds.map(workerId => [taskId, workerId]);
    const [result] = await db.query(
        'INSERT INTO task_assignments (task_id, user_id) VALUES ?',
        [values]
    );
    return result;
};

const getTasksByWorker = async (workerId) => {
    const [rows] = await db.execute(
        `SELECT t.*, tl.name as location_name, tl.latitude, tl.longitude, tl.radius 
     FROM tasks t 
     JOIN task_locations tl ON t.location_id = tl.id 
     JOIN task_assignments ta ON t.id = ta.task_id 
     WHERE ta.user_id = ? AND t.deleted_at IS NULL`,
        [workerId]
    );
    return rows;
};

const getAllTasks = async () => {
    const [rows] = await db.execute(
        `SELECT t.*, tl.name as location_name, u.name as creator_name 
     FROM tasks t 
     LEFT JOIN task_locations tl ON t.location_id = tl.id 
     LEFT JOIN users u ON t.created_by = u.id`
    );
    return rows;
};

module.exports = {
    createTask,
    assignWorkers,
    getTasksByWorker,
    getAllTasks
};
