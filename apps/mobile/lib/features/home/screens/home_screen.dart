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
  bool _showTable = false;

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final tasksAsync = ref.watch(todayTasksProvider);
    final todosAsync = ref.watch(todayTodosProvider);
    final filter = ref.watch(homeFilterProvider);
    final colors = Theme.of(context).extension<AppColors>()!;
    final userName = auth.user?.fullName ?? '';
    final userInitial = userName.isNotEmpty ? userName[0].toUpperCase() : '?';
    final now = DateTime.now();

    final tasks = tasksAsync.valueOrNull ?? [];
    final todos = (todosAsync.valueOrNull ?? []).where((t) => !t.isCompleted).toList();
    final isLoading = tasksAsync.isLoading || todosAsync.isLoading;

    // Status
    final pending = tasks.where((t) => ['PENDING','CREATED'].contains(t.status)).length + todos.where((t) => t.todoStatus == 'WAITING').length;
    final progress = tasks.where((t) => t.status == 'IN_PROGRESS').length + todos.where((t) => t.todoStatus == 'IN_PROGRESS').length;
    final done = tasks.where((t) => ['COMPLETED','APPROVED','FORCE_COMPLETED'].contains(t.status)).length + todos.where((t) => t.todoStatus == 'DONE').length;
    final cancelled = todos.where((t) => t.todoStatus == 'CANCELLED').length;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F6FA),
      body: RefreshIndicator(
        onRefresh: () async { ref.invalidate(todayTasksProvider); ref.invalidate(todayTodosProvider); },
        color: const Color(0xFF4F46E5),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ── Kompakt header ──
            SliverToBoxAdapter(child: Container(
              padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 10, 20, 14),
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [Color(0xFF7C7AE6), Color(0xFF6366F1)]),
                borderRadius: BorderRadius.only(bottomLeft: Radius.circular(24), bottomRight: Radius.circular(24)),
              ),
              child: Row(children: [
                Container(width: 36, height: 36, decoration: BoxDecoration(color: const Color(0xFFFF9F43), borderRadius: BorderRadius.circular(11)),
                  child: Center(child: Text(userInitial, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)))),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${now.day} ${_m(now.month)}, ${_wd(now.weekday)}', style: TextStyle(fontSize: 10, color: Colors.white.withValues(alpha: 0.6))),
                  Text('Bugün', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
                ])),
                Container(width: 34, height: 34, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.search, color: Colors.white, size: 18)),
                const SizedBox(width: 8),
                Container(width: 34, height: 34, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.tune, color: Colors.white, size: 18)),
              ]),
            )),

            // ── Status kartları ──
            SliverToBoxAdapter(child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
              child: Row(children: [
                _StatusCard(label: 'Gözləyir', count: pending, color: const Color(0xFF64748B)),
                const SizedBox(width: 8),
                _StatusCard(label: 'Davam edir', count: progress, color: const Color(0xFF3B82F6)),
                const SizedBox(width: 8),
                _StatusCard(label: 'Tamamlandı', count: done, color: const Color(0xFF10B981)),
                const SizedBox(width: 8),
                _StatusCard(label: 'İptal', count: cancelled, color: const Color(0xFFEF4444)),
              ]),
            )),

            // ── Filter tabs + görünüş toggle ──
            SliverToBoxAdapter(child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
              child: Row(children: [
                // Tabs
                ...HomeFilter.values.map((f) {
                  final active = filter == f;
                  final label = f == HomeFilter.all ? 'Hamısı' : f == HomeFilter.gorev ? 'Görev' : 'Todo';
                  final count = f == HomeFilter.all ? tasks.length + todos.length : f == HomeFilter.gorev ? tasks.length : todos.length;
                  return Padding(padding: const EdgeInsets.only(right: 6), child: GestureDetector(
                    onTap: () => ref.read(homeFilterProvider.notifier).state = f,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: active ? const Color(0xFF4F46E5) : Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: active ? null : Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: active ? Colors.white : const Color(0xFF64748B))),
                        const SizedBox(width: 4),
                        Text('$count', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: active ? Colors.white.withValues(alpha: 0.7) : const Color(0xFF94A3B8))),
                      ]),
                    ),
                  ));
                }),
                const Spacer(),
                // Siyahı / Cədvəl toggle
                if (filter == HomeFilter.all) ...[
                  GestureDetector(
                    onTap: () => setState(() => _showTable = false),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: !_showTable ? const Color(0xFF4F46E5) : Colors.white, borderRadius: BorderRadius.circular(8),
                        border: _showTable ? Border.all(color: const Color(0xFFE2E8F0)) : null),
                      child: Icon(Icons.view_list_rounded, size: 16, color: !_showTable ? Colors.white : const Color(0xFF94A3B8)),
                    ),
                  ),
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: () => setState(() => _showTable = true),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: _showTable ? const Color(0xFF4F46E5) : Colors.white, borderRadius: BorderRadius.circular(8),
                        border: !_showTable ? Border.all(color: const Color(0xFFE2E8F0)) : null),
                      child: Icon(Icons.table_chart_outlined, size: 16, color: _showTable ? Colors.white : const Color(0xFF94A3B8)),
                    ),
                  ),
                ],
              ]),
            )),

            // ── Loading ──
            if (isLoading)
              const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5), strokeWidth: 2.5)))),

            // ── Siyahı / Cədvəl ──
            if (!isLoading && filter == HomeFilter.all && _showTable) ...[
              // Cədvəl görünüşü
              SliverToBoxAdapter(child: _buildTable(tasks, todos, colors, context)),
            ],

            if (!isLoading && !(filter == HomeFilter.all && _showTable)) ...[
              // GÖREV
              if ((filter == HomeFilter.all || filter == HomeFilter.gorev) && tasks.isNotEmpty) ...[
                _Header(icon: Icons.assignment_rounded, label: 'GÖREV', count: tasks.length, color: colors.gorevText, bg: colors.gorevBg),
                SliverList(delegate: SliverChildBuilderDelegate(
                  (ctx, i) => Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 3), child: TaskListItem(task: tasks[i], onTap: () => ctx.push('/tasks/${tasks[i].id}'))),
                  childCount: tasks.length,
                )),
              ],
              // TODO
              if ((filter == HomeFilter.all || filter == HomeFilter.todo) && todos.isNotEmpty) ...[
                _Header(icon: Icons.check_circle_rounded, label: 'TODO', count: todos.length, color: colors.todoText, bg: colors.todoBg),
                SliverList(delegate: SliverChildBuilderDelegate(
                  (ctx, i) => Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 3), child: TodoListItem(
                    todo: todos[i], onTap: () => ctx.push('/todos/${todos[i].id}'),
                    onComplete: () async { try { await ref.read(apiClientProvider).post('/todoist/tasks/${todos[i].id}/complete'); ref.invalidate(todayTodosProvider); } catch (_) {} },
                  )),
                  childCount: todos.length,
                )),
              ],
              // Boş
              if (tasks.isEmpty && todos.isEmpty)
                SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.all(50), child: Column(children: [
                  Container(width: 60, height: 60, decoration: BoxDecoration(color: const Color(0xFF4F46E5).withValues(alpha: 0.08), borderRadius: BorderRadius.circular(18)),
                    child: const Icon(Icons.check_rounded, size: 32, color: Color(0xFF4F46E5))),
                  const SizedBox(height: 14),
                  const Text('Hər şey bitdi! 🎉', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  const Text('Bugünə tapşırıq yoxdur', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                ]))),
            ],

            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }

  Widget _buildTable(List tasks, List todos, AppColors colors, BuildContext context) {
    final all = [
      ...tasks.map((t) => {'type': 'GÖREV', 'title': t.title, 'status': t.status, 'priority': t.priority, 'date': t.dueDate, 'id': t.id, 'isTask': true}),
      ...todos.map((t) => {'type': 'TODO', 'title': t.content, 'status': t.todoStatus, 'priority': t.priority, 'date': t.dueDate, 'id': t.id, 'isTask': false}),
    ];
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
      child: Column(children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: const BoxDecoration(color: Color(0xFFF8FAFC), borderRadius: BorderRadius.only(topLeft: Radius.circular(14), topRight: Radius.circular(14))),
          child: Row(children: [
            SizedBox(width: 30, child: Text('#', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.grey.shade400), textAlign: TextAlign.center)),
            const SizedBox(width: 40, child: Text('NÖV', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF94A3B8)))),
            const Expanded(child: Text('AD', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF94A3B8)))),
            const SizedBox(width: 70, child: Text('STATUS', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF94A3B8)))),
          ]),
        ),
        // Rows
        ...all.asMap().entries.map((e) {
          final i = e.key;
          final r = e.value;
          final isGorev = r['isTask'] == true;
          return GestureDetector(
            onTap: () => isGorev ? context.push('/tasks/${r['id']}') : context.push('/todos/${r['id']}'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(color: i % 2 == 1 ? const Color(0xFFFAFBFC) : Colors.white, border: Border(bottom: BorderSide(color: const Color(0xFFF1F5F9)))),
              child: Row(children: [
                SizedBox(width: 30, child: Text('${i + 1}', style: TextStyle(fontSize: 10, color: Colors.grey.shade400), textAlign: TextAlign.center)),
                SizedBox(width: 40, child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(color: isGorev ? colors.gorevBg : colors.todoBg, borderRadius: BorderRadius.circular(3)),
                  child: Text(r['type'] as String, style: TextStyle(fontSize: 7, fontWeight: FontWeight.w800, color: isGorev ? colors.gorevText : colors.todoText), textAlign: TextAlign.center),
                )),
                const SizedBox(width: 6),
                Expanded(child: Text(r['title'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis)),
                SizedBox(width: 70, child: _statusBadge(r['status'] as String)),
              ]),
            ),
          );
        }),
      ]),
    );
  }

  Widget _statusBadge(String s) {
    Color c; String l;
    switch (s) {
      case 'PENDING': case 'CREATED': case 'WAITING': c = const Color(0xFF64748B); l = 'Gözləyir'; break;
      case 'IN_PROGRESS': c = const Color(0xFF3B82F6); l = 'Davam'; break;
      case 'COMPLETED': case 'APPROVED': case 'DONE': c = const Color(0xFF10B981); l = 'Bitdi'; break;
      case 'CANCELLED': case 'REJECTED': c = const Color(0xFFEF4444); l = 'İptal'; break;
      default: c = const Color(0xFF94A3B8); l = s;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 5, height: 5, decoration: BoxDecoration(shape: BoxShape.circle, color: c)),
        const SizedBox(width: 3),
        Text(l, style: TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: c)),
      ]),
    );
  }

  String _m(int m) => ['','Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'][m];
  String _wd(int d) => ['','B.e','Ç.a','Çər','C.a','Cü','Şə','Baz'][d];
}

class _StatusCard extends StatelessWidget {
  final String label; final int count; final Color color;
  const _StatusCard({required this.label, required this.count, required this.color});
  @override
  Widget build(BuildContext context) {
    return Expanded(child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6)]),
      child: Column(children: [
        Text('$count', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: color), textAlign: TextAlign.center, maxLines: 1),
      ]),
    ));
  }
}

class _Header extends StatelessWidget {
  final IconData icon; final String label; final int count; final Color color; final Color bg;
  const _Header({required this.icon, required this.label, required this.count, required this.color, required this.bg});
  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 6),
      child: Row(children: [
        Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(5)),
          child: Row(children: [Icon(icon, size: 11, color: color), const SizedBox(width: 3), Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: color))])),
        const SizedBox(width: 6),
        Text('$count', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
      ]),
    ));
  }
}
