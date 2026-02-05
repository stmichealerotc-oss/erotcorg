(function () {
    class TaskManagementPage {
        constructor() {
            this.tasks = [];
            this.currentEditId = null;
            this.currentDetailTask = null;
            this.currentAttachments = [];
            this.currentSubtasks = [];
            this.filters = {
                category: '',
                assignee: '',
                priority: '',
                status: '',
                search: ''
            };
            this.sortField = 'title';
            this.sortDirection = 'asc';
            this.init();
        }

        async init() {
            console.log("🧪 Simple Task Management loaded at", new Date().toISOString());
            await this.loadTasks();
            this.setupEventListeners();
            this.renderTable();
        }

        setupEventListeners() {
            // Form submit
            const taskForm = document.getElementById("taskForm");
            if (taskForm) {
                taskForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    if (this.currentEditId) {
                        this.updateTask(this.currentEditId);
                    } else {
                        this.createTask();
                    }
                });
            }

            // Delete button
            const deleteBtn = document.getElementById("deleteTaskBtn");
            if (deleteBtn) {
                deleteBtn.addEventListener("click", () => {
                    if (this.currentEditId && confirm("Are you sure you want to delete this task?")) {
                        this.deleteTask(this.currentEditId);
                    }
                });
            }

            // Filters
            const categoryFilter = document.getElementById("filterCategory");
            const assigneeFilter = document.getElementById("filterAssignee");
            const priorityFilter = document.getElementById("filterPriority");
            const statusFilter = document.getElementById("filterStatus");
            const searchInput = document.getElementById("globalSearch");
            
            if (categoryFilter) categoryFilter.addEventListener("change", () => this.applyFilters());
            if (assigneeFilter) assigneeFilter.addEventListener("change", () => this.applyFilters());
            if (priorityFilter) priorityFilter.addEventListener("change", () => this.applyFilters());
            if (statusFilter) statusFilter.addEventListener("change", () => this.applyFilters());
            if (searchInput) {
                searchInput.addEventListener("input", (e) => {
                    this.filters.search = e.target.value;
                    this.applyFilters();
                });
            }

            // Modal close on background click
            const modal = document.getElementById("taskModal");
            if (modal) {
                modal.addEventListener("click", (e) => {
                    if (e.target === modal) this.closeModal();
                });
            }

            // Set minimum date for deadlines
            const today = new Date().toISOString().split('T')[0];
            const deadlineInput = document.getElementById("taskDeadline");
            if (deadlineInput) deadlineInput.min = today;

            // File attachments
            const attachmentInput = document.getElementById("taskAttachments");
            if (attachmentInput) {
                attachmentInput.addEventListener("change", (e) => this.handleFileAttachments(e));
            }

            // Select all checkbox
            const selectAllCheckbox = document.getElementById("selectAll");
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener("change", (e) => {
                    const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
                    checkboxes.forEach(cb => cb.checked = e.target.checked);
                });
            }
        }

        applyFilters() {
            // Update filter object
            const categoryFilter = document.getElementById("filterCategory");
            const assigneeFilter = document.getElementById("filterAssignee");
            const priorityFilter = document.getElementById("filterPriority");
            const statusFilter = document.getElementById("filterStatus");
            
            if (categoryFilter) this.filters.category = categoryFilter.value;
            if (assigneeFilter) this.filters.assignee = assigneeFilter.value;
            if (priorityFilter) this.filters.priority = priorityFilter.value;
            if (statusFilter) this.filters.status = statusFilter.value;
            
            this.renderTable();
        }

        getFilteredTasks() {
            return this.tasks.filter(task => {
                // Category filter
                if (this.filters.category && task.category !== this.filters.category) {
                    return false;
                }
                
                // Assignee filter
                if (this.filters.assignee && task.assignee !== this.filters.assignee) {
                    return false;
                }
                
                // Priority filter
                if (this.filters.priority && task.priority !== this.filters.priority) {
                    return false;
                }
                
                // Status filter
                if (this.filters.status && task.status !== this.filters.status) {
                    return false;
                }
                
                // Search filter
                if (this.filters.search) {
                    const searchTerm = this.filters.search.toLowerCase();
                    const searchableText = `${task.title} ${task.description} ${task.assignee} ${task.category}`.toLowerCase();
                    if (!searchableText.includes(searchTerm)) {
                        return false;
                    }
                }
                
                return true;
            });
        }

        sortBy(field) {
            if (this.sortField === field) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortField = field;
                this.sortDirection = 'asc';
            }
            this.renderTable();
        }

        getSortedTasks(tasks) {
            return tasks.sort((a, b) => {
                let aVal = a[this.sortField] || '';
                let bVal = b[this.sortField] || '';
                
                // Handle dates
                if (this.sortField === 'deadline') {
                    aVal = aVal ? new Date(aVal) : new Date('9999-12-31');
                    bVal = bVal ? new Date(bVal) : new Date('9999-12-31');
                }
                
                // Handle priority ordering
                if (this.sortField === 'priority') {
                    const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
                    aVal = priorityOrder[aVal] || 0;
                    bVal = priorityOrder[bVal] || 0;
                }
                
                if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        /** Load all tasks from backend */
        async loadTasks() {
            try {
                const response = await API.get("/tasks");
                if (response && response.tasks) {
                    this.tasks = response.tasks;
                } else if (Array.isArray(response)) {
                    this.tasks = response;
                } else {
                    console.warn("⚠️ Unexpected API response format:", response);
                    this.tasks = [];
                }
                this.updateStats();
            } catch (error) {
                console.error("❌ Failed to load tasks:", error);
                this.showNotification("Failed to load tasks", "error");
            }
        }

        /** Create a new task */
        async createTask() {
            try {
                const data = this.getFormData();
                console.log('🔍 Creating task with data:', data); // Debug log
                
                const newTask = await API.post("/tasks", {
                    ...data,
                    creator: 'current-user' // Replace with actual user
                });
                
                if (newTask && !newTask.error) {
                    this.tasks.push(newTask);
                    this.renderTable();
                    this.updateStats();
                    this.closeModal();
                    this.showNotification("✅ Task created successfully!");
                    
                    // Redirect to dashboard after successful task creation
                    setTimeout(() => {
                        if (window.dashboardApp) {
                            window.dashboardApp.loadPage('dashboard');
                        }
                    }, 1500);
                } else {
                    console.error('❌ Server returned error:', newTask);
                    this.showNotification("Failed to create task", "error");
                }
            } catch (error) {
                console.error("Error creating task:", error);
                this.showNotification("Failed to create task", "error");
            }
        }

        /** Update an existing task */
        async updateTask(taskId) {
            try {
                const data = this.getFormData();
                const updated = await API.put(`/tasks/${taskId}`, {
                    ...data,
                    updatedBy: 'current-user' // Replace with actual user
                });
                
                if (updated && !updated.error) {
                    const index = this.tasks.findIndex(t => t._id === taskId);
                    if (index !== -1) this.tasks[index] = updated;
                    this.renderTable();
                    this.updateStats();
                    this.closeModal();
                    this.showNotification("✅ Task updated successfully!");
                    
                    // Redirect to dashboard after successful task update
                    setTimeout(() => {
                        if (window.dashboardApp) {
                            window.dashboardApp.loadPage('dashboard');
                        }
                    }, 1500);
                } else {
                    this.showNotification("Failed to update task", "error");
                }
            } catch (error) {
                console.error("Error updating task:", error);
                this.showNotification("Failed to update task", "error");
            }
        }

        /** Delete a task */
        async deleteTask(taskId) {
            try {
                const result = await API.delete(`/tasks/${taskId}`);
                if (result?.success || result?._id) {
                    this.tasks = this.tasks.filter(t => t._id !== taskId);
                    this.renderTable();
                    this.updateStats();
                    this.closeModal();
                    this.showNotification("🗑️ Task deleted successfully!");
                } else {
                    this.showNotification("Failed to delete task", "error");
                }
            } catch (error) {
                console.error("Error deleting task:", error);
                this.showNotification("Failed to delete task", "error");
            }
        }

        /** Helper: Collect form data */
        getFormData() {
            const formData = {
                title: this.getFieldValue("taskTitle"),
                description: this.getFieldValue("taskDescription"),
                assignee: this.getFieldValue("taskAssignee"),
                category: this.getFieldValue("taskCategory"),
                priority: this.getFieldValue("taskPriority") || "medium",
                status: this.getFieldValue("taskStatus") || "not-started",
                deadline: this.getFieldValue("taskDeadline"),
                attachments: this.currentAttachments,
                subtasks: this.currentSubtasks
            };
            
            console.log('📋 Form data collected:', formData); // Debug log
            return formData;
        }

        getFieldValue(id) {
            const element = document.getElementById(id);
            return element ? element.value.trim() : "";
        }

        renderTable() {
            const filteredTasks = this.getFilteredTasks();
            const sortedTasks = this.getSortedTasks(filteredTasks);
            const tableBody = document.getElementById("taskTableBody");
            
            if (!tableBody) return;
            
            tableBody.innerHTML = "";
            
            if (sortedTasks.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="no-tasks">
                            <div class="no-tasks-message">
                                <i class="fas fa-tasks"></i>
                                <h3>No tasks found</h3>
                                <p>Create your first task or adjust your filters</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            sortedTasks.forEach(task => {
                const row = document.createElement("tr");
                row.className = "task-row";
                
                // Add double-click event to open task details
                row.addEventListener('dblclick', () => {
                    this.openTaskDetail(task._id);
                });
                
                const deadlineText = task.deadline ? 
                    this.formatDate(task.deadline) : 
                    '<span class="no-deadline">No deadline</span>';
                
                const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
                const deadlineClass = isOverdue ? 'overdue' : '';
                
                // Add attachment indicator
                const attachmentIndicator = task.attachments && task.attachments.length > 0 ? 
                    `<i class="fas fa-paperclip attachment-icon" title="${task.attachments.length} attachment(s)"></i>` : '';
                
                // Add comment indicator
                const commentIndicator = task.comments && task.comments.length > 0 ? 
                    `<i class="fas fa-comment comment-icon" title="${task.comments.length} comment(s)"></i>` : '';
                
                // Add subtask indicator
                const subtaskIndicator = task.subtasks && task.subtasks.length > 0 ? 
                    `<i class="fas fa-list-check subtask-icon" title="${this.getSubtaskProgress(task.subtasks)}"></i>` : '';
                
                row.innerHTML = `
                    <td class="col-select">
                        <input type="checkbox" data-task-id="${task._id}" onclick="event.stopPropagation()">
                    </td>
                    <td class="col-title">
                        <div class="task-title-cell">
                            <div class="title-row">
                                <strong>${this.escapeHtml(task.title)}</strong>
                                <div class="task-indicators">
                                    ${attachmentIndicator}
                                    ${commentIndicator}
                                    ${subtaskIndicator}
                                </div>
                            </div>
                            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</div>` : ''}
                        </div>
                    </td>
                    <td class="col-assignee">
                        <div class="assignee-cell">
                            ${task.assignee ? `
                                <div class="assignee-avatar">${task.assignee.charAt(0).toUpperCase()}</div>
                                <span>${this.getMemberName(task.assignee)}</span>
                            ` : '<span class="unassigned">Unassigned</span>'}
                        </div>
                    </td>
                    <td class="col-category">
                        ${task.category ? `<span class="category-badge">${this.escapeHtml(task.category)}</span>` : '<span class="no-category">-</span>'}
                    </td>
                    <td class="col-due ${deadlineClass}">
                        ${deadlineText}
                    </td>
                    <td class="col-priority">
                        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                    </td>
                    <td class="col-status">
                        <span class="status-badge status-${task.status}">${this.getStatusLabel(task.status)}</span>
                    </td>
                    <td class="col-actions">
                        <div class="action-buttons">
                            <button onclick="event.stopPropagation(); window.taskManager.openEditModal('${task._id}')" title="Edit Task" class="btn-action btn-edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="event.stopPropagation(); window.taskManager.deleteTask('${task._id}')" title="Delete Task" class="btn-action btn-delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
            
            // Update sort indicators
            this.updateSortIndicators();
        }

        updateSortIndicators() {
            // Remove all sort indicators
            document.querySelectorAll('.sortable i').forEach(icon => {
                icon.className = 'fas fa-sort';
            });
            
            // Add current sort indicator
            const currentSortHeader = document.querySelector(`[onclick="taskManager.sortBy('${this.sortField}')"] i`);
            if (currentSortHeader) {
                currentSortHeader.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'}`;
            }
        }

        formatDate(dateString) {
            const date = new Date(dateString);
            const today = new Date();
            const diffTime = date.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const formattedDate = date.toLocaleDateString();
            
            if (diffDays < 0) {
                return `<span class="overdue">${formattedDate} (${Math.abs(diffDays)} days overdue)</span>`;
            } else if (diffDays === 0) {
                return `<span class="due-today">${formattedDate} (Today)</span>`;
            } else if (diffDays <= 7) {
                return `<span class="due-soon">${formattedDate} (${diffDays} days)</span>`;
            } else {
                return formattedDate;
            }
        }

        getMemberName(assignee) {
            const memberNames = {
                'chairperson': 'Chairperson',
                'accountant': 'Accountant',
                'secretary': 'Secretary',
                'holder-of-goods': 'Holder of Goods',
                'community-coordinator': 'Community Coordinator'
            };
            return memberNames[assignee] || assignee;
        }

        getStatusLabel(status) {
            const statusLabels = {
                'not-started': 'Not Started',
                'in-progress': 'In Progress',
                'completed': 'Completed',
                'on-hold': 'On Hold'
            };
            return statusLabels[status] || status;
        }

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        /** Open modal for create/edit */
        openModal() {
            const modalTitle = document.getElementById("modalTitle");
            const taskForm = document.getElementById("taskForm");
            const deleteBtn = document.getElementById("deleteTaskBtn");
            const modal = document.getElementById("taskModal");
            
            if (modalTitle) modalTitle.textContent = "Add New Task";
            if (taskForm) taskForm.reset();
            if (deleteBtn) deleteBtn.style.display = "none";
            this.currentEditId = null;
            this.currentAttachments = [];
            this.currentSubtasks = [];
            this.renderAttachmentList();
            this.renderSubtasksList();
            if (modal) modal.style.display = "block";
        }

        openEditModal(taskId) {
            const task = this.tasks.find(t => t._id === taskId);
            if (!task) return;

            const modalTitle = document.getElementById("modalTitle");
            const deleteBtn = document.getElementById("deleteTaskBtn");
            const modal = document.getElementById("taskModal");

            if (modalTitle) modalTitle.textContent = "Edit Task";
            if (deleteBtn) deleteBtn.style.display = "inline-block";

            // Fill form fields
            this.setFieldValue("taskTitle", task.title || "");
            this.setFieldValue("taskDescription", task.description || "");
            this.setFieldValue("taskAssignee", task.assignee || "");
            this.setFieldValue("taskCategory", task.category || "");
            this.setFieldValue("taskPriority", task.priority || "medium");
            this.setFieldValue("taskStatus", task.status || "not-started");
            this.setFieldValue("taskDeadline", task.deadline ? task.deadline.split("T")[0] : "");

            // Set attachments and subtasks
            this.currentAttachments = task.attachments || [];
            this.currentSubtasks = task.subtasks || [];
            this.renderAttachmentList();
            this.renderSubtasksList();

            this.currentEditId = taskId;
            if (modal) modal.style.display = "block";
        }

        openTaskDetail(taskId) {
            const task = this.tasks.find(t => t._id === taskId);
            if (!task) return;

            this.currentDetailTask = task;
            const modal = document.getElementById("taskDetailModal");
            
            // Update task details
            document.getElementById("detailTaskTitle").textContent = task.title;
            document.getElementById("detailAssignee").textContent = this.getMemberName(task.assignee) || 'Unassigned';
            document.getElementById("detailCategory").textContent = task.category || '-';
            document.getElementById("detailPriority").innerHTML = `<span class="priority-badge priority-${task.priority}">${task.priority}</span>`;
            document.getElementById("detailStatus").innerHTML = `<span class="status-badge status-${task.status}">${this.getStatusLabel(task.status)}</span>`;
            document.getElementById("detailDeadline").textContent = task.deadline ? new Date(task.deadline).toLocaleDateString() : '-';
            document.getElementById("detailCreated").textContent = task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '-';
            document.getElementById("detailDescription").textContent = task.description || 'No description provided.';
            
            // Render attachments, subtasks, and comments
            this.renderDetailAttachments(task.attachments || []);
            this.renderDetailSubtasks(task.subtasks || []);
            this.renderComments(task.comments || []);
            
            if (modal) modal.style.display = "block";
        }

        editFromDetail() {
            if (this.currentDetailTask) {
                this.closeDetailModal();
                this.openEditModal(this.currentDetailTask._id);
            }
        }

        closeModal() {
            const modal = document.getElementById("taskModal");
            if (modal) modal.style.display = "none";
            this.currentEditId = null;
            this.currentAttachments = [];
            this.currentSubtasks = [];
        }

        closeDetailModal() {
            const modal = document.getElementById("taskDetailModal");
            if (modal) modal.style.display = "none";
            this.currentDetailTask = null;
        }

        // Subtask Management Methods
        addSubtask() {
            const subtaskInput = document.getElementById("newSubtask");
            const title = subtaskInput.value.trim();
            
            if (!title) return;
            
            const subtask = {
                title: title,
                completed: false,
                createdAt: new Date().toISOString()
            };
            
            this.currentSubtasks.push(subtask);
            this.renderSubtasksList();
            subtaskInput.value = '';
        }

        removeSubtask(index) {
            this.currentSubtasks.splice(index, 1);
            this.renderSubtasksList();
        }

        toggleSubtask(index) {
            if (this.currentSubtasks[index]) {
                this.currentSubtasks[index].completed = !this.currentSubtasks[index].completed;
                this.renderSubtasksList();
            }
        }

        renderSubtasksList() {
            const subtasksList = document.getElementById("subtasksList");
            if (!subtasksList) return;
            
            if (this.currentSubtasks.length === 0) {
                subtasksList.innerHTML = '<div class="no-subtasks">No action items added</div>';
                return;
            }
            
            subtasksList.innerHTML = this.currentSubtasks.map((subtask, index) => `
                <div class="subtask-item ${subtask.completed ? 'completed' : ''}">
                    <div class="subtask-content">
                        <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                               onchange="taskManager.toggleSubtask(${index})">
                        <span class="subtask-title">${this.escapeHtml(subtask.title)}</span>
                    </div>
                    <button type="button" class="btn-remove-subtask" onclick="taskManager.removeSubtask(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }

        renderDetailSubtasks(subtasks) {
            const detailSubtasks = document.getElementById("detailSubtasks");
            const subtaskProgress = document.getElementById("subtaskProgress");
            const subtaskProgressBar = document.getElementById("subtaskProgressBar");
            
            if (!detailSubtasks) return;
            
            if (!subtasks || subtasks.length === 0) {
                detailSubtasks.innerHTML = '<div class="no-subtasks">No action items</div>';
                subtaskProgress.textContent = '0 of 0 completed';
                subtaskProgressBar.style.width = '0%';
                return;
            }
            
            const completed = subtasks.filter(st => st.completed).length;
            const total = subtasks.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            subtaskProgress.textContent = `${completed} of ${total} completed`;
            subtaskProgressBar.style.width = `${percentage}%`;
            
            detailSubtasks.innerHTML = subtasks.map((subtask, index) => `
                <div class="subtask-item ${subtask.completed ? 'completed' : ''}">
                    <div class="subtask-content">
                        <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                               onchange="taskManager.toggleDetailSubtask(${index})">
                        <span class="subtask-title">${this.escapeHtml(subtask.title)}</span>
                    </div>
                    <div class="subtask-date">
                        ${subtask.completedAt ? 
                            `Completed: ${new Date(subtask.completedAt).toLocaleDateString()}` : 
                            `Added: ${new Date(subtask.createdAt).toLocaleDateString()}`
                        }
                    </div>
                </div>
            `).join('');
        }

        async toggleDetailSubtask(index) {
            if (!this.currentDetailTask || !this.currentDetailTask.subtasks[index]) return;
            
            const subtask = this.currentDetailTask.subtasks[index];
            const originalCompleted = subtask.completed;
            const originalCompletedAt = subtask.completedAt;
            
            // Update locally first for immediate feedback
            subtask.completed = !subtask.completed;
            subtask.completedAt = subtask.completed ? new Date().toISOString() : null;
            
            // Re-render immediately
            this.renderDetailSubtasks(this.currentDetailTask.subtasks);
            
            try {
                // Update on server - use the subtask's MongoDB _id if available, otherwise use index
                const subtaskId = subtask._id || index;
                const response = await API.put(`/tasks/${this.currentDetailTask._id}/subtasks/${subtaskId}`, {
                    completed: subtask.completed,
                    completedAt: subtask.completedAt,
                    updatedBy: 'current-user'
                });
                
                if (response && !response.error) {
                    // Update local task data
                    const taskIndex = this.tasks.findIndex(t => t._id === this.currentDetailTask._id);
                    if (taskIndex !== -1) {
                        this.tasks[taskIndex] = response;
                        this.currentDetailTask = response;
                    }
                    
                    // Re-render with server data
                    this.renderDetailSubtasks(response.subtasks || []);
                    this.renderTable();
                    
                    this.showNotification("Action item updated successfully!");
                } else {
                    // Revert on error
                    subtask.completed = originalCompleted;
                    subtask.completedAt = originalCompletedAt;
                    this.renderDetailSubtasks(this.currentDetailTask.subtasks);
                    this.showNotification("Failed to update action item", "error");
                }
            } catch (error) {
                console.error("Error updating subtask:", error);
                // Revert on error
                subtask.completed = originalCompleted;
                subtask.completedAt = originalCompletedAt;
                this.renderDetailSubtasks(this.currentDetailTask.subtasks);
                this.showNotification("Failed to update action item", "error");
            }
        }

        getSubtaskProgress(subtasks) {
            if (!subtasks || subtasks.length === 0) return 'No action items';
            const completed = subtasks.filter(st => st.completed).length;
            return `${completed}/${subtasks.length} completed`;
        }

        handleFileAttachments(event) {
            const files = Array.from(event.target.files);
            
            files.forEach(file => {
                // Create attachment object
                const attachment = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    file: file, // Store file for upload
                    url: URL.createObjectURL(file) // Create preview URL
                };
                
                this.currentAttachments.push(attachment);
            });
            
            this.renderAttachmentList();
            
            // Clear the input
            event.target.value = '';
        }

        renderAttachmentList() {
            const attachmentList = document.getElementById("attachmentList");
            if (!attachmentList) return;
            
            if (this.currentAttachments.length === 0) {
                attachmentList.innerHTML = '<div class="no-attachments">No files attached</div>';
                return;
            }
            
            attachmentList.innerHTML = this.currentAttachments.map((attachment, index) => `
                <div class="attachment-item">
                    <div class="attachment-info">
                        <i class="fas fa-${this.getFileIcon(attachment.type)}"></i>
                        <span class="attachment-name">${attachment.name}</span>
                        <span class="attachment-size">(${this.formatFileSize(attachment.size)})</span>
                    </div>
                    <button type="button" class="btn-remove-attachment" onclick="taskManager.removeAttachment(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }

        renderDetailAttachments(attachments) {
            const attachmentsGrid = document.getElementById("detailAttachments");
            if (!attachmentsGrid) return;
            
            if (!attachments || attachments.length === 0) {
                attachmentsGrid.innerHTML = '<div class="no-attachments">No attachments</div>';
                return;
            }
            
            attachmentsGrid.innerHTML = attachments.map(attachment => `
                <div class="attachment-card" onclick="taskManager.openAttachment('${attachment.url}')">
                    <div class="attachment-preview">
                        ${this.isImage(attachment.type) ? 
                            `<img src="${attachment.url}" alt="${attachment.name}">` :
                            `<i class="fas fa-${this.getFileIcon(attachment.type)}"></i>`
                        }
                    </div>
                    <div class="attachment-details">
                        <div class="attachment-name">${attachment.name}</div>
                        <div class="attachment-size">${this.formatFileSize(attachment.size)}</div>
                    </div>
                </div>
            `).join('');
        }

        renderComments(comments) {
            const commentsList = document.getElementById("commentsList");
            if (!commentsList) return;
            
            if (!comments || comments.length === 0) {
                commentsList.innerHTML = '<div class="no-comments">No comments yet</div>';
                return;
            }
            
            commentsList.innerHTML = comments.map(comment => `
                <div class="comment-item">
                    <div class="comment-header">
                        <div class="comment-author">
                            <div class="author-avatar">${comment.author.charAt(0).toUpperCase()}</div>
                            <span>${this.getMemberName(comment.author)}</span>
                        </div>
                        <div class="comment-date">${new Date(comment.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div class="comment-content">${this.escapeHtml(comment.content)}</div>
                </div>
            `).join('');
        }

        async addComment() {
            const commentInput = document.getElementById("newComment");
            const content = commentInput.value.trim();
            
            if (!content || !this.currentDetailTask) return;
            
            try {
                const response = await API.post(`/tasks/${this.currentDetailTask._id}/comments`, {
                    author: 'current-user', // Replace with actual user
                    content: content
                });
                
                if (response && !response.error) {
                    // Update the current task
                    const taskIndex = this.tasks.findIndex(t => t._id === this.currentDetailTask._id);
                    if (taskIndex !== -1) {
                        this.tasks[taskIndex] = response;
                        this.currentDetailTask = response;
                    }
                    
                    // Re-render comments
                    this.renderComments(response.comments || []);
                    
                    // Clear input
                    commentInput.value = '';
                    
                    // Update table to show comment indicator
                    this.renderTable();
                    
                    this.showNotification("Comment added successfully!");
                } else {
                    this.showNotification("Failed to add comment", "error");
                }
            } catch (error) {
                console.error("Error adding comment:", error);
                this.showNotification("Failed to add comment", "error");
            }
        }

        removeAttachment(index) {
            this.currentAttachments.splice(index, 1);
            this.renderAttachmentList();
        }

        openAttachment(url) {
            window.open(url, '_blank');
        }

        getFileIcon(mimeType) {
            if (!mimeType) return 'file';
            
            if (mimeType.startsWith('image/')) return 'image';
            if (mimeType.startsWith('video/')) return 'video';
            if (mimeType.startsWith('audio/')) return 'music';
            if (mimeType.includes('pdf')) return 'file-pdf';
            if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word';
            if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-excel';
            if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'file-powerpoint';
            
            return 'file';
        }

        isImage(mimeType) {
            return mimeType && mimeType.startsWith('image/');
        }

        setFieldValue(id, value) {
            const element = document.getElementById(id);
            if (element) element.value = value;
        }

        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        getFileIcon(mimeType) {
            if (!mimeType) return 'file';
            
            if (mimeType.startsWith('image/')) return 'image';
            if (mimeType.startsWith('video/')) return 'video';
            if (mimeType.startsWith('audio/')) return 'music';
            if (mimeType.includes('pdf')) return 'file-pdf';
            if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word';
            if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-excel';
            if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'file-powerpoint';
            
            return 'file';
        }

        isImage(mimeType) {
            return mimeType && mimeType.startsWith('image/');
        }

        /** Update dashboard stats */
        updateStats() {
            const total = this.tasks.length;
            const completed = this.tasks.filter(t => t.status === "completed").length;
            const pending = total - completed;
            
            const today = new Date();
            const overdue = this.tasks.filter(t => {
                if (t.status === "completed") return false;
                if (!t.deadline) return false;
                return new Date(t.deadline) < today;
            }).length;

            this.setElementText("totalTasks", total);
            this.setElementText("completedTasks", completed);
            this.setElementText("pendingTasks", pending);
            this.setElementText("overdueTasks", overdue);
        }

        showNotification(message, type = "success") {
            // Remove existing notifications
            document.querySelectorAll('.notification').forEach(n => n.remove());
            
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
                    <span>${message}</span>
                </div>
            `;
            
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#10b981' : '#ef4444'};
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }

        setElementText(id, value) {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        }

        /** Export tasks */
        exportTasks() {
            try {
                const filteredTasks = this.getFilteredTasks();
                const csvContent = this.convertToCSV(filteredTasks);
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `church-tasks-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                this.showNotification("📥 Tasks exported successfully!");
            } catch (error) {
                console.error("Export failed:", error);
                this.showNotification("❌ Export failed!", "error");
            }
        }

        convertToCSV(tasks) {
            const headers = ['Title', 'Assigned To', 'Category', 'Due Date', 'Priority', 'Status', 'Description'];
            const csvRows = [headers.join(',')];
            
            tasks.forEach(task => {
                const row = [
                    `"${task.title || ''}"`,
                    `"${this.getMemberName(task.assignee) || ''}"`,
                    `"${task.category || ''}"`,
                    `"${task.deadline ? new Date(task.deadline).toLocaleDateString() : ''}"`,
                    `"${task.priority || ''}"`,
                    `"${this.getStatusLabel(task.status) || ''}"`,
                    `"${task.description || ''}"`
                ];
                csvRows.push(row.join(','));
            });
            
            return csvRows.join('\n');
        }

        clearFilters() {
            const filters = ['filterCategory', 'filterAssignee', 'filterPriority', 'filterStatus'];
            filters.forEach(filterId => {
                const element = document.getElementById(filterId);
                if (element) element.value = '';
            });
            
            // Clear search
            const searchInput = document.getElementById("globalSearch");
            if (searchInput) searchInput.value = '';
            
            // Reset filters object
            this.filters = {
                category: '',
                assignee: '',
                priority: '',
                status: '',
                search: ''
            };
            
            this.renderTable();
        }

        removeAttachment(index) {
            this.currentAttachments.splice(index, 1);
            this.renderAttachmentList();
        }

        openAttachment(url) {
            window.open(url, '_blank');
        }
    }

    // ✅ Initialize when called from DashboardApp
    window.loadTaskmanagement = function () {
        window.taskPage = new TaskManagementPage();
        // Also create taskManager alias for HTML compatibility
        window.taskManager = window.taskPage;
    };
})();