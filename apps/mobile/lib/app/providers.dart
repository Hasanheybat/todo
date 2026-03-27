import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api/dio_client.dart';

// API Client
final apiProvider = Provider<DioClient>((ref) {
  return DioClient(baseUrl: 'http://localhost:4000');
});

// Auth state
final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(apiProvider));
});

enum AuthStatus { initial, authenticated, unauthenticated, loading }

class AuthState {
  final AuthStatus status;
  final Map<String, dynamic>? user;
  final String? error;

  const AuthState({this.status = AuthStatus.initial, this.user, this.error});

  AuthState copyWith({AuthStatus? status, Map<String, dynamic>? user, String? error}) =>
      AuthState(status: status ?? this.status, user: user ?? this.user, error: error);
}

class AuthNotifier extends StateNotifier<AuthState> {
  final DioClient api;

  AuthNotifier(this.api) : super(const AuthState());

  Future<void> checkAuth() async {
    try {
      final user = await api.getMe();
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } catch (_) {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);
    try {
      await api.login(email, password);
      final user = await api.getMe();
      state = AuthState(status: AuthStatus.authenticated, user: user);
      return true;
    } catch (e) {
      state = AuthState(status: AuthStatus.unauthenticated, error: 'E-poçt və ya şifrə yanlışdır');
      return false;
    }
  }

  Future<void> logout() async {
    await api.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

// Today tasks
final todayTasksProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiProvider);
  return api.getTodoistTasksToday();
});

// GÖREV-lər
final gorevsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiProvider);
  return api.getTasks();
});

// Projects
final projectsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiProvider);
  return api.getTodoistProjects();
});

// Labels
final labelsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiProvider);
  return api.getTodoistLabels();
});

// Notifications unread count
final unreadCountProvider = FutureProvider<int>((ref) async {
  final api = ref.read(apiProvider);
  final data = await api.getUnreadCount();
  return data['count'] ?? 0;
});
