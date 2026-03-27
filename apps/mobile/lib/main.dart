import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/theme.dart';
import 'app/router.dart';
import 'app/providers.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: WorkFlowProApp()));
}

class WorkFlowProApp extends ConsumerStatefulWidget {
  const WorkFlowProApp({super.key});

  @override
  ConsumerState<WorkFlowProApp> createState() => _WorkFlowProAppState();
}

class _WorkFlowProAppState extends ConsumerState<WorkFlowProApp> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(authStateProvider.notifier).checkAuth());
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'WorkFlow Pro',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}
