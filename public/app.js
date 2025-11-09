class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        await this.loadTodos();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Enter tuşu ile todo ekleme
        document.getElementById('todoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTodo();
            }
        });
    }

    async loadTodos() {
        try {
            const response = await fetch('/api/todos');
            if (!response.ok) throw new Error('Todolar yüklenemedi');
            
            this.todos = await response.json();
            this.renderTodos();
            this.updateStats();
        } catch (error) {
            this.showError('Todolar yüklenirken bir hata oluştu: ' + error.message);
        }
    }

    async addTodo() {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();

        if (!text) {
            this.showError('Lütfen bir todo girin');
            return;
        }

        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) throw new Error('Todo eklenemedi');

            input.value = '';
            await this.loadTodos();
        } catch (error) {
            this.showError('Todo eklenirken bir hata oluştu: ' + error.message);
        }
    }

    async toggleTodo(id, completed) {
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ completed }),
            });

            if (!response.ok) throw new Error('Todo güncellenemedi');

            await this.loadTodos();
        } catch (error) {
            this.showError('Todo güncellenirken bir hata oluştu: ' + error.message);
        }
    }

    async deleteTodo(id) {
        if (!confirm('Bu todo\'yu silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Todo silinemedi');

            await this.loadTodos();
        } catch (error) {
            this.showError('Todo silinirken bir hata oluştu: ' + error.message);
        }
    }

    filterTodos(filter) {
        this.currentFilter = filter;
        
        // Filter butonlarını güncelle
        document.querySelectorAll('.filters button').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.renderTodos();
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(todo => !todo.completed);
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            default:
                return this.todos;
        }
    }

    renderTodos() {
        const todoList = document.getElementById('todoList');
        const filteredTodos = this.getFilteredTodos();

        if (filteredTodos.length === 0) {
            const message = this.currentFilter === 'all' ? 'Henüz todo yok' :
                           this.currentFilter === 'active' ? 'Aktif todo yok' :
                           'Tamamlanmış todo yok';
            todoList.innerHTML = `<div class="loading">${message}</div>`;
            return;
        }

        todoList.innerHTML = filteredTodos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
                <input 
                    type="checkbox" 
                    class="todo-checkbox" 
                    ${todo.completed ? 'checked' : ''}
                    onchange="app.toggleTodo('${todo._id}', this.checked)"
                >
                <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                <span class="todo-source ${todo.source}">${todo.source}</span>
                <button class="delete-btn" onclick="app.deleteTodo('${todo._id}')">Sil</button>
            </div>
        `).join('');
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(todo => todo.completed).length;
        const active = total - completed;

        document.getElementById('totalCount').textContent = `Toplam: ${total}`;
        document.getElementById('activeCount').textContent = `Aktif: ${active}`;
        document.getElementById('completedCount').textContent = `Tamamlanan: ${completed}`;
    }

    showError(message) {
        // Mevcut hata mesajlarını temizle
        this.clearErrors();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        document.querySelector('.add-todo').after(errorDiv);
        
        // 5 saniye sonra hata mesajını kaldır
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    clearErrors() {
        document.querySelectorAll('.error').forEach(error => error.remove());
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Global fonksiyonlar
const app = new TodoApp();

function addTodo() {
    app.addTodo();
}

function filterTodos(filter) {
    app.filterTodos(filter);
}