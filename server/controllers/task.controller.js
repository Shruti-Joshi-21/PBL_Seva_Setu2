const taskService = require('../services/task.service');
const { sendSuccess, sendError } = require('../utils/response');

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
    return sendSuccess(res, { taskId }, 'Task created and assigned successfully', 201);
  } catch (error) {
    if (error.statusCode === 400) {
      return sendError(res, error.message, 400);
    }
    return next(error);
  }
};

const getWorkerTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasksByWorker(req.userId);
    return sendSuccess(res, tasks);
  } catch (error) {
    return next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const tasks = await taskService.getAllTasks();
    return sendSuccess(res, tasks);
  } catch (error) {
    return next(error);
  }
};

module.exports = { create, getWorkerTasks, getAll };
