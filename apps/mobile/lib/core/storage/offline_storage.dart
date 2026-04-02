import 'package:hive_flutter/hive_flutter.dart';

class OfflineStorage {
  static const _tasksBox = 'tasks';
  static const _todosBox = 'todos';
  static const _notificationsBox = 'notifications';
  static const _pendingActionsBox = 'pending_actions';

  static late Box _tasks;
  static late Box _todos;
  static late Box _notifications;
  static late Box _pendingActions;

  static Future<void> init() async {
    _tasks = await Hive.openBox(_tasksBox);
    _todos = await Hive.openBox(_todosBox);
    _notifications = await Hive.openBox(_notificationsBox);
    _pendingActions = await Hive.openBox(_pendingActionsBox);
  }

  // Tasks
  static Future<void> saveTasks(List<Map<String, dynamic>> tasks) async {
    await _tasks.clear();
    for (var i = 0; i < tasks.length; i++) {
      await _tasks.put(i, tasks[i]);
    }
  }

  static List<Map<String, dynamic>> getTasks() {
    return _tasks.values
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  // Todos
  static Future<void> saveTodos(List<Map<String, dynamic>> todos) async {
    await _todos.clear();
    for (var i = 0; i < todos.length; i++) {
      await _todos.put(i, todos[i]);
    }
  }

  static List<Map<String, dynamic>> getTodos() {
    return _todos.values
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  // Notifications
  static Future<void> saveNotifications(
    List<Map<String, dynamic>> notifications,
  ) async {
    await _notifications.clear();
    for (var i = 0; i < notifications.length; i++) {
      await _notifications.put(i, notifications[i]);
    }
  }

  static List<Map<String, dynamic>> getNotifications() {
    return _notifications.values
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  // Pending Actions (offline queue)
  static Future<void> savePendingAction(Map<String, dynamic> action) async {
    await _pendingActions.add(action);
  }

  static List<Map<String, dynamic>> getPendingActions() {
    return _pendingActions.values
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  static Future<void> clearPendingActions() async {
    await _pendingActions.clear();
  }

  // Clear all
  static Future<void> clearAll() async {
    await Future.wait([
      _tasks.clear(),
      _todos.clear(),
      _notifications.clear(),
      _pendingActions.clear(),
    ]);
  }
}
