import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/providers.dart';
import '../widgets/task_tile.dart';
import 'task_detail_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;
  int _todayTab = 0; // 0=TODO, 1=GÖREV
  final _quickAddController = TextEditingController();

  // Filtrlər
  String _filterPriority = '';
  String _filterStatus = '';
  String _filterBiz = '';
  String _filterTimeGroup = '';

  static const _colorMap = <String, Color>{
    'RED': Colors.red, 'BLUE': Colors.blue, 'GREEN': Colors.green,
    'ORANGE': Colors.orange, 'PURPLE': Colors.purple, 'TEAL': Colors.teal,
    'YELLOW': Colors.amber, 'GREY': Colors.grey,
  };
  Color _parseColor(String? c) {
    if (c == null) return Colors.grey;
    if (_colorMap.containsKey(c.toUpperCase())) return _colorMap[c.toUpperCase()]!;
    if (c.startsWith('#') && c.length >= 7) { try { return Color(int.parse(c.replaceAll('#', '0xFF'))); } catch (_) {} }
    return Colors.grey;
  }

  Color _priorityColor(String? p) {
    switch (p) {
      case 'P1': case 'CRITICAL': return Colors.red;
      case 'P2': case 'HIGH': return Colors.orange;
      case 'P3': case 'MEDIUM': return Colors.blue;
      default: return Colors.grey.shade400;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final userName = auth.user?['fullName'] ?? 'İstifadəçi';

    return Scaffold(
      appBar: AppBar(
        title: Text(_currentIndex == 0 ? 'Bu gün' : _currentIndex == 1 ? 'Gələnlər' : _currentIndex == 2 ? 'Layihələr' : 'Daha çox'),
        actions: [
          if (_currentIndex == 0)
            IconButton(
              icon: Icon(Icons.filter_list, color: (_filterPriority.isNotEmpty || _filterStatus.isNotEmpty || _filterBiz.isNotEmpty || _filterTimeGroup.isNotEmpty) ? Colors.orange : null),
              onPressed: () => _showFilterSheet(context),
            ),
          IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () {}),
          GestureDetector(
            onTap: () => _showProfileMenu(context),
            child: Container(
              margin: const EdgeInsets.only(right: 16),
              width: 32, height: 32,
              decoration: BoxDecoration(color: const Color(0xFFE8873A), borderRadius: BorderRadius.circular(8)),
              child: Center(child: Text(userName[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14))),
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _buildTodayTabWithGorev(),
          const Center(child: Text('Gələnlər — tezliklə')),
          _buildProjectsTab(),
          const Center(child: Text('Daha çox — tezliklə')),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showQuickAdd(context),
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.today_outlined), selectedIcon: Icon(Icons.today), label: 'Bu gün'),
          NavigationDestination(icon: Icon(Icons.calendar_month_outlined), selectedIcon: Icon(Icons.calendar_month), label: 'Gələnlər'),
          NavigationDestination(icon: Icon(Icons.folder_outlined), selectedIcon: Icon(Icons.folder), label: 'Layihələr'),
          NavigationDestination(icon: Icon(Icons.more_horiz), selectedIcon: Icon(Icons.more_horiz), label: 'Daha çox'),
        ],
      ),
    );
  }

  // ═══ BU GÜN — GÖREV + TODO tabları ═══
  Widget _buildTodayTabWithGorev() {
    final todayTasks = ref.watch(todayTasksProvider);
    final gorevs = ref.watch(gorevsProvider);

    return Column(
      children: [
        // Tab butonları
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          height: 32,
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              _tabButton('TODO', 0, todayTasks.whenOrNull(data: (d) => d.length)),
              _tabButton('GÖREV', 1, gorevs.whenOrNull(data: (d) => d.length)),
            ],
          ),
        ),

        // Aktiv filtr chip-ləri
        if (_filterPriority.isNotEmpty || _filterStatus.isNotEmpty || _filterBiz.isNotEmpty || _filterTimeGroup.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
            child: Wrap(
              spacing: 4,
              runSpacing: 4,
              children: [
                if (_filterTimeGroup.isNotEmpty) _filterChip('⏰ $_filterTimeGroup', () => setState(() => _filterTimeGroup = '')),
                if (_filterPriority.isNotEmpty) _filterChip('🎯 $_filterPriority', () => setState(() => _filterPriority = '')),
                if (_filterStatus.isNotEmpty) _filterChip('📋 $_filterStatus', () => setState(() => _filterStatus = '')),
                if (_filterBiz.isNotEmpty) _filterChip('🏢 $_filterBiz', () => setState(() => _filterBiz = '')),
                GestureDetector(
                  onTap: () => setState(() { _filterPriority = ''; _filterStatus = ''; _filterBiz = ''; _filterTimeGroup = ''; }),
                  child: Text('Təmizlə', style: TextStyle(fontSize: 11, color: Colors.orange.shade700, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),

        // Content
        Expanded(
          child: _todayTab == 0 ? _buildTodoList(todayTasks) : _buildGorevList(gorevs),
        ),
      ],
    );
  }

  Widget _tabButton(String label, int index, int? count) {
    final selected = _todayTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _todayTab = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: selected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
            boxShadow: selected ? [BoxShadow(color: Colors.black.withAlpha(15), blurRadius: 3, offset: const Offset(0, 1))] : null,
          ),
          margin: const EdgeInsets.all(2),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: selected ? Colors.orange.shade800 : Colors.grey.shade600)),
              if (count != null) ...[
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 0),
                  decoration: BoxDecoration(
                    color: selected ? Colors.orange.shade100 : Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('$count', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: selected ? Colors.orange.shade800 : Colors.grey.shade600)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _filterChip(String label, VoidCallback onRemove) {
    return Container(
      margin: const EdgeInsets.only(right: 6, bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.orange.shade200)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.orange.shade800)),
          const SizedBox(width: 4),
          GestureDetector(onTap: onRemove, child: Icon(Icons.close, size: 14, color: Colors.orange.shade600)),
        ],
      ),
    );
  }

  // ═══ TODO siyahısı ═══
  Widget _buildTodoList(AsyncValue<List<dynamic>> todayTasks) {
    return todayTasks.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.cloud_off, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text('Bağlantı xətası', style: TextStyle(color: Colors.grey.shade600)),
          const SizedBox(height: 8),
          ElevatedButton(onPressed: () => ref.invalidate(todayTasksProvider), child: const Text('Yenilə')),
        ],
      )),
      data: (tasks) {
        var filtered = tasks.toList();
        if (_filterPriority.isNotEmpty) filtered = filtered.where((t) => t['priority'] == _filterPriority).toList();

        if (filtered.isEmpty) {
          return Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.check_circle_outline, size: 64, color: Colors.grey.shade300),
              const SizedBox(height: 16),
              Text('Tapşırıq yoxdur', style: TextStyle(fontSize: 16, color: Colors.grey.shade500)),
            ],
          ));
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(todayTasksProvider),
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            itemCount: filtered.length,
            separatorBuilder: (_, __) => const SizedBox(height: 2),
            itemBuilder: (_, i) => TaskTile(
              task: filtered[i],
              onTap: () => _openTaskDetail(filtered[i]),
              onComplete: () async {
                final api = ref.read(apiProvider);
                await api.completeTodoistTask(filtered[i]['id']);
                ref.invalidate(todayTasksProvider);
              },
            ),
          ),
        );
      },
    );
  }

  // ═══ GÖREV siyahısı ═══
  Widget _buildGorevList(AsyncValue<List<dynamic>> gorevs) {
    return gorevs.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.cloud_off, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text('Bağlantı xətası', style: TextStyle(color: Colors.grey.shade600)),
          const SizedBox(height: 8),
          ElevatedButton(onPressed: () => ref.invalidate(gorevsProvider), child: const Text('Yenilə')),
        ],
      )),
      data: (tasks) {
        var filtered = tasks.toList();
        if (_filterPriority.isNotEmpty) filtered = filtered.where((t) => t['priority'] == _filterPriority).toList();
        if (_filterStatus.isNotEmpty) filtered = filtered.where((t) => t['status'] == _filterStatus).toList();

        if (filtered.isEmpty) {
          return Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.assignment_outlined, size: 64, color: Colors.grey.shade300),
              const SizedBox(height: 16),
              Text('Görev yoxdur', style: TextStyle(fontSize: 16, color: Colors.grey.shade500)),
            ],
          ));
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(gorevsProvider),
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            itemCount: filtered.length,
            separatorBuilder: (_, __) => const SizedBox(height: 4),
            itemBuilder: (_, i) => _gorevTile(filtered[i]),
          ),
        );
      },
    );
  }

  Widget _gorevTile(Map<String, dynamic> gorev) {
    final title = gorev['title'] as String? ?? '';
    final priority = gorev['priority'] as String?;
    final status = gorev['status'] as String? ?? 'OPEN';
    final subTasks = gorev['subTasks'] as List? ?? [];
    final dueDate = gorev['dueDate'] as String?;

    final statusColors = {
      'OPEN': Colors.blue, 'IN_PROGRESS': Colors.orange,
      'PENDING_APPROVAL': Colors.purple, 'COMPLETED': Colors.green,
      'APPROVED': Colors.green, 'REJECTED': Colors.red, 'FINALIZED': Colors.teal,
    };
    final statusLabels = {
      'OPEN': 'Açıq', 'IN_PROGRESS': 'Davam', 'PENDING_APPROVAL': 'Onay gözləyir',
      'COMPLETED': 'Tamamlandı', 'APPROVED': 'Onaylandı', 'REJECTED': 'Rədd', 'FINALIZED': 'Bitdi',
    };

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 4, offset: const Offset(0, 1))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 4, height: 20,
                decoration: BoxDecoration(color: _priorityColor(priority), borderRadius: BorderRadius.circular(2)),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600), maxLines: 2, overflow: TextOverflow.ellipsis)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: (statusColors[status] ?? Colors.grey).withAlpha(20),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(statusLabels[status] ?? status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColors[status] ?? Colors.grey)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              if (dueDate != null) ...[
                Icon(Icons.event, size: 12, color: Colors.grey.shade500),
                const SizedBox(width: 3),
                Text(dueDate.split('T')[0], style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                const SizedBox(width: 12),
              ],
              Icon(Icons.subdirectory_arrow_right, size: 12, color: Colors.grey.shade400),
              const SizedBox(width: 3),
              Text('${subTasks.length} alt-görev', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              const Spacer(),
              Text(priority ?? '', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _priorityColor(priority))),
            ],
          ),
        ],
      ),
    );
  }

  // ═══ Filtr Sheet — web-dəki kimi detallı ═══
  void _showFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setSheetState) => SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Filtr', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    GestureDetector(
                      onTap: () { setState(() { _filterPriority = ''; _filterStatus = ''; _filterBiz = ''; _filterTimeGroup = ''; }); setSheetState(() {}); },
                      child: Text('Hamısını təmizlə', style: TextStyle(fontSize: 13, color: Colors.orange.shade700, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Zaman qrupları
                const Text('⏰ Vaxt', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  _sheetFilterOption('🔴 Gecikmiş', 'overdue', _filterTimeGroup, (v) { setState(() => _filterTimeGroup = v); setSheetState(() {}); }, Colors.red),
                  _sheetFilterOption('🟠 Bugün', 'today', _filterTimeGroup, (v) { setState(() => _filterTimeGroup = v); setSheetState(() {}); }, Colors.orange),
                  _sheetFilterOption('🟡 3 gün', '3days', _filterTimeGroup, (v) { setState(() => _filterTimeGroup = v); setSheetState(() {}); }, Colors.amber),
                  _sheetFilterOption('🔵 5 gün', '5days', _filterTimeGroup, (v) { setState(() => _filterTimeGroup = v); setSheetState(() {}); }, Colors.blue),
                  _sheetFilterOption('🟣 1 həftə', '1week', _filterTimeGroup, (v) { setState(() => _filterTimeGroup = v); setSheetState(() {}); }, Colors.purple),
                  _sheetFilterOption('⬜ Uzun', 'long', _filterTimeGroup, (v) { setState(() => _filterTimeGroup = v); setSheetState(() {}); }, Colors.grey),
                ]),
                const SizedBox(height: 16),

                // Prioritet
                const Text('🎯 Prioritet', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  _sheetFilterOption('Kritik', _todayTab == 0 ? 'P1' : 'CRITICAL', _filterPriority, (v) { setState(() => _filterPriority = v); setSheetState(() {}); }, Colors.red),
                  _sheetFilterOption('Yüksək', _todayTab == 0 ? 'P2' : 'HIGH', _filterPriority, (v) { setState(() => _filterPriority = v); setSheetState(() {}); }, Colors.orange),
                  _sheetFilterOption('Orta', _todayTab == 0 ? 'P3' : 'MEDIUM', _filterPriority, (v) { setState(() => _filterPriority = v); setSheetState(() {}); }, Colors.blue),
                  _sheetFilterOption('Aşağı', _todayTab == 0 ? 'P4' : 'LOW', _filterPriority, (v) { setState(() => _filterPriority = v); setSheetState(() {}); }, Colors.grey),
                ]),

                // Status (yalnız GÖREV tabında)
                if (_todayTab == 1) ...[
                  const SizedBox(height: 16),
                  const Text('📋 Status', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Wrap(spacing: 6, runSpacing: 6, children: [
                    _sheetFilterOption('Açıq', 'OPEN', _filterStatus, (v) { setState(() => _filterStatus = v); setSheetState(() {}); }, Colors.blue),
                    _sheetFilterOption('Davam edir', 'IN_PROGRESS', _filterStatus, (v) { setState(() => _filterStatus = v); setSheetState(() {}); }, Colors.orange),
                    _sheetFilterOption('Onay gözləyir', 'PENDING_APPROVAL', _filterStatus, (v) { setState(() => _filterStatus = v); setSheetState(() {}); }, Colors.purple),
                    _sheetFilterOption('Tamamlandı', 'COMPLETED', _filterStatus, (v) { setState(() => _filterStatus = v); setSheetState(() {}); }, Colors.green),
                    _sheetFilterOption('Onaylandı', 'APPROVED', _filterStatus, (v) { setState(() => _filterStatus = v); setSheetState(() {}); }, Colors.green.shade700),
                    _sheetFilterOption('Rədd', 'REJECTED', _filterStatus, (v) { setState(() => _filterStatus = v); setSheetState(() {}); }, Colors.red),
                  ]),
                ],

                // Filial
                const SizedBox(height: 16),
                const Text('🏢 Filial', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  _sheetFilterOption('Bakı', 'Baki Filiali', _filterBiz, (v) { setState(() => _filterBiz = v); setSheetState(() {}); }, Colors.teal),
                  _sheetFilterOption('Sumqayıt', 'Sumqayit Filiali', _filterBiz, (v) { setState(() => _filterBiz = v); setSheetState(() {}); }, Colors.indigo),
                  _sheetFilterOption('Gəncə', 'Gence Filiali', _filterBiz, (v) { setState(() => _filterBiz = v); setSheetState(() {}); }, Colors.brown),
                ]),

                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange.shade600,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Tətbiq et', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _sheetFilterOption(String label, String value, String current, Function(String) onTap, Color color) {
    final selected = current == value;
    return GestureDetector(
      onTap: () => onTap(selected ? '' : value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: selected ? color.withAlpha(25) : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? color : Colors.grey.shade200, width: selected ? 1.5 : 1),
        ),
        child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: selected ? color : Colors.grey.shade600)),
      ),
    );
  }

  void _openTaskDetail(Map<String, dynamic> task) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      enableDrag: true,
      isDismissible: true,
      builder: (_) => GestureDetector(
        onTap: () => Navigator.pop(context),
        behavior: HitTestBehavior.opaque,
        child: GestureDetector(
          onTap: () {},
          child: DraggableScrollableSheet(
            initialChildSize: 0.85,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            builder: (_, controller) => Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: TaskDetailScreen(task: task, scrollController: controller),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProjectsTab() {
    final projects = ref.watch(projectsProvider);
    return projects.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Xəta: $e')),
      data: (projs) => ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: projs.length,
        itemBuilder: (_, i) {
          final p = projs[i];
          return Card(
            child: ListTile(
              leading: Container(width: 12, height: 12, decoration: BoxDecoration(shape: BoxShape.circle, color: _parseColor(p['color'] as String?))),
              title: Text(p['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
              trailing: Text('${p['_count']?['tasks'] ?? 0}', style: TextStyle(color: Colors.grey.shade500)),
            ),
          );
        },
      ),
    );
  }

  void _showQuickAdd(BuildContext context) {
    _quickAddController.clear();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 16, right: 16, top: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: _quickAddController, autofocus: true, decoration: const InputDecoration(hintText: 'Tapşırıq əlavə et...'), onSubmitted: (_) => _submitQuickAdd()),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Ləğv et')),
                const SizedBox(width: 8),
                ElevatedButton(onPressed: _submitQuickAdd, child: const Text('Əlavə et')),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Future<void> _submitQuickAdd() async {
    final content = _quickAddController.text.trim();
    if (content.isEmpty) return;
    Navigator.pop(context);
    try {
      final api = ref.read(apiProvider);
      await api.createTodoistTask({'content': content});
      ref.invalidate(todayTasksProvider);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xəta: $e')));
    }
  }

  void _showProfileMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(leading: const Icon(Icons.person_outline), title: Text(ref.read(authStateProvider).user?['fullName'] ?? ''), subtitle: Text(ref.read(authStateProvider).user?['email'] ?? '')),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Çıxış', style: TextStyle(color: Colors.red)),
              onTap: () { Navigator.pop(context); ref.read(authStateProvider.notifier).logout(); },
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() { _quickAddController.dispose(); super.dispose(); }
}
