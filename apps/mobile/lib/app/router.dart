import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/providers/auth_provider.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/create/screens/create_task_screen.dart';
import '../features/create/screens/create_todo_screen.dart';
import '../features/home/screens/home_screen.dart';
import '../features/notifications/screens/notifications_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/tasks/screens/task_detail_screen.dart';
import '../features/tasks/screens/tasks_list_screen.dart';
import '../features/todos/screens/todo_detail_screen.dart';
import '../features/todos/screens/todos_list_screen.dart';
import '../shared/widgets/main_scaffold.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/home',
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isLoginRoute = state.matchedLocation == '/login';

      if (!isAuthenticated && !isLoginRoute) return '/login';
      if (isAuthenticated && isLoginRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainScaffold(child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomeScreen(),
            ),
          ),
          GoRoute(
            path: '/tasks',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: TasksListScreen(),
            ),
          ),
          GoRoute(
            path: '/todos',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: TodosListScreen(),
            ),
          ),
          GoRoute(
            path: '/notifications',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: NotificationsScreen(),
            ),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/tasks/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => TaskDetailScreen(
          taskId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/todos/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => TodoDetailScreen(
          todoId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/create/task',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const CreateTaskScreen(),
      ),
      GoRoute(
        path: '/create/todo',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const CreateTodoScreen(),
      ),
    ],
  );
});
