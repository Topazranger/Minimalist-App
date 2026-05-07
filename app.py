from flask import Flask, render_template, request, redirect, url_for, jsonify
import sqlite3
from datetime import datetime

app = Flask(__name__)

def init_db():
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    # Create table with tags column
    c.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            due_date TEXT,
            tags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Check if due_date column exists (for existing databases)
    c.execute("PRAGMA table_info(tasks)")
    columns = [col[1] for col in c.fetchall()]
    if 'due_date' not in columns:
        c.execute('ALTER TABLE tasks ADD COLUMN due_date TEXT')
    if 'tags' not in columns:
        c.execute('ALTER TABLE tasks ADD COLUMN tags TEXT')
    
    conn.commit()
    conn.close()

@app.route('/')
def index():
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    c.execute('SELECT id, description, completed, due_date, tags FROM tasks ORDER BY completed ASC, created_at DESC')
    tasks = c.fetchall()
    conn.close()
    return render_template('index.html', tasks=tasks)

@app.route('/add', methods=['POST'])
def add_task():
    data = request.get_json()
    task = data.get('task', '').strip()
    
    if task:
        conn = sqlite3.connect('tasks.db')
        c = conn.cursor()
        c.execute('INSERT INTO tasks (description) VALUES (?)', (task,))
        conn.commit()
        
        task_id = c.lastrowid
        c.execute('SELECT id, description, completed, due_date, tags FROM tasks WHERE id = ?', (task_id,))
        new_task = c.fetchone()
        conn.close()
        
        return jsonify({
            'success': True,
            'task': {
                'id': new_task[0],
                'description': new_task[1],
                'completed': new_task[2],
                'due_date': new_task[3],
                'tags': new_task[4] if new_task[4] else None
            }
        })
    
    return jsonify({'success': False}), 400

@app.route('/toggle/<int:task_id>', methods=['POST'])
def toggle_task(task_id):
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    c.execute('SELECT completed FROM tasks WHERE id = ?', (task_id,))
    current = c.fetchone()
    
    if current:
        new_status = 0 if current[0] == 1 else 1
        c.execute('UPDATE tasks SET completed = ? WHERE id = ?', (new_status, task_id))
        conn.commit()
        
        c.execute('SELECT id, description, completed, due_date, tags FROM tasks WHERE id = ?', (task_id,))
        updated = c.fetchone()
        conn.close()
        
        return jsonify({
            'success': True,
            'task': {
                'id': updated[0],
                'description': updated[1],
                'completed': updated[2],
                'due_date': updated[3],
                'tags': updated[4]
            }
        })
    
    conn.close()
    return jsonify({'success': False}), 404

@app.route('/delete/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    c.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/update-due-date/<int:task_id>', methods=['POST'])
def update_due_date(task_id):
    data = request.get_json()
    due_date = data.get('due_date')
    
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    c.execute('UPDATE tasks SET due_date = ? WHERE id = ?', (due_date, task_id))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/update-tags/<int:task_id>', methods=['POST'])
def update_tags(task_id):
    data = request.get_json()
    tags = data.get('tags')
    
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    c.execute('UPDATE tasks SET tags = ? WHERE id = ?', (tags, task_id))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)