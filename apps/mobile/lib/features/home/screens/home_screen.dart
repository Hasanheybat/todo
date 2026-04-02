import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../app/theme.dart';
import '../providers/home_provider.dart';
import '../widgets/task_list_item.dart';
import '../widgets/todo_list_item.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final tasksAsync = ref.watch(todayTasksProvider);
    final todosAsync = ref.watch(todayTodosProvider);
    final filter = ref.watch(homeFilterProvider);
    final colors = Theme.of(context).extension<AppColors>()!;
    final userName = auth.user?.fullName ?? 'İstifadəçi';
    final userInitial = userName.isNotEmpty ? userName[0].toUpperCase() : '?';
    final now = DateTime.now();
    final dateStr = 'Bugün, ${now.day} ${_monthName(now.month)}';

    final tasks = tasksAsync.valueOrNull ?? [];
    final todos = (todosAsync.valueOrNull ?? []).where((t) => !t.isCompleted).toList();
    final isLoading = tasksAsync.isLoading || todosAsync.isLoading;

    // Status sayları
    final pendingCount = tasks.where((t) => ['PENDING','CREATED'].contains(t.status)).length + todos.where((t) => t.todoStatus == 'WAITING').length;
    final progressCount = tasks.where((t) => t.status == 'IN_PROGRESS').length + todos.where((t) => t.todoStatus == 'IN_PROGRESS').length;
    final doneCount = tasks.where((t) => ['COMPLETED','APPROVED','FORCE_COMPLETED'].contains(t.status)).length + todos.where((t) => t.todoStatus == 'DONE').length;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F6FA),
      body: RefreshIndicator(
        onRefresh: () async { ref.invalidate(todayTasksProvider); ref.invalidate(todayTodosProvider); },
        color: const Color(0xFF4F46E5),
        child: CustomScrollView(
          slivers: [
            // ═══════ HEADER — Pinterest kimi ═══════
            SliverToBoxAdapter(
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  // Bənövşəyi fon
                  Container(
                    height: 140,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF7C7AE6), Color(0xFF6366F1)]),
                    ),
                  ),
                  // Ağ kart — üstə çıxır
                  SafeArea(
                    bottom: false,
                    child: Column(
                      children: [
                        // Top row
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                          child: Row(
                            children: [
                              // Avatar
                              Container(
                                width: 42, height: 42,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFF9F43),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Center(child: Text(userInitial, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white))),
                              ),
                              const SizedBox(width: 14),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(dateStr, style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.7))),
                                  const SizedBox(height: 2),
                                  const Text('Dashboard', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
                                ],
                              ),
                              const Spacer(),
                              Container(
                                width: 38, height: 38,
                                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                                child: const Icon(Icons.settings_outlined, color: Colors.white, size: 19),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),

                        // ═══ Ağ kart — tab + projects + labels + status ═══
                        Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(22),
                            boxShadow: [BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: 0.08), blurRadius: 20, offset: const Offset(0, 8))],
                          ),
                          child: Column(
                            children: [
                              // Tab: Hamısı / Görev / Todo
                              Container(
                                padding: const EdgeInsets.all(3),
                                decoration: BoxDecoration(color: const Color(0xFFF5F6FA), borderRadius: BorderRadius.circular(12)),
                                child: Row(
                                  children: HomeFilter.values.map((f) {
                                    final active = filter == f;
                                    final label = f == HomeFilter.all ? 'Hamısı' : f == HomeFilter.gorev ? 'Görev' : 'Todo';
                                    final icon = f == HomeFilter.all ? Icons.list_alt_rounded : f == HomeFilter.gorev ? Icons.assignment_rounded : Icons.check_circle_outline;
                                    return Expanded(
                                      child: GestureDetector(
                                        onTap: () => ref.read(homeFilterProvider.notifier).state = f,
                                        child: AnimatedContainer(
                                          duration: const Duration(milliseconds: 200),
                                          padding: const EdgeInsets.symmetric(vertical: 10),
                                          decoration: BoxDecoration(
                                            color: active ? Colors.white : Colors.transparent,
                                            borderRadius: BorderRadius.circular(10),
                                            boxShadow: active ? [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 6, offset: const Offset(0, 2))] : null,
                                          ),
                                          child: Column(
                                            children: [
                                              Icon(icon, size: 20, color: active ? const Color(0xFF4F46E5) : const Color(0xFFB0B5C8)),
                                              const SizedBox(height: 4),
                                              Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: active ? const Color(0xFF4F46E5) : const Color(0xFFB0B5C8))),
                                            ],
                                          ),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),

                              const SizedBox(height: 16),
                              // Divider
                              Container(height: 1, color: const Color(0xFFF1F3F8)),
                              const SizedBox(height: 14),

                              // Status bölməsi
                              Row(
                                children: [
                                  const Text('Status', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF3A3D5C))),
                                  const Spacer(),
                                  Icon(Icons.keyboard_arrow_down, size: 18, color: Colors.grey.shade400),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  _StatusChip(color: const Color(0xFFEF4444), label: 'Gözləyir', count: pendingCount),
                                  const SizedBox(width: 8),
                                  _StatusChip(color: const Color(0xFFF59E0B), label: 'Davam edir', count: progressCount),
                                  const SizedBox(width: 8),
                                  _StatusChip(color: const Color(0xFF10B981), label: 'Bitdi', count: doneCount),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ═══════ LOADING ═══════
            if (isLoading)
              const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.all(50), child: Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5), strokeWidth: 2.5)))),

            // ═══════ TAPŞIRIQ SİYAHISI ═══════
            if (!isLoading) ...[
              // GÖREV
              if ((filter == HomeFilter.all || filter == HomeFilter.gorev) && tasks.isNotEmpty) ...[
                _SectionHeader(icon: Icons.assignment_rounded, label: 'GÖREV', count: tasks.length, color: colors.gorevText, bg: colors.gorevBg),
                SliverList(delegate: SliverChildBuilderDelegate(
                  (ctx, i) => Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 3), child: TaskListItem(task: tasks[i], onTap: () => ctx.push('/tasks/${tasks[i].id}'))),
                  childCount: tasks.length,
                )),
              ],

              // TODO
              if ((filter == HomeFilter.all || filter == HomeFilter.todo) && todos.isNotEmpty) ...[
                _SectionHeader(icon: Icons.check_circle_rounded, label: 'TODO', count: todos.length, color: colors.todoText, bg: colors.todoBg),
                SliverList(delegate: SliverChildBuilderDelegate(
                  (ctx, i) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 3),
                    child: TodoListItem(
                      todo: todos[i],
                      onTap: () => ctx.push('/todos/${todos[i].id}'),
                      onComplete: () async { try { await ref.read(apiClientProvider).post('/todoist/tasks/${todos[i].id}/complete'); ref.invalidate(todayTodosProvider); } catch (_) {} },
                    ),
                  ),
                  childCount: todos.length,
                )),
              ],

              // Boş
              if (tasks.isEmpty && todos.isEmpty)
                SliverToBoxAdapter(child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 50, horizontal: 40),
                  child: Column(children: [
                    Container(width: 70, height: 70, decoration: BoxDecoration(color: const Color(0xFF4F46E5).withValues(alpha: 0.08), borderRadius: BorderRadius.circular(20)),
                      child: const Icon(Icons.check_rounded, size: 36, color: Color(0xFF4F46E5))),
                    const SizedBox(height: 16),
                    const Text('Hər şey bitdi! 🎉', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    const Text('Bugünə tapşırıq yoxdur', style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8))),
                  ]),
                )),
            ],

            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }

  String _monthName(int m) {
    const months = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    return months[m];
  }
}

// ── Status chip ──
class _StatusChip extends StatelessWidget {
  final Color color;
  final String label;
  final int count;
  const _StatusChip({required this.color, required this.label, required this.count});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
            const SizedBox(width: 6),
            Expanded(child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color), overflow: TextOverflow.ellipsis)),
            Text('$count', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: color)),
          ],
        ),
      ),
    );
  }
}

// ── Section header ──
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String label;
  final int count;
  final Color color;
  final Color bg;
  const _SectionHeader({required this.icon, required this.label, required this.count, required this.color, required this.bg});

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(22, 16, 22, 8),
        child: Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
            child: Row(children: [
              Icon(icon, size: 12, color: color),
              const SizedBox(width: 4),
              Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: color)),
            ]),
          ),
          const SizedBox(width: 8),
          Text('$count tapşırıq', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
        ]),
      ),
    );
  }
}
