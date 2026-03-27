import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/providers.dart';

class TaskDetailScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> task;
  final ScrollController? scrollController;
  const TaskDetailScreen({super.key, required this.task, this.scrollController});

  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> {
  late Map<String, dynamic> _task;
  late TextEditingController _contentCtrl;
  late TextEditingController _descCtrl;
  final _commentCtrl = TextEditingController();
  final _subTaskCtrl = TextEditingController();
  bool _descExpanded = false;
  bool _subTasksExpanded = true;
  bool _showCompletedSubs = false;
  bool _saving = false;
  bool _hasChanges = false;
  Map<String, dynamic> _pendingChanges = {};

  static const _prioColors = <String, Color>{
    'P1': Color(0xFFDC4C3E), 'P2': Color(0xFFEB8909), 'P3': Color(0xFF246FE0), 'P4': Color(0xFFB3B3B3),
  };
  static const _prioLabels = <String, String>{
    'P1': 'Təcili', 'P2': 'Yüksək', 'P3': 'Orta', 'P4': 'Normal',
  };
  static const _colorMap = <String, Color>{
    'RED': Colors.red, 'BLUE': Colors.blue, 'GREEN': Colors.green,
    'ORANGE': Colors.orange, 'PURPLE': Colors.purple, 'TEAL': Colors.teal,
    'YELLOW': Colors.amber, 'GREY': Colors.grey,
  };

  @override
  void initState() {
    super.initState();
    _task = Map.from(widget.task);
    _contentCtrl = TextEditingController(text: _task['content'] ?? '');
    _descCtrl = TextEditingController(text: _task['description'] ?? '');
    _contentCtrl.addListener(_onContentChange);
    _descCtrl.addListener(_onDescChange);
  }

  @override
  void dispose() {
    _contentCtrl.removeListener(_onContentChange);
    _descCtrl.removeListener(_onDescChange);
    _contentCtrl.dispose();
    _descCtrl.dispose();
    _commentCtrl.dispose();
    _subTaskCtrl.dispose();
    super.dispose();
  }

  void _onContentChange() {
    if (_contentCtrl.text != (widget.task['content'] ?? '')) {
      _addPending({'content': _contentCtrl.text.trim()});
    }
  }

  void _onDescChange() {
    if (_descCtrl.text != (widget.task['description'] ?? '')) {
      _addPending({'description': _descCtrl.text.trim()});
    }
  }

  // ═══ Lokal dəyişiklik ═══
  void _addPending(Map<String, dynamic> changes) {
    setState(() {
      _pendingChanges.addAll(changes);
      _task.addAll(changes);
      _hasChanges = true;
    });
  }

  // ═══ ONAY — hamısını saxla ═══
  Future<void> _saveAll() async {
    if (_pendingChanges.isEmpty) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiProvider);
      await api.updateTodoistTask(_task['id'], _pendingChanges);
      ref.invalidate(todayTasksProvider);
      setState(() { _pendingChanges = {}; _hasChanges = false; });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saxlanıldı'), duration: Duration(seconds: 1)));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xəta: $e')));
    }
    setState(() => _saving = false);
  }

  // ═══ Ləğv ═══
  void _discardAll() {
    setState(() {
      _task = Map.from(widget.task);
      _contentCtrl.text = widget.task['content'] ?? '';
      _descCtrl.text = widget.task['description'] ?? '';
      _pendingChanges = {};
      _hasChanges = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final project = _task['project'] as Map<String, dynamic>?;
    final labels = _task['labels'] as List? ?? [];
    final priority = _task['priority'] as String? ?? 'P4';
    final dueDate = _task['dueDate'] as String?;
    final isCompleted = _task['isCompleted'] as bool? ?? false;
    final children = _task['children'] as List? ?? [];
    final isRecurring = _task['isRecurring'] as bool? ?? false;
    final reminder = _task['reminder'] as String?;
    final location = _task['location'] as String?;
    final prioColor = _prioColors[priority] ?? Colors.grey;

    final activeSubs = children.where((c) => c['isCompleted'] != true).toList();
    final completedSubs = children.where((c) => c['isCompleted'] == true).toList();

    return SingleChildScrollView(
      controller: widget.scrollController,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ═══ Handle bar ═══
          Center(child: Container(width: 40, height: 4, margin: const EdgeInsets.only(top: 12, bottom: 4),
            decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),

          // ═══ Header — X + onay + 3 nöqtə ═══
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                IconButton(icon: const Icon(Icons.close, size: 22), onPressed: () => Navigator.pop(context)),
                const Spacer(),
                // Onay butonu — dəyişiklik olduqda görünür
                if (_hasChanges) ...[
                  IconButton(
                    icon: Container(padding: const EdgeInsets.all(4), decoration: BoxDecoration(color: const Color(0xFFE44332), borderRadius: BorderRadius.circular(8)),
                      child: const Icon(Icons.check, size: 18, color: Colors.white)),
                    onPressed: _saving ? null : _saveAll,
                    tooltip: 'Saxla',
                  ),
                  IconButton(
                    icon: Icon(Icons.undo, size: 20, color: Colors.grey.shade500),
                    onPressed: _discardAll,
                    tooltip: 'Ləğv et',
                  ),
                ],
                // 3 nöqtə menyu
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_horiz, size: 22),
                  onSelected: _onMenuAction,
                  itemBuilder: (_) => [
                    _menuItem('copy', Icons.copy, 'Görevi kopyala'),
                    _menuItem('copyLink', Icons.link, 'Link kopyala'),
                    _menuItem('showCompleted', Icons.visibility, _showCompletedSubs ? 'Tamamlananları gizlə' : 'Tamamlananları göstər'),
                    _menuItem('activity', Icons.history, 'Etkinlik kaydı'),
                    const PopupMenuDivider(),
                    _menuItem('delete', Icons.delete_outline, 'Sil', color: Colors.red),
                  ],
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ═══ Checkbox + Başlıq ═══
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    GestureDetector(
                      onTap: isCompleted ? null : _complete,
                      child: Container(
                        width: 24, height: 24, margin: const EdgeInsets.only(top: 4, right: 12),
                        decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: prioColor, width: 2),
                          color: isCompleted ? prioColor : Colors.transparent),
                        child: isCompleted ? const Icon(Icons.check, size: 16, color: Colors.white) : null,
                      ),
                    ),
                    Expanded(
                      child: TextField(
                        controller: _contentCtrl,
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, decoration: isCompleted ? TextDecoration.lineThrough : null),
                        decoration: const InputDecoration(border: InputBorder.none, hintText: 'Tapşırıq adı', isDense: true, contentPadding: EdgeInsets.zero),
                        maxLines: null,
                      ),
                    ),
                  ],
                ),

                // ═══ Açıqlama ═══
                GestureDetector(
                  onTap: () => setState(() => _descExpanded = !_descExpanded),
                  child: Padding(
                    padding: const EdgeInsets.only(left: 36, top: 4),
                    child: Row(children: [
                      Icon(Icons.subject, size: 16, color: Colors.grey.shade500),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_descCtrl.text.isEmpty ? 'Açıqlama' : _descCtrl.text, maxLines: _descExpanded ? 10 : 1, overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 14, color: _descCtrl.text.isEmpty ? Colors.grey.shade400 : Colors.grey.shade700))),
                    ]),
                  ),
                ),
                if (_descExpanded)
                  Padding(padding: const EdgeInsets.only(left: 36, top: 4),
                    child: TextField(controller: _descCtrl, style: const TextStyle(fontSize: 14),
                      decoration: InputDecoration(hintText: 'Açıqlama əlavə et...', border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade200)),
                        contentPadding: const EdgeInsets.all(10), isDense: true), maxLines: null, minLines: 2)),

                const SizedBox(height: 12),

                // ═══ Layihə ═══
                if (project != null) _infoRow(Icons.tag, project['name'] ?? '', _colorMap[project['color']?.toString().toUpperCase()] ?? Colors.grey),

                // ═══ Tarix ═══
                GestureDetector(
                  onTap: () => _showDatePicker(context),
                  child: _infoRow(Icons.calendar_today, dueDate != null ? _formatDate(dueDate) : 'Tarix əlavə et',
                    dueDate != null ? _dueDateColor(dueDate) : Colors.grey,
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      if (isRecurring) Icon(Icons.repeat, size: 14, color: Colors.grey.shade500),
                      Icon(Icons.chevron_right, size: 18, color: Colors.grey.shade400),
                    ])),
                ),

                // ═══ Konum ═══
                if (location != null && location.isNotEmpty)
                  _infoRow(Icons.location_on, location, Colors.green),

                const SizedBox(height: 8),

                // ═══ Chip butonlar — Todoist sırası ═══
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(children: [
                    // 1. Önəmlilik
                    _chip(Icons.flag_outlined, _prioLabels[priority] ?? 'Normal', prioColor, () => _showPriorityPicker(context)),
                    const SizedBox(width: 8),
                    // 2. Xatırlatma
                    _chip(Icons.notifications_outlined,
                      reminder != null ? _formatDateTime(reminder) : 'Xatırlatıcı',
                      reminder != null ? Colors.deepPurple : Colors.grey.shade600,
                      () => _showReminderPicker(context)),
                    const SizedBox(width: 8),
                    // 3. Son tarix
                    _chip(Icons.event, dueDate != null ? _formatDate(dueDate) : 'Son tarix',
                      dueDate != null ? _dueDateColor(dueDate) : Colors.grey.shade600,
                      () => _showDatePicker(context)),
                    const SizedBox(width: 8),
                    // 4. Etiket
                    _chip(Icons.label_outline,
                      labels.isNotEmpty ? '${labels.length} etiket' : 'Etiket',
                      labels.isNotEmpty ? Colors.amber.shade700 : Colors.grey.shade600,
                      () => _showLabelPicker(context)),
                    const SizedBox(width: 8),
                    // 5. Konum
                    _chip(Icons.location_on_outlined,
                      location != null && location.isNotEmpty ? location : 'Konum',
                      location != null && location.isNotEmpty ? Colors.green : Colors.grey.shade600,
                      () => _showLocationInput()),
                    const SizedBox(width: 8),
                    // 6. Kopyala
                    _chip(Icons.copy, 'Kopyala', Colors.grey.shade600, _copyTask),
                    const SizedBox(width: 8),
                    // 7. Link
                    _chip(Icons.link, 'Link', Colors.grey.shade600, _copyLink),
                  ]),
                ),

                // ═══ Seçilən etiketlər badge ═══
                if (labels.isNotEmpty)
                  Padding(padding: const EdgeInsets.only(top: 6),
                    child: Wrap(spacing: 6, runSpacing: 4, children: labels.map<Widget>((tl) {
                      final lbl = tl['label'] as Map<String, dynamic>?;
                      final c = _colorMap[lbl?['color']?.toString().toUpperCase()] ?? Colors.amber;
                      return Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.label, size: 12, color: c),
                          const SizedBox(width: 4),
                          Text(lbl?['name'] ?? '', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: c)),
                        ]));
                    }).toList())),

                const SizedBox(height: 16),
                Divider(color: Colors.grey.shade200),

                // ═══ Alt-görevlər ═══
                GestureDetector(
                  onTap: () => setState(() => _subTasksExpanded = !_subTasksExpanded),
                  child: Padding(padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text('Alt-görevlər', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.grey.shade800)),
                      Row(mainAxisSize: MainAxisSize.min, children: [
                        if (children.isNotEmpty) Text('${completedSubs.length}/${children.length}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                        Icon(_subTasksExpanded ? Icons.expand_less : Icons.expand_more, color: Colors.grey.shade500),
                      ]),
                    ])),
                ),

                if (_subTasksExpanded) ...[
                  // Aktiv alt-görevlər
                  ...activeSubs.map((ch) => _buildSubTask(ch)),
                  // Tamamlanan alt-görevlər
                  if (_showCompletedSubs && completedSubs.isNotEmpty) ...[
                    Padding(padding: const EdgeInsets.only(top: 6, bottom: 4),
                      child: Text('Tamamlanan (${completedSubs.length})', style: TextStyle(fontSize: 11, color: Colors.grey.shade500))),
                    ...completedSubs.map((ch) => _buildSubTask(ch)),
                  ],
                  // Alt-görev əlavə et
                  Padding(padding: const EdgeInsets.only(top: 4),
                    child: Row(children: [
                      Icon(Icons.add, size: 18, color: Colors.grey.shade400),
                      const SizedBox(width: 10),
                      Expanded(child: TextField(controller: _subTaskCtrl, style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(hintText: 'Alt-görev əlavə et', border: InputBorder.none, isDense: true,
                          contentPadding: EdgeInsets.zero, hintStyle: TextStyle(color: Colors.grey.shade400)),
                        onSubmitted: (_) => _addSubTask())),
                    ])),
                ],

                Divider(color: Colors.grey.shade200),
                const SizedBox(height: 8),

                // ═══ Yorum ═══
                Row(children: [
                  Icon(Icons.mode_comment_outlined, size: 18, color: Colors.grey.shade400),
                  const SizedBox(width: 10),
                  Expanded(child: TextField(controller: _commentCtrl, style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(hintText: 'Yorum', border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide(color: Colors.grey.shade200)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8), isDense: true, hintStyle: TextStyle(color: Colors.grey.shade400),
                      suffixIcon: IconButton(icon: Icon(Icons.send, size: 18, color: Colors.orange.shade600), onPressed: _addComment)),
                    onSubmitted: (_) => _addComment())),
                ]),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ═══ Alt-görev widget ═══
  Widget _buildSubTask(Map<String, dynamic> ch) {
    final isComp = ch['isCompleted'] == true;
    final subPrio = ch['priority'] as String?;
    final subDate = ch['dueDate'] as String?;
    final subReminder = ch['reminder'] as String?;
    final subLabels = ch['labels'] as List? ?? [];
    final subColor = _prioColors[subPrio] ?? Colors.grey.shade400;

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            GestureDetector(
              onTap: () => _toggleSubTask(ch['id']),
              child: Container(width: 18, height: 18,
                decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: subColor, width: 1.5),
                  color: isComp ? subColor : Colors.transparent),
                child: isComp ? const Icon(Icons.check, size: 12, color: Colors.white) : null),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(ch['content'] ?? '', style: TextStyle(fontSize: 13, decoration: isComp ? TextDecoration.lineThrough : null,
              color: isComp ? Colors.grey : Colors.black87))),
          ]),
          // Xüsusiyyət badge-lər
          if (subDate != null || (subPrio != null && subPrio != 'P4') || subReminder != null || subLabels.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 28, top: 2),
              child: Wrap(spacing: 6, runSpacing: 2, children: [
                if (subDate != null) _badge(Icons.calendar_today, _formatDate(subDate), _dueDateColor(subDate)),
                if (subPrio != null && subPrio != 'P4') _badge(Icons.flag, _prioLabels[subPrio] ?? '', _prioColors[subPrio] ?? Colors.grey),
                if (subReminder != null) _badge(Icons.notifications, 'Xatırlatma', Colors.deepPurple),
                ...subLabels.map((tl) {
                  final lbl = tl['label'] as Map<String, dynamic>?;
                  return _badge(Icons.label, lbl?['name'] ?? '', Colors.amber.shade700);
                }),
              ]),
            ),
        ],
      ),
    );
  }

  Widget _badge(IconData icon, String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 10, color: color),
        const SizedBox(width: 3),
        Text(text, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: color)),
      ]),
    );
  }

  // ═══ Helper widgets ═══
  Widget _infoRow(IconData icon, String text, Color color, {Widget? trailing}) {
    return Padding(padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Icon(icon, size: 18, color: color), const SizedBox(width: 10),
        Expanded(child: Text(text, style: TextStyle(fontSize: 14, color: color, fontWeight: FontWeight.w500))),
        if (trailing != null) trailing,
      ]));
  }

  Widget _chip(IconData icon, String label, Color color, VoidCallback onTap) {
    return GestureDetector(onTap: onTap,
      child: Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.grey.shade300)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 16, color: color), const SizedBox(width: 6),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
        ])));
  }

  PopupMenuItem<String> _menuItem(String value, IconData icon, String label, {Color? color}) {
    return PopupMenuItem(value: value, child: Row(children: [
      Icon(icon, size: 18, color: color ?? Colors.grey.shade700), const SizedBox(width: 8),
      Text(label, style: TextStyle(color: color)),
    ]));
  }

  // ═══ Menu actions ═══
  void _onMenuAction(String action) {
    switch (action) {
      case 'copy': _copyTask();
      case 'copyLink': _copyLink();
      case 'showCompleted': setState(() => _showCompletedSubs = !_showCompletedSubs);
      case 'activity': ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Etkinlik kaydı tezliklə...')));
      case 'delete': _deleteTask();
    }
  }

  // ═══ Kopyala ═══
  Future<void> _copyTask() async {
    try {
      final api = ref.read(apiProvider);
      await api.createTodoistTask({
        'content': '${_task['content']} (copy)',
        'priority': _task['priority'],
        'projectId': _task['projectId'],
        'dueDate': _task['dueDate'],
      });
      ref.invalidate(todayTasksProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Kopyalandı')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xəta: $e')));
    }
  }

  void _copyLink() {
    Clipboard.setData(ClipboardData(text: 'workflowpro://task/${_task['id']}'));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link kopyalandı')));
  }

  // ═══ Konum input ═══
  void _showLocationInput() {
    final ctrl = TextEditingController(text: _task['location'] ?? '');
    showModalBottomSheet(context: context, builder: (_) => SafeArea(
      child: Padding(padding: const EdgeInsets.all(20), child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('Konum', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        TextField(controller: ctrl, decoration: InputDecoration(hintText: 'Konum daxil edin', border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          contentPadding: const EdgeInsets.all(12)), autofocus: true),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Ləğv'))),
          const SizedBox(width: 12),
          Expanded(child: ElevatedButton(onPressed: () { Navigator.pop(context); _addPending({'location': ctrl.text.trim()}); },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE44332)), child: const Text('Saxla', style: TextStyle(color: Colors.white)))),
        ]),
      ]))));
  }

  // ═══ Tarix helpers ═══
  String _formatDate(String date) {
    final d = DateTime.tryParse(date);
    if (d == null) return date;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(d.year, d.month, d.day);
    final diff = target.difference(today).inDays;
    if (diff == 0) return 'Bugün';
    if (diff == 1) return 'Sabah';
    if (diff == -1) return 'Dünən';
    final weekdays = ['B.e.', 'Ç.a.', 'Ç.', 'C.a.', 'C.', 'Ş.', 'B.'];
    if (diff > 1 && diff <= 7) return weekdays[d.weekday - 1];
    return '${d.day} ${_monthName(d.month)}';
  }

  String _monthName(int m) {
    const months = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];
    return months[m - 1];
  }

  Color _dueDateColor(String date) {
    final d = DateTime.tryParse(date);
    if (d == null) return Colors.grey;
    final diff = DateTime(d.year, d.month, d.day).difference(DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day)).inDays;
    if (diff < 0) return Colors.red;
    if (diff == 0) return Colors.orange;
    if (diff <= 3) return Colors.amber.shade700;
    return Colors.green;
  }

  // ═══ Picker-lər ═══
  void _showDatePicker(BuildContext context) {
    showModalBottomSheet(context: context, builder: (_) => SafeArea(child: Padding(padding: const EdgeInsets.all(20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Tarix seç', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        _dateOption(Icons.today, 'Bugün', Colors.green, () { Navigator.pop(context); _addPending({'dueDate': DateTime.now().toIso8601String()}); }),
        _dateOption(Icons.wb_sunny_outlined, 'Sabah', Colors.orange, () { Navigator.pop(context); _addPending({'dueDate': DateTime.now().add(const Duration(days: 1)).toIso8601String()}); }),
        _dateOption(Icons.next_week_outlined, 'Gələn həftə', Colors.purple, () {
          final now = DateTime.now(); final monday = now.add(Duration(days: (8 - now.weekday) % 7));
          Navigator.pop(context); _addPending({'dueDate': monday.toIso8601String()});
        }),
        _dateOption(Icons.block, 'Tarixsiz', Colors.grey, () { Navigator.pop(context); _addPending({'dueDate': null}); }),
        const Divider(),
        _dateOption(Icons.repeat, 'Təkrarlama', Colors.teal, () { Navigator.pop(context); _showRecurPicker(context); }),
        const Divider(),
        ListTile(leading: const Icon(Icons.calendar_month, color: Colors.indigo), title: const Text('Təqvimdən seç'),
          contentPadding: EdgeInsets.zero, dense: true,
          onTap: () async { Navigator.pop(context);
            final picked = await showDatePicker(context: this.context, firstDate: DateTime(2020), lastDate: DateTime(2030),
              initialDate: DateTime.tryParse(_task['dueDate'] ?? '') ?? DateTime.now());
            if (picked != null) _addPending({'dueDate': picked.toIso8601String()});
          }),
      ]))));
  }

  Widget _dateOption(IconData icon, String label, Color color, VoidCallback onTap) {
    return ListTile(leading: Icon(icon, color: color, size: 20), title: Text(label, style: const TextStyle(fontSize: 14)),
      contentPadding: EdgeInsets.zero, dense: true, onTap: onTap);
  }

  void _showPriorityPicker(BuildContext context) {
    showModalBottomSheet(context: context, builder: (_) => SafeArea(child: Padding(padding: const EdgeInsets.all(20),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('Öncelik', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        for (final e in _prioLabels.entries)
          ListTile(leading: Icon(Icons.flag, color: _prioColors[e.key], size: 20), title: Text(e.value),
            trailing: _task['priority'] == e.key ? const Icon(Icons.check, color: Colors.orange) : null,
            contentPadding: EdgeInsets.zero, dense: true,
            onTap: () { Navigator.pop(context); _addPending({'priority': e.key}); }),
      ]))));
  }

  String _formatDateTime(String dt) {
    final d = DateTime.tryParse(dt);
    if (d == null) return dt;
    return '${d.day} ${_monthName(d.month)} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  void _showReminderPicker(BuildContext context) {
    final now = DateTime.now();
    showModalBottomSheet(context: context, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => SafeArea(child: Padding(padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Xatırlatma', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _dateOption(Icons.notifications_active, 'Bu gün ${now.hour < 18 ? "18:00" : "23:00"}', Colors.deepPurple, () {
            Navigator.pop(context);
            final h = now.hour < 18 ? 18 : 23;
            _addPending({'reminder': DateTime(now.year, now.month, now.day, h).toIso8601String()});
          }),
          _dateOption(Icons.wb_sunny_outlined, 'Sabah 09:00', Colors.orange, () {
            Navigator.pop(context);
            final tom = now.add(const Duration(days: 1));
            _addPending({'reminder': DateTime(tom.year, tom.month, tom.day, 9).toIso8601String()});
          }),
          _dateOption(Icons.next_week_outlined, 'Gələn B.e. 09:00', Colors.purple, () {
            Navigator.pop(context);
            final monday = now.add(Duration(days: (8 - now.weekday) % 7));
            _addPending({'reminder': DateTime(monday.year, monday.month, monday.day, 9).toIso8601String()});
          }),
          const Divider(),
          _dateOption(Icons.access_time, 'Özel tarix və saat seç', Colors.blue, () async {
            Navigator.pop(context);
            final date = await showDatePicker(context: this.context, firstDate: DateTime.now(), lastDate: DateTime(2030), initialDate: DateTime.now());
            if (date == null || !mounted) return;
            final time = await showTimePicker(context: this.context, initialTime: TimeOfDay.now());
            if (time == null || !mounted) return;
            _addPending({'reminder': DateTime(date.year, date.month, date.day, time.hour, time.minute).toIso8601String()});
          }),
          if (_task['reminder'] != null) ...[
            const Divider(),
            _dateOption(Icons.notifications_off, 'Xatırlatmanı sil', Colors.red, () {
              Navigator.pop(context); _addPending({'reminder': null});
            }),
          ],
        ]))));
  }

  // ═══ Etiket picker ═══
  void _showLabelPicker(BuildContext context) {
    final allLabels = ref.read(labelsProvider).valueOrNull ?? [];
    final currentIds = (_task['labels'] as List? ?? []).map((tl) => (tl['label'] as Map?)?['id'] ?? tl['labelId']).where((id) => id != null).toList();
    List<String> selectedIds = List<String>.from(currentIds.cast<String>());

    showModalBottomSheet(context: context, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => StatefulBuilder(builder: (ctx, setSt) => SafeArea(child: Padding(padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Etiketlər', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            TextButton(onPressed: () {
              Navigator.pop(context);
              // Lokal labels array yenilə
              final newLabels = selectedIds.map((id) {
                final found = allLabels.firstWhere((l) => l['id'] == id, orElse: () => null);
                return found != null ? {'label': found, 'labelId': id} : null;
              }).where((e) => e != null).toList();
              _addPending({'labelIds': selectedIds});
              setState(() => _task['labels'] = newLabels);
            }, child: const Text('Tamam', style: TextStyle(fontWeight: FontWeight.bold))),
          ]),
          const SizedBox(height: 8),
          if (allLabels.isEmpty)
            const Padding(padding: EdgeInsets.all(20), child: Center(child: Text('Etiket yoxdur', style: TextStyle(color: Colors.grey))))
          else
            ...allLabels.map((l) {
              final isSelected = selectedIds.contains(l['id']);
              final c = _colorMap[l['color']?.toString().toUpperCase()] ?? Colors.amber;
              return CheckboxListTile(
                value: isSelected,
                onChanged: (v) => setSt(() { if (v == true) selectedIds.add(l['id']); else selectedIds.remove(l['id']); }),
                title: Row(children: [
                  Container(width: 12, height: 12, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
                  const SizedBox(width: 10),
                  Text(l['name'] ?? '', style: const TextStyle(fontSize: 14)),
                ]),
                controlAffinity: ListTileControlAffinity.trailing,
                contentPadding: EdgeInsets.zero, dense: true,
                activeColor: Colors.orange,
              );
            }),
        ])))));
  }

  void _showRecurPicker(BuildContext context) {
    showModalBottomSheet(context: context, builder: (_) => SafeArea(child: Padding(padding: const EdgeInsets.all(20),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('Təkrarlama', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        for (final r in [('Hər gün', 'daily'), ('Hər həftə', 'weekly'), ('Hər ay', 'monthly'), ('Yox', '')])
          ListTile(
            leading: Icon(_task['recurRule'] == r.$2 ? Icons.check_circle : Icons.circle_outlined, color: _task['recurRule'] == r.$2 ? Colors.orange : Colors.grey, size: 20),
            title: Text(r.$1), contentPadding: EdgeInsets.zero, dense: true,
            onTap: () { Navigator.pop(context); _addPending({'recurRule': r.$2.isEmpty ? null : r.$2, 'isRecurring': r.$2.isNotEmpty}); }),
      ]))));
  }

  // ═══ CRUD ═══
  Future<void> _complete() async {
    try {
      final api = ref.read(apiProvider);
      await api.completeTodoistTask(_task['id']);
      ref.invalidate(todayTasksProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xəta: $e')));
    }
  }

  Future<void> _toggleSubTask(String id) async {
    try {
      final api = ref.read(apiProvider);
      final ch = (_task['children'] as List).firstWhere((c) => c['id'] == id, orElse: () => null);
      if (ch == null) return;
      if (ch['isCompleted'] == true) {
        await api.uncompleteTodoistTask(id);
      } else {
        await api.completeTodoistTask(id);
      }
      setState(() => ch['isCompleted'] = !(ch['isCompleted'] as bool? ?? false));
      ref.invalidate(todayTasksProvider);
    } catch (_) {}
  }

  Future<void> _addSubTask() async {
    final text = _subTaskCtrl.text.trim();
    if (text.isEmpty) return;
    _subTaskCtrl.clear();
    try {
      final api = ref.read(apiProvider);
      final res = await api.createTodoistTask({'content': text, 'parentId': _task['id'], 'projectId': _task['projectId']});
      ref.invalidate(todayTasksProvider);
      setState(() => (_task['children'] as List).add({'id': res['id'], 'content': text, 'isCompleted': false, 'priority': 'P4'}));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xəta: $e')));
    }
  }

  Future<void> _addComment() async {
    final text = _commentCtrl.text.trim();
    if (text.isEmpty) return;
    _commentCtrl.clear();
    try {
      final api = ref.read(apiProvider);
      await api.dio.post('/todoist/tasks/${_task['id']}/comments', data: {'content': text, 'taskId': _task['id']});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Yorum əlavə edildi'), duration: Duration(seconds: 1)));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xəta: $e')));
    }
  }

  Future<void> _deleteTask() async {
    final confirm = await showDialog<bool>(context: context,
      builder: (_) => AlertDialog(title: const Text('Sil'), content: const Text('Bu tapşırığı silmək istəyirsiniz?'),
        actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Xeyr')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Bəli', style: TextStyle(color: Colors.red)))]));
    if (confirm != true) return;
    try {
      final api = ref.read(apiProvider);
      await api.deleteTodoistTask(_task['id']);
      ref.invalidate(todayTasksProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xəta: $e')));
    }
  }
}
