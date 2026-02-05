const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { authenticateToken, authorizeRoles, committeeOnly } = require('../middleware/auth');

// Apply authentication to all task routes
router.use(authenticateToken);

// GET all tasks with advanced filtering and sorting
router.get('/', async (req, res) => {
    try {
        const {
            status,
            assignee,
            priority,
            tags,
            project,
            category,
            archived = false,
            template = false,
            search,
            sortBy = 'lastActivity',
            sortOrder = 'desc',
            page = 1,
            limit = 50
        } = req.query;

        // Build filter object
        const filter = { archived: archived === 'true', template: template === 'true' };
        
        if (status) filter.status = status;
        if (assignee) filter.assignee = assignee;
        if (priority) filter.priority = priority;
        if (project) filter.project = project;
        if (category) filter.category = category;
        if (tags) filter.tags = { $in: tags.split(',') };
        
        // Search functionality
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const tasks = await Task.find(filter)
            .populate('dependencies', 'title status')
            .populate('blockedBy', 'title status')
            .sort({ _id: -1 }) // Use _id instead of dynamic sort
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Task.countDocuments(filter);

        res.json({
            tasks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET single task by ID with populated references
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('dependencies', 'title status priority assignee')
            .populate('blockedBy', 'title status priority assignee');
        
        if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
        res.json(task);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// CREATE task with activity logging
router.post('/', async (req, res) => {
    try {
        const taskData = {
            ...req.body,
            creator: req.body.creator || 'system',
            activityLog: [{
                action: 'created',
                user: req.body.creator || 'system',
                details: `Task "${req.body.title}" created`,
                timestamp: new Date()
            }]
        };

        const task = new Task(taskData);
        const saved = await task.save();
        res.json(saved);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// UPDATE task with activity logging
router.put('/:id', async (req, res) => {
    try {
        const existingTask = await Task.findById(req.params.id);
        if (!existingTask) return res.status(404).json({ success: false, error: 'Task not found' });

        // Track changes for activity log
        const changes = [];
        const fieldsToTrack = ['title', 'status', 'priority', 'assignee', 'progress', 'deadline'];
        
        fieldsToTrack.forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== existingTask[field]) {
                changes.push(`${field} changed from "${existingTask[field]}" to "${req.body[field]}"`);
            }
        });

        // Add activity log entry if there are changes
        if (changes.length > 0) {
            req.body.activityLog = [
                ...(existingTask.activityLog || []),
                {
                    action: 'updated',
                    user: req.body.updatedBy || 'system',
                    details: changes.join(', '),
                    timestamp: new Date()
                }
            ];
        }

        const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('dependencies', 'title status')
            .populate('blockedBy', 'title status');
        
        res.json(updated);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// DELETE task
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Task.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, error: 'Task not found' });
        res.json({ success: true, _id: deleted._id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// BULK operations
router.post('/bulk', async (req, res) => {
    try {
        const { action, taskIds, data } = req.body;
        
        switch (action) {
            case 'update':
                await Task.updateMany(
                    { _id: { $in: taskIds } },
                    { $set: data }
                );
                break;
            case 'delete':
                await Task.deleteMany({ _id: { $in: taskIds } });
                break;
            case 'archive':
                await Task.updateMany(
                    { _id: { $in: taskIds } },
                    { $set: { archived: true } }
                );
                break;
            default:
                return res.status(400).json({ success: false, error: 'Invalid bulk action' });
        }
        
        res.json({ success: true, affected: taskIds.length });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Add comment to task
router.post('/:id/comments', async (req, res) => {
    try {
        const { author, content } = req.body;
        const task = await Task.findById(req.params.id);
        
        if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
        
        const comment = {
            author,
            content,
            createdAt: new Date()
        };
        
        task.comments.push(comment);
        task.activityLog.push({
            action: 'commented',
            user: author,
            details: `Added comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            timestamp: new Date()
        });
        
        await task.save();
        res.json(task);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Add subtask
router.post('/:id/subtasks', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
        
        const subtask = {
            ...req.body,
            createdAt: new Date()
        };
        
        task.subtasks.push(subtask);
        task.activityLog.push({
            action: 'subtask_added',
            user: req.body.createdBy || 'system',
            details: `Added subtask: "${subtask.title}"`,
            timestamp: new Date()
        });
        
        await task.save();
        res.json(task);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Update subtask
router.put('/:id/subtasks/:subtaskId', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
        
        const subtask = task.subtasks.id(req.params.subtaskId);
        if (!subtask) return res.status(404).json({ success: false, error: 'Subtask not found' });
        
        Object.assign(subtask, req.body);
        
        task.activityLog.push({
            action: 'subtask_updated',
            user: req.body.updatedBy || 'system',
            details: `Updated subtask: "${subtask.title}"`,
            timestamp: new Date()
        });
        
        await task.save();
        res.json(task);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Time tracking - start timer
router.post('/:id/time/start', async (req, res) => {
    try {
        const { user } = req.body;
        const task = await Task.findById(req.params.id);
        
        if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
        
        // Check if user already has an active timer
        const activeTimer = task.timeEntries.find(entry => entry.user === user && !entry.endTime);
        if (activeTimer) {
            return res.status(400).json({ success: false, error: 'Timer already running for this user' });
        }
        
        const timeEntry = {
            user,
            startTime: new Date(),
            description: req.body.description || ''
        };
        
        task.timeEntries.push(timeEntry);
        await task.save();
        
        res.json({ success: true, timeEntry: task.timeEntries[task.timeEntries.length - 1] });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Time tracking - stop timer
router.post('/:id/time/stop', async (req, res) => {
    try {
        const { user } = req.body;
        const task = await Task.findById(req.params.id);
        
        if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
        
        const activeTimer = task.timeEntries.find(entry => entry.user === user && !entry.endTime);
        if (!activeTimer) {
            return res.status(400).json({ success: false, error: 'No active timer found for this user' });
        }
        
        activeTimer.endTime = new Date();
        activeTimer.duration = Math.round((activeTimer.endTime - activeTimer.startTime) / (1000 * 60)); // minutes
        
        // Update total actual hours
        task.actualHours = task.timeEntries.reduce((total, entry) => {
            return total + (entry.duration ? entry.duration / 60 : 0);
        }, 0);
        
        await task.save();
        res.json({ success: true, timeEntry: activeTimer });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Get task templates
router.get('/templates/list', async (req, res) => {
    try {
        const templates = await Task.find({ template: true }).sort({ _id: 1 }); // Use _id instead of templateName
        res.json(templates);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Create task from template
router.post('/templates/:templateId/create', async (req, res) => {
    try {
        const template = await Task.findById(req.params.templateId);
        if (!template || !template.template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }
        
        const taskData = {
            ...template.toObject(),
            _id: undefined,
            template: false,
            templateName: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            comments: [],
            timeEntries: [],
            activityLog: [{
                action: 'created_from_template',
                user: req.body.creator || 'system',
                details: `Created from template: "${template.templateName}"`,
                timestamp: new Date()
            }],
            ...req.body // Override with provided data
        };
        
        const task = new Task(taskData);
        const saved = await task.save();
        res.json(saved);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Get analytics/dashboard data
router.get('/analytics/dashboard', async (req, res) => {
    try {
        const { assignee, dateRange = 30 } = req.query;
        const dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - parseInt(dateRange));
        
        const filter = { archived: false };
        if (assignee) filter.assignee = assignee;
        
        const [
            totalTasks,
            completedTasks,
            overdueTasks,
            tasksByStatus,
            tasksByPriority,
            recentActivity
        ] = await Promise.all([
            Task.countDocuments(filter),
            Task.countDocuments({ ...filter, status: 'completed' }),
            Task.countDocuments({ 
                ...filter, 
                deadline: { $lt: new Date() }, 
                status: { $ne: 'completed' } 
            }),
            Task.aggregate([
                { $match: filter },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Task.aggregate([
                { $match: filter },
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),
            Task.find({ ...filter, lastActivity: { $gte: dateFilter } })
                .sort({ _id: -1 }) // Use _id instead of lastActivity
                .limit(10)
                .select('title status assignee lastActivity')
        ]);
        
        res.json({
            summary: {
                total: totalTasks,
                completed: completedTasks,
                pending: totalTasks - completedTasks,
                overdue: overdueTasks
            },
            distribution: {
                byStatus: tasksByStatus,
                byPriority: tasksByPriority
            },
            recentActivity
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
