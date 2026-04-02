import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/endpoints.dart';
import '../../../core/models/task_model.dart';
import '../../../core/models/todo_model.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/storage/offline_storage.dart';

// Bugünkü GÖREV-lər
final todayTasksProvider = FutureProvider<List<TaskModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final response = await api.get(Endpoints.tasks);
    final list = response is List ? response : [];
    final tasks = list.map((e) => TaskModel.fromJson(e as Map<String, dynamic>)).toList();
    // Cache
    try { await OfflineStorage.saveTasks(list.cast<Map<String, dynamic>>()); } catch (_) {}
    return tasks;
  } catch (e) {
    debugPrint('Tasks yüklənmədi: $e');
    // Offline fallback
    final cached = OfflineStorage.getTasks();
    if (cached.isNotEmpty) return cached.map((e) => TaskModel.fromJson(e)).toList();
    return [];
  }
});

// Bugünkü TODO-lar
final todayTodosProvider = FutureProvider<List<TodoModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final response = await api.get(Endpoints.todoTasks);
    final list = response is List ? response : [];
    final todos = list.map((e) => TodoModel.fromJson(e as Map<String, dynamic>)).toList();
    // Cache
    try { await OfflineStorage.saveTodos(list.cast<Map<String, dynamic>>()); } catch (_) {}
    return todos;
  } catch (e) {
    debugPrint('Todos yüklənmədi: $e');
    final cached = OfflineStorage.getTodos();
    if (cached.isNotEmpty) return cached.map((e) => TodoModel.fromJson(e)).toList();
    return [];
  }
});

// View filter
enum HomeFilter { all, gorev, todo }
final homeFilterProvider = StateProvider<HomeFilter>((ref) => HomeFilter.all);
