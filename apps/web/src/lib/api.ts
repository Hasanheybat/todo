const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  raw?: boolean // FormData göndərmək üçün — Content-Type header qoyma
}

class ApiClient {
  private accessToken: string | null = null
  private isRedirecting = false

  setToken(token: string | null) {
    this.accessToken = token
    if (token) {
      localStorage.setItem('accessToken', token)
    } else {
      localStorage.removeItem('accessToken')
    }
  }

  getToken(): string | null {
    if (this.accessToken) return this.accessToken
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken')
    }
    return this.accessToken
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, raw = false } = options
    const token = this.getToken()

    const config: RequestInit = {
      method,
      headers: {
        ...(raw ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    }

    if (body) {
      config.body = raw ? (body as any) : JSON.stringify(body)
    }

    const res = await fetch(`${API_URL}${endpoint}`, config)

    if (res.status === 401) {
      this.setToken(null)
      localStorage.removeItem('refreshToken')
      if (typeof window !== 'undefined' && !this.isRedirecting) {
        this.isRedirecting = true
        window.location.href = '/login'
      }
      throw new Error('Sessiya bitdi')
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Xəta baş verdi' }))
      const msg = error.message || 'Xəta baş verdi'
      if (process.env.NODE_ENV === 'development') console.warn(`[API] ${method} ${endpoint} → ${res.status}:`, msg)
      throw new Error(msg)
    }

    // 204 No Content
    if (res.status === 204) return {} as T

    return res.json()
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
  }

  async register(data: { fullName: string; email: string; password: string; companyName: string }) {
    return this.request<{ accessToken: string; refreshToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: data,
    })
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' })
    } finally {
      this.setToken(null)
      localStorage.removeItem('refreshToken')
    }
  }

  // Users
  async getUsers() {
    return this.request<any[]>('/users')
  }

  async getAssignableUsers() {
    return this.request<any[]>('/users/assignable')
  }

  async getUserHierarchy() {
    return this.request<any[]>('/users/hierarchy')
  }

  async createUser(data: any) {
    return this.request('/users', { method: 'POST', body: data })
  }

  async updateUser(id: string, data: any) {
    return this.request(`/users/${id}`, { method: 'PUT', body: data })
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, { method: 'DELETE' })
  }

  async getBusinesses() {
    return this.request<any[]>('/users/businesses')
  }

  async getUserDetail(id: string) {
    return this.request<any>(`/users/${id}`)
  }

  // Tasks
  async getTasks(filters?: { projectId?: string; labelId?: string }) {
    const params = new URLSearchParams()
    if (filters?.projectId) params.append('projectId', filters.projectId)
    if (filters?.labelId) params.append('labelId', filters.labelId)
    const qs = params.toString()
    return this.request<any[]>(`/tasks${qs ? '?' + qs : ''}`)
  }

  async createTask(data: any) {
    return this.request('/tasks', { method: 'POST', body: data })
  }

  async updateTask(id: string, data: any) {
    return this.request(`/tasks/${id}`, { method: 'PUT', body: data })
  }

  async completeTask(id: string) {
    return this.request(`/tasks/${id}/complete`, { method: 'POST' })
  }

  async approveTask(id: string) {
    return this.request(`/tasks/${id}/approve`, { method: 'POST' })
  }

  async rejectTask(id: string) {
    return this.request(`/tasks/${id}/reject`, { method: 'POST' })
  }

  async updateMyTaskStatus(taskId: string, status: string, note?: string) {
    return this.request(`/tasks/${taskId}/my-status`, { method: 'PATCH', body: { status, note } })
  }

  async closeTask(taskId: string) {
    return this.request(`/tasks/${taskId}/close`, { method: 'POST' })
  }

  async creatorApproveTask(taskId: string) {
    return this.request(`/tasks/${taskId}/creator-approve`, { method: 'PATCH' })
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' })
  }

  async finalizeTask(id: string) {
    return this.request(`/tasks/${id}/finalize`, { method: 'PATCH' })
  }

  // ── Todoist Modulu ──
  async getTodoistProjects() {
    return this.request<any[]>('/todoist/projects')
  }
  async createTodoistProject(data: any) {
    return this.request('/todoist/projects', { method: 'POST', body: data })
  }
  async updateTodoistProject(id: string, data: any) {
    return this.request(`/todoist/projects/${id}`, { method: 'PUT', body: data })
  }
  async deleteTodoistProject(id: string) {
    return this.request(`/todoist/projects/${id}`, { method: 'DELETE' })
  }
  async getTodoistSections(projectId: string) {
    return this.request<any[]>(`/todoist/projects/${projectId}/sections`)
  }
  async createTodoistSection(data: any) {
    return this.request('/todoist/sections', { method: 'POST', body: data })
  }
  async updateTodoistSection(id: string, data: any) {
    return this.request(`/todoist/sections/${id}`, { method: 'PUT', body: data })
  }
  async deleteTodoistSection(id: string) {
    return this.request(`/todoist/sections/${id}`, { method: 'DELETE' })
  }
  async getTodoistTasks(query?: Record<string, string>) {
    const params = query ? '?' + new URLSearchParams(query).toString() : ''
    return this.request<any[]>(`/todoist/tasks${params}`)
  }
  async getTodoistTaskById(taskId: string) {
    return this.request<any>(`/todoist/tasks/${taskId}`)
  }
  async searchTodoistTasks(q: string) {
    return this.request<any[]>(`/todoist/tasks/search?q=${encodeURIComponent(q)}`)
  }
  async getTodoistTasksToday() {
    return this.request<any[]>('/todoist/tasks/today')
  }
  async getTodoistTasksUpcoming() {
    return this.request<any[]>('/todoist/tasks/upcoming')
  }
  async createTodoistTask(data: any) {
    return this.request('/todoist/tasks', { method: 'POST', body: data })
  }
  async updateTodoistTask(id: string, data: any) {
    return this.request(`/todoist/tasks/${id}`, { method: 'PUT', body: data })
  }
  async completeTodoistTask(id: string) {
    return this.request(`/todoist/tasks/${id}/complete`, { method: 'POST' })
  }
  async uncompleteTodoistTask(id: string) {
    return this.request(`/todoist/tasks/${id}/uncomplete`, { method: 'POST' })
  }
  async deleteTodoistTask(id: string) {
    return this.request(`/todoist/tasks/${id}`, { method: 'DELETE' })
  }
  async getTodoistLabels() {
    return this.request<any[]>('/todoist/labels')
  }
  async createTodoistLabel(data: any) {
    return this.request('/todoist/labels', { method: 'POST', body: data })
  }
  async updateTodoistLabel(id: string, data: any) {
    return this.request(`/todoist/labels/${id}`, { method: 'PUT', body: data })
  }
  async deleteTodoistLabel(id: string) {
    return this.request(`/todoist/labels/${id}`, { method: 'DELETE' })
  }
  async getTodoistComments(taskId: string) {
    return this.request<any[]>(`/todoist/tasks/${taskId}/comments`)
  }
  async createTodoistComment(taskId: string, content: string) {
    return this.request(`/todoist/tasks/${taskId}/comments`, { method: 'POST', body: { content } })
  }
  async deleteTodoistComment(id: string) {
    return this.request(`/todoist/comments/${id}`, { method: 'DELETE' })
  }

  // Reorder
  async reorderTodoistTasks(items: { id: string; sortOrder: number; projectId?: string; sectionId?: string }[]) {
    return this.request('/todoist/tasks/reorder', { method: 'POST', body: { items } })
  }

  // Bulk
  async bulkTodoistAction(taskIds: string[], action: string, payload?: any) {
    return this.request('/todoist/tasks/bulk', { method: 'POST', body: { taskIds, action, payload } })
  }

  // Activities
  async getTodoistActivities(limit?: number) {
    return this.request<any[]>(`/todoist/activities${limit ? `?limit=${limit}` : ''}`)
  }

  // Templates
  async getTodoistTemplates() {
    return this.request<any[]>('/todoist/templates')
  }
  async createTodoistTemplate(data: { name: string; description?: string; tasks: string; color?: string }) {
    return this.request('/todoist/templates', { method: 'POST', body: data })
  }
  async useTodoistTemplate(id: string, projectName: string) {
    return this.request(`/todoist/templates/${id}/use`, { method: 'POST', body: { projectName } })
  }
  async deleteTodoistTemplate(id: string) {
    return this.request(`/todoist/templates/${id}`, { method: 'DELETE' })
  }

  // Todos
  async getTodos() {
    return this.request<any[]>('/todos')
  }

  async createTodo(data: any) {
    return this.request('/todos', { method: 'POST', body: data })
  }

  async updateTodo(id: string, data: any) {
    return this.request(`/todos/${id}`, { method: 'PUT', body: data })
  }

  async deleteTodo(id: string) {
    return this.request(`/todos/${id}`, { method: 'DELETE' })
  }

  // Roles
  async getRoles() {
    return this.request<any[]>('/roles')
  }

  async getPermissions() {
    return this.request<any[]>('/roles/permissions')
  }

  async createRole(data: any) {
    return this.request('/roles', { method: 'POST', body: data })
  }

  async updateRole(id: string, data: any) {
    return this.request(`/roles/${id}`, { method: 'PUT', body: data })
  }

  async deleteRole(id: string) {
    return this.request(`/roles/${id}`, { method: 'DELETE' })
  }

  // Templates
  async getTemplates() {
    return this.request<any[]>('/templates')
  }

  async createTemplate(data: any) {
    return this.request('/templates', { method: 'POST', body: data })
  }

  async updateTemplate(id: string, data: any) {
    return this.request(`/templates/${id}`, { method: 'PUT', body: data })
  }

  async deleteTemplate(id: string) {
    return this.request(`/templates/${id}`, { method: 'DELETE' })
  }

  async toggleTemplate(id: string) {
    return this.request(`/templates/${id}/toggle`, { method: 'POST' })
  }

  async executeTemplate(id: string) {
    return this.request<{ message: string; tasks: any[] }>(`/templates/${id}/execute`, { method: 'POST' })
  }

  // Task Assignee Files (İşçi dosya upload — 5 slot, 1.5MB)
  async uploadAssigneeFile(taskAssigneeId: string, slotNumber: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('taskAssigneeId', taskAssigneeId)
    formData.append('slotNumber', String(slotNumber))
    return this.request('/task-assignee-files/upload', { method: 'POST', body: formData, raw: true })
  }

  async getAssigneeFiles(taskAssigneeId: string) {
    return this.request<any[]>(`/task-assignee-files/${taskAssigneeId}`)
  }

  async getAssigneeFileHistory(taskAssigneeId: string) {
    return this.request<any[]>(`/task-assignee-files/${taskAssigneeId}/history`)
  }

  async deleteAssigneeFile(fileId: string) {
    return this.request(`/task-assignee-files/${fileId}`, { method: 'DELETE' })
  }

  // Attachments
  async uploadFile(file: File, taskId?: string, todoId?: string) {
    const formData = new FormData()
    formData.append('file', file)
    const token = this.getToken()
    const params = new URLSearchParams()
    if (taskId) params.set('taskId', taskId)
    if (todoId) params.set('todoId', todoId)
    const res = await fetch(`${API_URL}/attachments/upload?${params}`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    })
    if (!res.ok) throw new Error('Fayl yüklənmədi')
    return res.json()
  }

  async getTaskAttachments(taskId: string) {
    return this.request<any[]>(`/attachments/task/${taskId}`)
  }

  async deleteAttachment(id: string) {
    return this.request(`/attachments/${id}`, { method: 'DELETE' })
  }

  // Todoist Attachments
  async uploadTodoistAttachment(taskId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const token = this.getToken()
    const res = await fetch(`${API_URL}/todoist/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    })
    if (!res.ok) throw new Error('Fayl yüklənmədi')
    return res.json()
  }

  async getTodoistAttachments(taskId: string) {
    return this.request<any[]>(`/todoist/tasks/${taskId}/attachments`)
  }

  async deleteTodoistAttachment(id: string) {
    return this.request(`/todoist/attachments/${id}`, { method: 'DELETE' })
  }

  // Comments
  async getComments(taskId: string) {
    return this.request<any[]>(`/comments/task/${taskId}`)
  }

  async addComment(taskId: string, content: string) {
    return this.request('/comments', { method: 'POST', body: { taskId, content } })
  }

  async updateComment(id: string, content: string) {
    return this.request(`/comments/${id}`, { method: 'PUT', body: { content } })
  }

  async deleteComment(id: string) {
    return this.request(`/comments/${id}`, { method: 'DELETE' })
  }

  // Finance
  async getFinanceSummary() { return this.request<any>('/finance/summary') }
  async getCategories() { return this.request<any[]>('/finance/categories') }
  async createCategory(data: any) { return this.request('/finance/categories', { method: 'POST', body: data }) }
  async getTransactions(filters?: any) {
    const params = new URLSearchParams(filters || {}).toString()
    return this.request<any[]>(`/finance/transactions${params ? '?' + params : ''}`)
  }
  async createTransaction(data: any) { return this.request('/finance/transactions', { method: 'POST', body: data }) }
  async updateTransaction(id: string, data: any) { return this.request(`/finance/transactions/${id}`, { method: 'PUT', body: data }) }
  async deleteTransaction(id: string) { return this.request(`/finance/transactions/${id}`, { method: 'DELETE' }) }
  async deleteCategory(id: string) { return this.request(`/finance/categories/${id}`, { method: 'DELETE' }) }

  // İşçi bakiyəsi
  async getEmployeeLedger(userId?: string) {
    return this.request<any[]>(`/finance/employee-ledger${userId ? '?userId=' + userId : ''}`)
  }
  async getEmployeeBalances() { return this.request<any[]>('/finance/employee-balances') }
  async addEmployeeBalance(data: { userId: string; amount: number; category?: string; description?: string }) {
    return this.request('/finance/employee-ledger/add-balance', { method: 'POST', body: data })
  }
  async calculateSalaries(month?: number, year?: number) {
    return this.request('/finance/salary-calculate', { method: 'POST', body: { month, year } })
  }
  async paySalary(ledgerId: string) {
    return this.request(`/finance/salary-pay/${ledgerId}`, { method: 'POST' })
  }

  // Notifications
  async getNotifications() { return this.request<any[]>('/notifications') }
  async getUnreadCount() { return this.request<{ count: number }>('/notifications/unread-count') }
  async markNotificationRead(id: string) { return this.request(`/notifications/${id}/read`, { method: 'POST' }) }
  async markAllNotificationsRead() { return this.request('/notifications/read-all', { method: 'POST' }) }

  // Departments
  async getDepartments() { return this.request<any[]>('/departments') }
  async createDepartment(data: any) { return this.request('/departments', { method: 'POST', body: data }) }

  // ── Super Admin ──
  async superAdminLogin(email: string, password: string) {
    return this.request<any>('/admin/login', { method: 'POST', body: { email, password } })
  }
  async getAdminStats() { return this.request<any>('/admin/stats') }
  async getAdminTenants() { return this.request<any[]>('/admin/tenants') }
  async getAdminTenant(id: string) { return this.request<any>(`/admin/tenants/${id}`) }
  async createAdminTenant(data: any) { return this.request<any>('/admin/tenants', { method: 'POST', body: data }) }
  async updateAdminTenant(id: string, data: any) { return this.request<any>(`/admin/tenants/${id}`, { method: 'PUT', body: data }) }
  async toggleTenantStatus(id: string) { return this.request<any>(`/admin/tenants/${id}/status`, { method: 'PATCH' }) }
  async deleteAdminTenant(id: string) { return this.request<any>(`/admin/tenants/${id}`, { method: 'DELETE' }) }
  async getAdminLogs(action?: string) { return this.request<any[]>(`/admin/logs${action ? `?action=${action}` : ''}`) }
  async getAdminSettings() { return this.request<any>('/admin/settings') }
  async getAdminHealth() { return this.request<any>('/admin/health') }

  // Export
  async exportTasksExcel() {
    const token = this.accessToken || localStorage.getItem('accessToken')
    const res = await fetch(`${API_URL}/export/tasks`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('Export failed')
    return res.blob()
  }
  async exportFinanceExcel() {
    const token = this.accessToken || localStorage.getItem('accessToken')
    const res = await fetch(`${API_URL}/export/finance`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('Export failed')
    return res.blob()
  }

  // Activity Log
  async getActivityLog(filters?: { entityType?: string; userId?: string; limit?: number; offset?: number }) {
    const params = new URLSearchParams()
    if (filters?.entityType) params.set('entityType', filters.entityType)
    if (filters?.userId) params.set('userId', filters.userId)
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.offset) params.set('offset', String(filters.offset))
    const qs = params.toString()
    return this.request<{ items: any[]; total: number }>(`/activity${qs ? `?${qs}` : ''}`)
  }
  async getEntityActivity(entityType: string, entityId: string) {
    return this.request<any[]>(`/activity/entity/${entityType}/${entityId}`)
  }
}

export const api = new ApiClient()
export const API_BASE = API_URL
