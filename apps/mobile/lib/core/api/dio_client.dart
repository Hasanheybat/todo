import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Web-də flutter_secure_storage problem yarada bilər.
/// Bu class həm web həm mobil üçün token saxlama təmin edir.
class TokenStorage {
  final FlutterSecureStorage _secure = const FlutterSecureStorage();
  final Map<String, String> _webFallback = {};

  Future<String?> read(String key) async {
    if (kIsWeb) return _webFallback[key];
    try {
      return await _secure.read(key: key);
    } catch (_) {
      return _webFallback[key];
    }
  }

  Future<void> write(String key, String value) async {
    _webFallback[key] = value;
    if (!kIsWeb) {
      try { await _secure.write(key: key, value: value); } catch (_) {}
    }
  }

  Future<void> delete(String key) async {
    _webFallback.remove(key);
    if (!kIsWeb) {
      try { await _secure.delete(key: key); } catch (_) {}
    }
  }
}

class DioClient {
  late final Dio dio;
  final _storage = TokenStorage();

  DioClient({required String baseUrl}) {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read('accessToken');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final refreshed = await _refreshToken();
          if (refreshed) {
            final token = await _storage.read('accessToken');
            error.requestOptions.headers['Authorization'] = 'Bearer $token';
            final response = await dio.fetch(error.requestOptions);
            return handler.resolve(response);
          }
        }
        return handler.next(error);
      },
    ));
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _storage.read('refreshToken');
      if (refreshToken == null) return false;

      final response = await Dio().post(
        '${dio.options.baseUrl}/auth/refresh',
        options: Options(headers: {'Authorization': 'Bearer $refreshToken'}),
      );

      if (response.statusCode == 200) {
        await _storage.write('accessToken', response.data['accessToken']);
        await _storage.write('refreshToken', response.data['refreshToken']);
        return true;
      }
    } catch (_) {}
    return false;
  }

  // Auth
  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await dio.post('/auth/login', data: {'email': email, 'password': password});
    final data = res.data as Map<String, dynamic>;
    await _storage.write('accessToken', data['accessToken']);
    await _storage.write('refreshToken', data['refreshToken']);
    return data;
  }

  Future<Map<String, dynamic>> getMe() async {
    final res = await dio.get('/auth/me');
    return res.data as Map<String, dynamic>;
  }

  Future<void> logout() async {
    try { await dio.post('/auth/logout'); } catch (_) {}
    await _storage.delete('accessToken');
    await _storage.delete('refreshToken');
  }

  // Todoist
  Future<List<dynamic>> getTodoistTasks({Map<String, dynamic>? query}) async {
    final res = await dio.get('/todoist/tasks', queryParameters: query);
    return res.data as List<dynamic>;
  }

  Future<List<dynamic>> getTodoistTasksToday() async {
    final res = await dio.get('/todoist/tasks/today');
    return res.data as List<dynamic>;
  }

  Future<List<dynamic>> getTodoistProjects() async {
    final res = await dio.get('/todoist/projects');
    return res.data as List<dynamic>;
  }

  Future<List<dynamic>> getTodoistLabels() async {
    final res = await dio.get('/todoist/labels');
    return res.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> createTodoistTask(Map<String, dynamic> data) async {
    final res = await dio.post('/todoist/tasks', data: data);
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateTodoistTask(String id, Map<String, dynamic> data) async {
    final res = await dio.put('/todoist/tasks/$id', data: data);
    return res.data as Map<String, dynamic>;
  }

  Future<void> completeTodoistTask(String id) async {
    await dio.post('/todoist/tasks/$id/complete');
  }

  Future<void> uncompleteTodoistTask(String id) async {
    await dio.post('/todoist/tasks/$id/uncomplete');
  }

  Future<void> deleteTodoistTask(String id) async {
    await dio.delete('/todoist/tasks/$id');
  }

  // GÖREV
  Future<List<dynamic>> getTasks() async {
    final res = await dio.get('/tasks');
    return res.data as List<dynamic>;
  }

  // Finance
  Future<Map<String, dynamic>> getFinanceSummary() async {
    final res = await dio.get('/finance/summary');
    return res.data as Map<String, dynamic>;
  }

  // Notifications
  Future<List<dynamic>> getNotifications() async {
    final res = await dio.get('/notifications');
    return res.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getUnreadCount() async {
    final res = await dio.get('/notifications/unread-count');
    return res.data as Map<String, dynamic>;
  }

  // Sync
  Future<Map<String, dynamic>> sync({String? syncToken, List<Map<String, dynamic>>? commands}) async {
    final res = await dio.post('/sync', data: {
      'sync_token': syncToken,
      'commands': commands ?? [],
    });
    return res.data as Map<String, dynamic>;
  }
}
