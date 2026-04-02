import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
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
    final tasks = (response as List).map((e) => TaskModel.fromJson(e)).toList();
    // Cache
    await OfflineStorage.saveTasks(response.cast<Map<String, dynamic>>());
    return tasks;
  } catch (e) {
    // Offline fallback
    final cached = OfflineStorage.getTasks();
    if (cached.isNotEmpty) return cached.map((e) => TaskModel.fromJson(e)).toList();
    rethrow;
  }
});

// Bugünkü TODO-lar
final todayTodosProvider = FutureProvider<List<TodoModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final response = await api.get(Endpoints.todoTasks);
    final todos = (response as List).map((e) => TodoModel.fromJson(e)).toList();
    // Cache
    await OfflineStorage.saveTodos(response.cast<Map<String, dynamic>>());
    return todos;
  } catch (e) {
    // Offline fallback
    final cached = OfflineStorage.getTodos();
    if (cached.isNotEmpty) return cached.map((e) => TodoModel.fromJson(e)).toList();
    rethrow;
  }
});

// View filter
enum HomeFilter { all, gorev, todo }
final homeFilterProvider = StateProvider<HomeFilter>((ref) => HomeFilter.all);
