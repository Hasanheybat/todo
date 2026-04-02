class Endpoints {
  // Auth
  static const login = '/auth/login';
  static const register = '/auth/register';
  static const me = '/auth/me';
  static const refresh = '/auth/refresh';
  static const logout = '/auth/logout';

  // Tasks (GOREV)
  static const tasks = '/tasks';
  static String taskById(String id) => '/tasks/$id';
  static String taskMyStatus(String id) => '/tasks/$id/my-status';
  static String taskApprove(String id) => '/tasks/$id/approve';
  static String taskReject(String id) => '/tasks/$id/reject';
  static String taskComplete(String id) => '/tasks/$id/complete';
  static String taskFinalize(String id) => '/tasks/$id/finalize';
  static String taskBulkNote(String id) => '/tasks/$id/bulk-note';
  static String taskWorkerNote(String id) => '/tasks/$id/worker-note';

  // Todoist (TODO)
  static const todoTasks = '/todoist/tasks';
  static const todoTasksToday = '/todoist/tasks/today';
  static const todoTasksUpcoming = '/todoist/tasks/upcoming';
  static String todoTaskById(String id) => '/todoist/tasks/$id';
  static String todoTaskComplete(String id) => '/todoist/tasks/$id/complete';
  static String todoTaskUncomplete(String id) => '/todoist/tasks/$id/uncomplete';

  // Projects
  static const todoProjects = '/todoist/projects';
  static String todoProjectSections(String id) =>
      '/todoist/projects/$id/sections';

  // Labels
  static const todoLabels = '/todoist/labels';

  // Comments
  static String taskComments(String taskId) => '/comments/task/$taskId';
  static const comments = '/comments';
  static String todoTaskComments(String taskId) =>
      '/todoist/tasks/$taskId/comments';

  // Attachments
  static const attachmentUpload = '/attachments/upload';
  static String taskAttachments(String taskId) => '/attachments/task/$taskId';
  static String todoAttachmentUpload(String taskId) =>
      '/todoist/tasks/$taskId/attachments';

  // Notifications
  static const notifications = '/notifications';
  static const notificationsUnread = '/notifications/unread-count';
  static String notificationRead(String id) => '/notifications/$id/read';
  static const notificationsReadAll = '/notifications/read-all';

  // Templates
  static const templates = '/templates';
  static String templateToggle(String id) => '/templates/$id/toggle';
  static String templateExecute(String id) => '/templates/$id/execute';

  // Users
  static const users = '/users';

  // Reorder
  static const todoReorder = '/todoist/tasks/reorder';
}
