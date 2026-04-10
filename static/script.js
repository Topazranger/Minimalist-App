document.addEventListener('DOMContentLoaded', function() {
    
    const taskList = document.getElementById('taskList');
    const newTaskInput = document.getElementById('newTaskInput');
    const statsEl = document.getElementById('stats');
    const greetingSection = document.querySelector('.greeting-section');
    
    // Date picker modal elements
    const modal = document.getElementById('datePickerModal');
    const dueDateInput = document.getElementById('dueDateInput');
    const dueTimeInput = document.getElementById('dueTimeInput');
    const saveDateBtn = document.querySelector('.save-date-btn');
    const cancelDateBtn = document.querySelector('.cancel-date-btn');
    const removeDateBtn = document.getElementById('removeDateBtn');
    
    let currentTaskId = null;
    let greetingDismissed = false;

    // Function to dismiss greeting smoothly
    function dismissGreeting() {
        if (greetingDismissed) return;
        
        const tasks = document.querySelectorAll('.task-item');
        if (tasks.length > 0 && greetingSection) {
            greetingDismissed = true;
            greetingSection.style.opacity = '0';
            greetingSection.style.transform = 'translateY(-20px)';
            greetingSection.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            setTimeout(() => {
                greetingSection.style.display = 'none';
            }, 500);
        }
    }

    function updateStats() {
        const tasks = document.querySelectorAll('.task-item');
        const total = tasks.length;
        const completed = document.querySelectorAll('.checkbox.checked').length;
        const pending = total - completed;
        
        if (total === 0) {
            statsEl.textContent = 'no tasks. add one above.';
        } else {
            statsEl.textContent = pending + ' pending · ' + completed + ' completed · ' + total + ' total';
        }
        
        // Dismiss greeting when first task appears
        dismissGreeting();
    }

    function checkOverdueDates() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        document.querySelectorAll('.task-due-date').forEach(el => {
            const dueDateStr = el.getAttribute('data-due');
            if (dueDateStr) {
                // Handle both date-only and date+time formats
                const datePart = dueDateStr.split(' ')[0];
                const dueDate = new Date(datePart);
                dueDate.setHours(0, 0, 0, 0);
                if (dueDate < today) {
                    el.classList.add('overdue');
                } else {
                    el.classList.remove('overdue');
                }
            }
        });
    }

    function formatDateTime(dateStr, timeStr) {
        if (!dateStr) return null;
        if (timeStr) {
            return dateStr + ' ' + timeStr;
        }
        return dateStr;
    }

    function addTaskToDOM(task) {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.setAttribute('data-id', task.id);
        if (task.due_date) {
            li.setAttribute('data-due-date', task.due_date);
        }
        
        li.innerHTML = `
            <div class="task-main">
                <div class="checkbox"></div>
                <span class="task-text" contenteditable="true">${escapeHtml(task.description)}</span>
                ${task.due_date ? `<span class="task-due-date" data-due="${task.due_date}">📅 ${task.due_date}</span>` : ''}
            </div>
            <div class="task-actions">
                <button class="due-date-btn">📅 Due</button>
                <button class="delete-task">✕</button>
            </div>
        `;
        
        taskList.appendChild(li);
        updateStats();
        checkOverdueDates();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function updateTaskDueDate(taskId, dueDate) {
        try {
            const response = await fetch('/update-due-date/' + taskId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ due_date: dueDate })
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Error updating due date:', error);
            return false;
        }
    }

    function openDatePicker(taskId, currentDueDate) {
        currentTaskId = taskId;
        
        // Reset inputs
        dueDateInput.value = '';
        dueTimeInput.value = '';
        
        if (currentDueDate) {
            // Parse existing due date (format: "YYYY-MM-DD" or "YYYY-MM-DD HH:MM")
            const parts = currentDueDate.split(' ');
            dueDateInput.value = parts[0];
            dueTimeInput.value = parts[1] || '';
            removeDateBtn.style.display = 'block';
        } else {
            removeDateBtn.style.display = 'none';
        }
        
        modal.classList.add('active');
    }

    function closeDatePicker() {
        modal.classList.remove('active');
        currentTaskId = null;
    }

    async function saveDueDate() {
        if (!currentTaskId) return;
        
        const dueDate = dueDateInput.value;
        const dueTime = dueTimeInput.value;
        const formattedDate = formatDateTime(dueDate, dueTime);
        
        const success = await updateTaskDueDate(currentTaskId, formattedDate);
        
        if (success) {
            // Update the DOM
            const taskItem = document.querySelector(`.task-item[data-id="${currentTaskId}"]`);
            const existingDueDateSpan = taskItem.querySelector('.task-due-date');
            const taskMain = taskItem.querySelector('.task-main');
            
            if (formattedDate) {
                if (existingDueDateSpan) {
                    existingDueDateSpan.setAttribute('data-due', formattedDate);
                    existingDueDateSpan.innerHTML = `📅 ${formattedDate}`;
                } else {
                    const newDueSpan = document.createElement('span');
                    newDueSpan.className = 'task-due-date';
                    newDueSpan.setAttribute('data-due', formattedDate);
                    newDueSpan.innerHTML = `📅 ${formattedDate}`;
                    taskMain.appendChild(newDueSpan);
                }
                taskItem.setAttribute('data-due-date', formattedDate);
            } else {
                if (existingDueDateSpan) {
                    existingDueDateSpan.remove();
                }
                taskItem.removeAttribute('data-due-date');
            }
            
            checkOverdueDates();
        }
        
        closeDatePicker();
    }

    async function removeDueDate() {
        if (!currentTaskId) return;
        
        const success = await updateTaskDueDate(currentTaskId, null);
        
        if (success) {
            const taskItem = document.querySelector(`.task-item[data-id="${currentTaskId}"]`);
            const existingDueDateSpan = taskItem.querySelector('.task-due-date');
            if (existingDueDateSpan) {
                existingDueDateSpan.remove();
            }
            taskItem.removeAttribute('data-due-date');
        }
        
        closeDatePicker();
    }

    // Event delegation
    taskList.addEventListener('click', async function(e) {
        const target = e.target;
        const taskItem = target.closest('.task-item');
        if (!taskItem) return;
        
        const taskId = taskItem.getAttribute('data-id');
        
        // Handle checkbox
        if (target.classList.contains('checkbox')) {
            try {
                const response = await fetch('/toggle/' + taskId, { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    const checkbox = taskItem.querySelector('.checkbox');
                    const taskText = taskItem.querySelector('.task-text');
                    
                    if (data.task.completed === 1) {
                        checkbox.classList.add('checked');
                        taskText.classList.add('completed');
                    } else {
                        checkbox.classList.remove('checked');
                        taskText.classList.remove('completed');
                    }
                    
                    updateStats();
                }
            } catch (error) {
                console.error('Error toggling task:', error);
            }
        }
        
        // Handle delete button
        if (target.classList.contains('delete-task')) {
            try {
                const response = await fetch('/delete/' + taskId, { method: 'DELETE' });
                const data = await response.json();
                
                if (data.success) {
                    taskItem.remove();
                    updateStats();
                }
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
        
        // Handle due date button
        if (target.classList.contains('due-date-btn')) {
            const currentDueDate = taskItem.getAttribute('data-due-date');
            openDatePicker(taskId, currentDueDate);
        }
    });

    // Handle edit on blur
    taskList.addEventListener('blur', async function(e) {
        const target = e.target;
        if (target.classList && target.classList.contains('task-text')) {
            const taskItem = target.closest('.task-item');
            const taskId = taskItem.getAttribute('data-id');
            const newText = target.innerText.trim();
            
            if (!newText) {
                try {
                    const response = await fetch('/delete/' + taskId, { method: 'DELETE' });
                    const data = await response.json();
                    if (data.success) {
                        taskItem.remove();
                        updateStats();
                    }
                } catch (error) {
                    console.error('Error deleting empty task:', error);
                }
            } else {
                // Optional: Send edit to backend if needed
                // You can add a PUT endpoint for this later
            }
        }
    }, true);

    // Add new task on Enter
    newTaskInput.addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            const taskText = this.value.trim();
            if (taskText) {
                try {
                    const response = await fetch('/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task: taskText })
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        addTaskToDOM(data.task);
                        this.value = '';
                    }
                } catch (error) {
                    console.error('Error adding task:', error);
                }
            }
        }
    });

    // Modal buttons
    saveDateBtn.addEventListener('click', saveDueDate);
    cancelDateBtn.addEventListener('click', closeDatePicker);
    removeDateBtn.addEventListener('click', removeDueDate);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeDatePicker();
        }
    });

    updateStats();
    checkOverdueDates();
    newTaskInput.focus();
});