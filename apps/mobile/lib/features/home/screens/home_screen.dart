import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../app/theme.dart';
import '../providers/home_provider.dart';
import '../widgets/task_list_item.dart';
import '../widgets/todo_list_item.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(authStateProvider.notifier).checkAuth());
  }

  Future<void> _refresh() async {
    ref.invalidate(todayTasksProvider);
    ref.invalidate(todayTodosProvider);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final tasksAsync = ref.watch(todayTasksProvider);
    final todosAsync = ref.watch(todayTodosProvider);
    final filter = ref.watch(homeFilterProvider);
    final colors = Theme.of(context).extension<AppColors>()!;
    final userName = authState.user?.fullName.split(' ').first ?? '';

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          color: Theme.of(context).colorScheme.primary,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Salam, $userName 👋', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Builder(builder: (_) {
                        final tc = tasksAsync.valueOrNull?.length ?? 0;
                        final dc = todosAsync.valueOrNull?.where((t) => !t.isCompleted).length ?? 0;
                        return Text('Bugün · ${tc + dc} tapşırıq', style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5)));
                      }),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                  child: Row(
                    children: HomeFilter.values.map((f) {
                      final active = filter == f;
                      final label = f == HomeFilter.all ? 'Hamısı' : f == HomeFilter.gorev ? 'GÖREV' : 'TODO';
                      final count = f == HomeFilter.all
                          ? (tasksAsync.valueOrNull?.length ?? 0) + (todosAsync.valueOrNull?.where((t) => !t.isCompleted).length ?? 0)
                          : f == HomeFilter.gorev ? (tasksAsync.valueOrNull?.length ?? 0) : (todosAsync.valueOrNull?.where((t) => !t.isCompleted).length ?? 0);
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => ref.read(homeFilterProvider.notifier).state = f,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                            decoration: BoxDecoration(
                              color: active ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(mainAxisSize: MainAxisSize.min, children: [
                              Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? Colors.white : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6))),
                              const SizedBox(width: 5),
                              Text('$count', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: active ? Colors.white.withValues(alpha: 0.8) : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4))),
                            ]),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              _buildList(context, ref, tasksAsync, todosAsync, filter, colors),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildList(BuildContext context, WidgetRef ref, AsyncValue tasksAsync, AsyncValue todosAsync, HomeFilter filter, AppColors colors) {
    if (tasksAsync.isLoading || todosAsync.isLoading) {
      return SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.all(40), child: Center(child: CircularProgressIndicator(color: Theme.of(context).colorScheme.primary))));
    }
    if (tasksAsync.hasError && todosAsync.hasError) {
      return SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.all(40), child: Column(children: [
        Icon(Icons.cloud_off, size: 48, color: Colors.grey.shade400),
        const SizedBox(height: 12),
        const Text('Məlumatlar yüklənə bilmədi', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        TextButton(onPressed: _refresh, child: const Text('Yenidən cəhd et')),
      ])));
    }

    final tasks = tasksAsync.valueOrNull ?? [];
    final todos = (todosAsync.valueOrNull ?? []).where((t) => !t.isCompleted).toList();
    final List<Widget> items = [];

    if (filter == HomeFilter.all || filter == HomeFilter.gorev) {
      for (final task in tasks) {
        items.add(TaskListItem(task: task, onTap: () => context.push('/tasks/${task.id}')));
      }
    }
    if (filter == HomeFilter.all || filter == HomeFilter.todo) {
      for (final todo in todos) {
        items.add(TodoListItem(
          todo: todo,
          onTap: () => context.push('/todos/${todo.id}'),
          onComplete: () async {
            try { await ref.read(apiClientProvider).post('/todoist/tasks/${todo.id}/complete'); ref.invalidate(todayTodosProvider); } catch (_) {}
          },
        ));
      }
    }

    if (items.isEmpty) {
      return SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.all(60), child: Column(children: [
        Icon(Icons.check_circle_outline, size: 56, color: colors.success.withValues(alpha: 0.4)),
        const SizedBox(height: 16),
        const Text('Tapşırıq yoxdur! 🎉', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        Text('Bugünə planlanmış tapşırıq yoxdur', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
      ])));
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) => Column(children: [
          items[index],
          if (index < items.length - 1) Divider(height: 1, indent: 20, endIndent: 20, color: Theme.of(context).dividerColor.withValues(alpha: 0.3)),
        ]),
        childCount: items.length,
      ),
    );
  }
}
