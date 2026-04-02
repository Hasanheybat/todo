import 'package:flutter/material.dart';
import '../../../core/models/todo_model.dart';
import '../../../app/theme.dart';

class TodoListItem extends StatelessWidget {
  final TodoModel todo;
  final VoidCallback onTap;
  final VoidCallback? onComplete;

  const TodoListItem({super.key, required this.todo, required this.onTap, this.onComplete});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    final isDone = todo.isCompleted || todo.todoStatus == 'DONE';
    final statusColor = _sColor(todo.todoStatus, colors);
    final daysLeft = todo.dueDate?.difference(DateTime.now()).inDays;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFF1F5F9)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Row(
          children: [
            // Checkbox
            GestureDetector(
              onTap: onComplete,
              child: Container(
                width: 22, height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isDone ? statusColor : Colors.transparent,
                  border: Border.all(color: statusColor, width: 2),
                ),
                child: isDone ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
              ),
            ),
            const SizedBox(width: 12),
            // Məzmun
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    todo.content,
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w500,
                      color: isDone ? const Color(0xFF94A3B8) : const Color(0xFF1E293B),
                      decoration: isDone ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(color: colors.todoBg, borderRadius: BorderRadius.circular(4)),
                        child: Text('TODO', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: colors.todoText)),
                      ),
                      if (daysLeft != null) ...[
                        const SizedBox(width: 8),
                        Icon(Icons.schedule, size: 12, color: daysLeft < 0 ? colors.danger : daysLeft == 0 ? colors.warning : const Color(0xFF94A3B8)),
                        const SizedBox(width: 2),
                        Text(
                          daysLeft < 0 ? '${-daysLeft}g gecikmiş' : daysLeft == 0 ? 'Bugün' : '${daysLeft}g',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: daysLeft < 0 ? colors.danger : daysLeft == 0 ? colors.warning : const Color(0xFF94A3B8)),
                        ),
                      ],
                      if (todo.projectName != null) ...[
                        const SizedBox(width: 8),
                        Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: Color(int.parse('0xFF${(todo.projectColor ?? 'EB8909').replaceAll('#', '')}')))),
                        const SizedBox(width: 3),
                        Text(todo.projectName!, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                      ],
                      if (todo.children.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Icon(Icons.checklist_rounded, size: 12, color: const Color(0xFF94A3B8)),
                        const SizedBox(width: 2),
                        Text('${todo.children.where((c) => c.isCompleted).length}/${todo.children.length}', style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                      ],
                      if (todo.isRecurring) ...[
                        const SizedBox(width: 6),
                        Icon(Icons.repeat_rounded, size: 12, color: const Color(0xFF8B5CF6)),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, size: 18, color: Colors.grey.shade300),
          ],
        ),
      ),
    );
  }

  Color _sColor(String s, AppColors c) {
    switch (s) { case 'DONE': return c.success; case 'IN_PROGRESS': return c.warning; case 'CANCELLED': return c.danger; default: return c.p4; }
  }
}
