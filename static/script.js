document.addEventListener('DOMContentLoaded', () => {
    
    // ==================== DOM Elements ====================
    const elements = {
        taskList: document.getElementById('taskList'),
        newTaskInput: document.getElementById('newTaskInput'),
        statsEl: document.getElementById('stats'),
        greeting: document.querySelector('.greeting-section'),
        filterBar: document.getElementById('filterBar'),
        filterTags: document.getElementById('filterTags'),
        todoPage: document.getElementById('todoPage'),
        calendarPage: document.getElementById('calendarPage'),
        todoNav: document.getElementById('todoNavBtn'),
        calendarNav: document.getElementById('calendarNavBtn'),
        calendarTitle: document.getElementById('calendarTitle'),
        calendarGrid: document.getElementById('calendarGrid'),
        prevMonth: document.getElementById('prevMonthBtn'),
        nextMonth: document.getElementById('nextMonthBtn'),
        todayBtn: document.getElementById('todayBtn'),
        dateModal: document.getElementById('datePickerModal'),
        dueDate: document.getElementById('dueDateInput'),
        dueTime: document.getElementById('dueTimeInput'),
        saveDate: document.querySelector('.save-date-btn'),
        cancelDate: document.querySelector('.cancel-date-btn'),
        removeDate: document.getElementById('removeDateBtn'),
        tagModal: document.getElementById('tagModal'),
        tagInput: document.getElementById('tagInput'),
        saveTags: document.querySelector('.save-tags-btn'),
        clearTags: document.querySelector('.clear-tags-btn'),
        cancelTags: document.querySelector('.cancel-tags-btn'),
        dayModal: document.getElementById('dayTasksModal'),
        dayTitle: document.getElementById('dayTasksDate'),
        dayList: document.getElementById('dayTasksList'),
        closeDay: document.getElementById('closeDayTasksBtn'),
        settingsIcon: document.getElementById('settingsIcon'),
        settingsModal: document.getElementById('settingsModal'),
        closeSettings: document.getElementById('closeSettingsBtn'),
        toggleTags: document.getElementById('toggleTags'),
        toggleDueDates: document.getElementById('toggleDueDates'),
        toggleCalendar: document.getElementById('toggleCalendar')
    };
    
    // ==================== State ====================
    let state = {
        currentTaskId: null,
        activeFilter: null,
        greetingDismissed: false,
        currentDate: new Date(),
        allTasks: [],
        modules: { tags: true, dueDates: true, calendar: true }
    };
    
    // ==================== Helpers ====================
    const saveModules = () => localStorage.setItem('simpleDone_modules', JSON.stringify(state.modules));
    
    const loadModules = () => {
        const saved = localStorage.getItem('simpleDone_modules');
        if (saved) {
            state.modules = JSON.parse(saved);
            elements.toggleTags.checked = state.modules.tags;
            elements.toggleDueDates.checked = state.modules.dueDates;
            elements.toggleCalendar.checked = state.modules.calendar;
        }
    };
    
    const api = async (url, options = {}) => {
        try {
            const res = await fetch(url, options);
            return await res.json();
        } catch (err) { return { success: false }; }
    };
    
    const escape = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    // ==================== UI Updates ====================
    const updateStats = () => {
        const visible = [...document.querySelectorAll('.task-item')].filter(i => i.style.display !== 'none');
        const total = visible.length;
        const completed = visible.filter(i => i.querySelector('.checkbox.checked')).length;
        elements.statsEl.textContent = total === 0 ? 'no tasks. add one above.' : `${total - completed} pending · ${completed} completed · ${total} total`;
        
        if (!state.greetingDismissed && document.querySelectorAll('.task-item').length) {
            state.greetingDismissed = true;
            elements.greeting.style.opacity = '0';
            elements.greeting.style.transform = 'translateY(-20px)';
            setTimeout(() => elements.greeting.style.display = 'none', 500);
        }
        
        loadTasksFromDOM();
        if (elements.calendarPage.classList.contains('active') && state.modules.calendar) renderCalendar();
    };
    
    const checkOverdue = () => {
        if (!state.modules.dueDates) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        document.querySelectorAll('.task-due-date').forEach(el => {
            const due = el.getAttribute('data-due')?.split(' ')[0];
            if (due) el.classList.toggle('overdue', new Date(due) < today);
        });
    };
    
    // ==================== Task Data ====================
    const loadTasksFromDOM = () => {
        state.allTasks = [];
        const uniqueTags = new Set();
        
        document.querySelectorAll('.task-item').forEach(item => {
            const tags = item.getAttribute('data-tags');
            if (tags && state.modules.tags) tags.split(',').forEach(t => uniqueTags.add(t.trim().toLowerCase()));
            state.allTasks.push({
                id: parseInt(item.dataset.id),
                description: item.querySelector('.task-text').innerText,
                completed: !!item.querySelector('.checkbox.checked'),
                due_date: item.dataset.dueDate || null,
                tags: tags
            });
        });
        
        if (state.modules.tags) updateFilterBar(uniqueTags);
    };
    
    const updateFilterBar = (tags) => {
        if (!state.modules.tags || tags.size === 0) {
            elements.filterBar.classList.remove('active');
            return;
        }
        elements.filterBar.classList.add('active');
        elements.filterTags.innerHTML = '';
        
        [...tags].sort().forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `filter-tag-btn ${tag}`;
            btn.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
            if (state.activeFilter === tag) btn.classList.add('active');
            btn.onclick = () => {
                if (state.activeFilter === tag) {
                    state.activeFilter = null;
                    document.querySelectorAll('.task-item').forEach(i => i.style.display = '');
                    document.querySelector('.no-results')?.remove();
                } else {
                    state.activeFilter = tag;
                    document.querySelectorAll('.task-item').forEach(i => {
                        const taskTags = i.dataset.tags;
                        const match = taskTags && taskTags.split(',').map(t => t.trim().toLowerCase()).includes(tag);
                        i.style.display = match ? '' : 'none';
                    });
                    const visible = [...document.querySelectorAll('.task-item')].filter(i => i.style.display !== 'none').length;
                    let msg = document.querySelector('.no-results');
                    if (!visible) {
                        if (!msg) msg = document.createElement('div');
                        msg.className = 'no-results';
                        msg.textContent = `✨ No tasks tagged with "${tag}". Add some tags to see them here! ✨`;
                        elements.taskList.parentNode.insertBefore(msg, elements.taskList.nextSibling);
                    } else if (msg) msg.remove();
                }
                updateStats();
                if (elements.calendarPage.classList.contains('active') && state.modules.calendar) renderCalendar();
            };
            elements.filterTags.appendChild(btn);
        });
    };
    
    // ==================== Add Task to DOM ====================
    const addTaskToDOM = (task) => {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.dataset.id = task.id;
        if (task.due_date) li.dataset.dueDate = task.due_date;
        if (task.tags && state.modules.tags) li.dataset.tags = task.tags;
        
        const tagsHtml = task.tags && state.modules.tags ? `<div class="task-tags">${task.tags.split(',').map(t => `<span class="tag ${t.trim().toLowerCase()}">${t.trim()}</span>`).join('')}</div>` : '';
        const dueHtml = task.due_date && state.modules.dueDates ? `<span class="task-due-date" data-due="${task.due_date}">📅 ${task.due_date}</span>` : '';
        
        li.innerHTML = `
            <div class="task-main">
                <div class="checkbox"></div>
                <span class="task-text" contenteditable="true">${escape(task.description)}</span>
                ${tagsHtml}
                ${dueHtml}
            </div>
            <div class="task-actions">
                ${state.modules.tags ? '<button class="tag-btn">🏷️ Tag</button>' : ''}
                ${state.modules.dueDates ? '<button class="due-date-btn">📅 Due</button>' : ''}
                <button class="delete-task">✕</button>
            </div>
        `;
        
        elements.taskList.appendChild(li);
        if (state.activeFilter && state.modules.tags) {
            const match = task.tags && task.tags.split(',').map(t => t.trim().toLowerCase()).includes(state.activeFilter);
            li.style.display = match ? '' : 'none';
        }
        updateStats();
        checkOverdue();
    };
    
    // ==================== Calendar ====================
    const renderCalendar = () => {
        if (!state.modules.calendar) return;
        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrev = new Date(year, month, 0).getDate();
        
        elements.calendarTitle.textContent = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
        elements.calendarGrid.innerHTML = '';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-weekday';
            header.textContent = day;
            elements.calendarGrid.appendChild(header);
        });
        
        for (let i = 0; i < firstDay; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day other-month';
            div.innerHTML = `<div class="day-number">${daysInPrev - firstDay + i + 1}</div>`;
            elements.calendarGrid.appendChild(div);
        }
        
        const today = new Date();
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            let tasks = state.allTasks.filter(t => t.due_date?.split(' ')[0] === dateStr);
            if (state.activeFilter && state.modules.tags) {
                tasks = tasks.filter(t => t.tags && t.tags.split(',').map(tg => tg.trim().toLowerCase()).includes(state.activeFilter));
            }
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            if (today.getMonth() === month && today.getFullYear() === year && d === today.getDate()) dayDiv.classList.add('today');
            dayDiv.innerHTML = `<div class="day-number">${d}</div>`;
            
            if (tasks.length) {
                const preview = document.createElement('div');
                preview.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin-top:4px';
                tasks.slice(0, 2).forEach(task => {
                    const badge = document.createElement('div');
                    badge.style.cssText = 'font-size:8px;padding:2px 4px;border-radius:8px;background:#e8f5e9;color:#2e7d32;overflow:hidden;text-overflow:ellipsis;max-width:60px';
                    badge.textContent = task.description.length > 8 ? task.description.slice(0, 6) + '..' : task.description;
                    preview.appendChild(badge);
                });
                if (tasks.length > 2) {
                    const more = document.createElement('div');
                    more.style.cssText = 'font-size:8px;padding:2px 4px;border-radius:8px;background:#f0f0f0;color:#666';
                    more.textContent = `+${tasks.length - 2}`;
                    preview.appendChild(more);
                }
                dayDiv.appendChild(preview);
            }
            
            dayDiv.onclick = () => openDayModal(dateStr, tasks);
            elements.calendarGrid.appendChild(dayDiv);
        }
        
        const remaining = 42 - (firstDay + daysInMonth);
        for (let i = 1; i <= remaining; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day other-month';
            div.innerHTML = `<div class="day-number">${i}</div>`;
            elements.calendarGrid.appendChild(div);
        }
    };
    
    const openDayModal = (dateStr, tasks) => {
        const [year, month, day] = dateStr.split('-');
        const formatted = new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        elements.dayTitle.textContent = state.activeFilter ? `Tasks due on ${formatted} (filtered by: ${state.activeFilter})` : `Tasks due on ${formatted}`;
        elements.dayList.innerHTML = tasks.length ? '' : '<div class="empty-day-message">✨ Nothing is due on this day. Enjoy! ✨</div>';
        
        tasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'day-task-item';
            const checkbox = document.createElement('div');
            checkbox.className = `day-task-checkbox${task.completed ? ' checked' : ''}`;
            const text = document.createElement('span');
            text.className = `day-task-text${task.completed ? ' completed' : ''}`;
            text.textContent = task.description;
            
            checkbox.onclick = async (e) => {
                e.stopPropagation();
                const data = await api(`/toggle/${task.id}`, { method: 'POST' });
                if (data.success) {
                    checkbox.classList.toggle('checked', data.task.completed === 1);
                    text.classList.toggle('completed', data.task.completed === 1);
                    updateStats();
                    if (state.modules.calendar) renderCalendar();
                }
            };
            text.onclick = () => {
                elements.dayModal.classList.remove('active');
                showTodoPage();
                const domTask = document.querySelector(`.task-item[data-id="${task.id}"]`);
                if (domTask) domTask.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
            
            item.append(checkbox, text);
            if (task.tags && state.modules.tags) {
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'day-task-tags';
                task.tags.split(',').forEach(tag => {
                    const span = document.createElement('span');
                    span.className = `day-task-tag ${tag.trim().toLowerCase()}`;
                    span.textContent = tag.trim();
                    tagsDiv.appendChild(span);
                });
                item.appendChild(tagsDiv);
            }
            elements.dayList.appendChild(item);
        });
        elements.dayModal.classList.add('active');
    };
    
    // ==================== Navigation ====================
    const showTodoPage = () => {
        elements.todoPage.classList.remove('hidden');
        elements.todoPage.style.display = 'block';
        elements.calendarPage.classList.remove('active');
        elements.calendarPage.style.display = 'none';
        elements.todoNav.classList.add('active');
        elements.calendarNav.classList.remove('active');
        updateStats();
    };
    
    const showCalendarPage = () => {
        if (!state.modules.calendar) return;
        elements.todoPage.classList.add('hidden');
        elements.todoPage.style.display = 'none';
        elements.calendarPage.classList.add('active');
        elements.calendarPage.style.display = 'block';
        elements.calendarNav.classList.add('active');
        elements.todoNav.classList.remove('active');
        loadTasksFromDOM();
        renderCalendar();
    };
    
    // ==================== Module Visibility ====================
    const applyModuleVisibility = () => {
        document.querySelectorAll('.task-tags, .tag-btn').forEach(el => el.style.display = state.modules.tags ? '' : 'none');
        document.querySelectorAll('.task-due-date, .due-date-btn').forEach(el => el.style.display = state.modules.dueDates ? '' : 'none');
        if (!state.modules.tags) {
            elements.filterBar.classList.remove('active');
            state.activeFilter = null;
        }
        if (!state.modules.calendar) {
            elements.calendarNav.style.display = 'none';
            if (elements.calendarPage.classList.contains('active')) showTodoPage();
        } else {
            elements.calendarNav.style.display = 'flex';
        }
        updateStats();
    };
    
    // ==================== Event Handlers ====================
    elements.taskList.addEventListener('click', async (e) => {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        const taskId = taskItem.dataset.id;
        
        if (e.target.classList.contains('checkbox')) {
            const data = await api(`/toggle/${taskId}`, { method: 'POST' });
            if (data.success) {
                const cb = taskItem.querySelector('.checkbox');
                const txt = taskItem.querySelector('.task-text');
                cb.classList.toggle('checked', data.task.completed === 1);
                txt.classList.toggle('completed', data.task.completed === 1);
                updateStats();
            }
        }
        else if (e.target.classList.contains('delete-task')) {
            const data = await api(`/delete/${taskId}`, { method: 'DELETE' });
            if (data.success) taskItem.remove();
            updateStats();
        }
        else if (e.target.classList.contains('due-date-btn') && state.modules.dueDates) {
            state.currentTaskId = taskId;
            elements.dueDate.value = '';
            elements.dueTime.value = '';
            const due = taskItem.dataset.dueDate;
            if (due) {
                const parts = due.split(' ');
                elements.dueDate.value = parts[0];
                elements.dueTime.value = parts[1] || '';
                elements.removeDate.style.display = 'block';
            } else {
                elements.removeDate.style.display = 'none';
            }
            elements.dateModal.classList.add('active');
        }
        else if (e.target.classList.contains('tag-btn') && state.modules.tags) {
            state.currentTaskId = taskId;
            elements.tagInput.value = taskItem.dataset.tags || '';
            elements.tagModal.classList.add('active');
        }
    });
    
    elements.newTaskInput.addEventListener('keypress', async (e) => {
        if (e.key !== 'Enter') return;
        const text = e.target.value.trim();
        if (!text) return;
        const data = await api('/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: text }) });
        if (data.success) addTaskToDOM(data.task);
        e.target.value = '';
    });
    
    elements.saveDate.onclick = async () => {
        if (!state.currentTaskId) return;
        const formatted = elements.dueDate.value + (elements.dueTime.value ? ' ' + elements.dueTime.value : '');
        if (await api(`/update-due-date/${state.currentTaskId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ due_date: formatted || null }) })) {
            const task = document.querySelector(`.task-item[data-id="${state.currentTaskId}"]`);
            const main = task.querySelector('.task-main');
            const existing = task.querySelector('.task-due-date');
            if (formatted && state.modules.dueDates) {
                if (existing) {
                    existing.setAttribute('data-due', formatted);
                    existing.innerHTML = `📅 ${formatted}`;
                } else {
                    const span = document.createElement('span');
                    span.className = 'task-due-date';
                    span.setAttribute('data-due', formatted);
                    span.innerHTML = `📅 ${formatted}`;
                    main.appendChild(span);
                }
                task.dataset.dueDate = formatted;
            } else if (existing) existing.remove();
            checkOverdue();
            updateStats();
        }
        elements.dateModal.classList.remove('active');
        state.currentTaskId = null;
    };
    
    elements.saveTags.onclick = async () => {
        if (!state.currentTaskId) return;
        let val = elements.tagInput.value.trim();
        val = val ? val.split(',').map(t => t.trim()).filter(t => t).join(',') : null;
        if (await api(`/update-tags/${state.currentTaskId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: val }) })) {
            const task = document.querySelector(`.task-item[data-id="${state.currentTaskId}"]`);
            const existing = task.querySelector('.task-tags');
            const text = task.querySelector('.task-text');
            if (val && state.modules.tags) {
                const html = `<div class="task-tags">${val.split(',').map(t => `<span class="tag ${t.trim().toLowerCase()}">${t.trim()}</span>`).join('')}</div>`;
                if (existing) existing.outerHTML = html;
                else text.insertAdjacentHTML('afterend', html);
                task.dataset.tags = val;
            } else if (existing) existing.remove();
            if (state.activeFilter && state.modules.tags) {
                const match = val && val.split(',').map(t => t.trim().toLowerCase()).includes(state.activeFilter);
                task.style.display = match ? '' : 'none';
            }
            updateStats();
        }
        elements.tagModal.classList.remove('active');
        state.currentTaskId = null;
    };
    
    // ==================== Settings ====================
    elements.settingsIcon.onclick = () => elements.settingsModal.classList.add('active');
    elements.closeSettings.onclick = () => elements.settingsModal.classList.remove('active');
    elements.settingsModal.onclick = (e) => { if (e.target === elements.settingsModal) elements.settingsModal.classList.remove('active'); };
    
    elements.toggleTags.onchange = () => { state.modules.tags = elements.toggleTags.checked; saveModules(); applyModuleVisibility(); location.reload(); };
    elements.toggleDueDates.onchange = () => { state.modules.dueDates = elements.toggleDueDates.checked; saveModules(); applyModuleVisibility(); location.reload(); };
    elements.toggleCalendar.onchange = () => { state.modules.calendar = elements.toggleCalendar.checked; saveModules(); applyModuleVisibility(); location.reload(); };
    
    // ==================== Modal Close Handlers ====================
    const closeModals = () => {
        elements.dateModal.classList.remove('active');
        elements.tagModal.classList.remove('active');
        elements.dayModal.classList.remove('active');
        state.currentTaskId = null;
    };
    elements.cancelDate.onclick = closeModals;
    elements.cancelTags.onclick = closeModals;
    elements.clearTags.onclick = async () => { if (state.currentTaskId) await api(`/update-tags/${state.currentTaskId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: null }) }); closeModals(); updateStats(); location.reload(); };
    elements.removeDate.onclick = async () => { if (state.currentTaskId) await api(`/update-due-date/${state.currentTaskId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ due_date: null }) }); closeModals(); updateStats(); };
    elements.closeDay.onclick = () => elements.dayModal.classList.remove('active');
    [elements.dateModal, elements.tagModal, elements.dayModal].forEach(modal => modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); }));
    
    document.querySelectorAll('.suggested-tag').forEach(tag => tag.addEventListener('click', () => elements.tagInput.value = elements.tagInput.value ? elements.tagInput.value + ', ' + tag.dataset.tag : tag.dataset.tag));
    
    // ==================== Navigation & Calendar ====================
    elements.todoNav.onclick = showTodoPage;
    elements.calendarNav.onclick = showCalendarPage;
    elements.prevMonth.onclick = () => { state.currentDate.setMonth(state.currentDate.getMonth() - 1); renderCalendar(); };
    elements.nextMonth.onclick = () => { state.currentDate.setMonth(state.currentDate.getMonth() + 1); renderCalendar(); };
    elements.todayBtn.onclick = () => { state.currentDate = new Date(); renderCalendar(); };
    
    // ==================== Init ====================
    loadModules();
    applyModuleVisibility();
    updateStats();
    checkOverdue();
    elements.newTaskInput.focus();
    loadTasksFromDOM();
});