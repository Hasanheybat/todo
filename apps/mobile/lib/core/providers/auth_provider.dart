import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/endpoints.dart';
import '../models/user_model.dart';
import '../storage/token_storage.dart';

// API Client provider
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

// Auth state
@immutable
class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final UserModel? user;
  final String? error;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.error,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    UserModel? user,
    String? error,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      error: error,
    );
  }
}

// Auth notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;

  AuthNotifier(this._api) : super(const AuthState());

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _api.post(
        Endpoints.login,
        data: {'email': email, 'password': password},
      );
      await TokenStorage.saveTokens(
        accessToken: response['accessToken'],
        refreshToken: response['refreshToken'],
      );
      final user = UserModel.fromJson(response['user']);
      state = AuthState(isAuthenticated: true, user: user);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Giriş uğursuz oldu. Email və ya şifrə yanlışdır.',
      );
    }
  }

  Future<void> logout() async {
    try {
      await _api.post(Endpoints.logout);
    } catch (_) {}
    await TokenStorage.clearTokens();
    state = const AuthState();
  }

  Future<void> checkAuth() async {
    state = state.copyWith(isLoading: true);
    final hasTokens = await TokenStorage.hasTokens();
    if (!hasTokens) {
      state = const AuthState();
      return;
    }
    try {
      final response = await _api.get(Endpoints.me);
      final user = UserModel.fromJson(response);
      state = AuthState(isAuthenticated: true, user: user);
    } catch (e) {
      state = const AuthState();
    }
  }

  Future<void> refreshUser() async {
    try {
      final response = await _api.get(Endpoints.me);
      final user = UserModel.fromJson(response);
      state = state.copyWith(user: user);
    } catch (e) {
      debugPrint('Failed to refresh user: $e');
    }
  }
}

// Auth state provider
final authStateProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
      final api = ref.watch(apiClientProvider);
      return AuthNotifier(api);
    });
