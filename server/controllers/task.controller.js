const taskService = require('../services/task.service');

const create = async (req, res) => {
    try {
        const { title, description, location_id, start_time, end_time, worker_ids } = req.body;
        const createdBy = req.userId;

        const taskId = await taskService.createTask({
            title, description, location_id, start_time, end_time, created_by: createdBy, worker_ids
        });

        if (worker_ids && worker_ids.length > 0) {
            await taskService.assignWorkers(taskId, worker_ids);
        }

        res.status(201).json({
            success: true,
            message: 'Task created and assigned successfully',
            data: { taskId }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getWorkerTasks = async (req, res) => {
    try {
        const userId = req.userId;
        const tasks = await taskService.getTasksByWorker(userId);
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAll = async (req, res) => {
    try {
        const tasks = await taskService.getAllTasks();
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    create,
    getWorkerTasks,
    getAll
};
