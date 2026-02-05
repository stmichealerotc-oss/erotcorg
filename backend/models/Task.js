const mongoose = require('mongoose');

// Subtask schema
const subtaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    assignee: { type: String },
    dueDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

// Comment schema
const commentSchema = new mongoose.Schema({
    author: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date }
});

// Time tracking schema
const timeEntrySchema = new mongoose.Schema({
    user: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number }, // in minutes
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Enhanced task schema
const taskSchema = new mongoose.Schema({
    // Basic fields
    title: { type: String, required: true },
    description: { type: String },
    
    // Assignment and ownership
    assignee: { type: String },
    creator: { type: String, required: true },
    watchers: [{ type: String }], // Users watching this task
    
    // Status and priority
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['not-started', 'in-progress', 'completed', 'on-hold'], default: 'not-started' },
    
    // Dates and timing
    deadline: { type: Date },
    startDate: { type: Date },
    completedAt: { type: Date },
    estimatedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    
    // Progress and completion
    progress: { type: Number, default: 0, min: 0, max: 100 },
    
    // Organization
    tags: [{ type: String }],
    category: { type: String },
    project: { type: String },
    
    // Dependencies
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    
    // Rich content
    subtasks: [subtaskSchema],
    comments: [commentSchema],
    attachments: [{
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String }, // file type
        size: { type: Number }, // file size in bytes
        uploadedBy: { type: String },
        uploadedAt: { type: Date, default: Date.now }
    }],
    
    // Time tracking
    timeEntries: [timeEntrySchema],
    
    // Custom properties
    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    
    // Recurrence
    recurring: {
        enabled: { type: Boolean, default: false },
        pattern: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
        interval: { type: Number, default: 1 },
        endDate: { type: Date }
    },
    
    // Metadata
    archived: { type: Boolean, default: false },
    template: { type: Boolean, default: false },
    templateName: { type: String },
    
    // Activity tracking
    lastActivity: { type: Date, default: Date.now },
    activityLog: [{
        action: { type: String, required: true },
        user: { type: String, required: true },
        details: { type: String },
        timestamp: { type: Date, default: Date.now }
    }]
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    collection: 'tasks' // Force collection name
});

// Virtual for completion percentage based on subtasks
taskSchema.virtual('subtaskCompletion').get(function() {
    if (!this.subtasks || this.subtasks.length === 0) return 0;
    const completed = this.subtasks.filter(st => st.completed).length;
    return Math.round((completed / this.subtasks.length) * 100);
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
    if (!this.deadline || this.status === 'completed') return false;
    return new Date() > new Date(this.deadline);
});

// Virtual for total time spent
taskSchema.virtual('totalTimeSpent').get(function() {
    if (!this.timeEntries || this.timeEntries.length === 0) return 0;
    return this.timeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
});

// Middleware to update lastActivity
taskSchema.pre('save', function(next) {
    this.lastActivity = new Date();
    next();
});

// Index for better performance
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('Task', taskSchema);
