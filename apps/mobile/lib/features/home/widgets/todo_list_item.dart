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
    final statusColor = _statusColor(todo.todoStatus, colors);
    final daysLeft = todo.dueDate != null ? todo.dueDate!.difference(DateTime.now()).inDays : null;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            // Checkbox
            GestureDetector(
              onTap: onComplete,
              child: Container(
                width: 20, height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: statusColor, width: 2),
                  color: isDone ? statusColor : Colors.transparent,
                ),
                child: isDone ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
              ),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(color: colors.todoBg, borderRadius: BorderRadius.circular(4)),
                        child: Text('TODO', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: colors.todoText)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          todo.content,
                          maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w500,
                            color: isDone ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4) : Theme.of(context).colorScheme.onSurface,
                            decoration: isDone ? TextDecoration.lineThrough : null,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (daysLeft != null) ...[
                        Icon(Icons.calendar_today, size: 11, color: daysLeft < 0 ? colors.danger : daysLeft == 0 ? colors.warning : Colors.grey),
                        const SizedBox(width: 3),
                        Text(
                          daysLeft < 0 ? '${-daysLeft}g gecikmiş' : daysLeft == 0 ? 'Bugün' : '${daysLeft}g qalıb',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: daysLeft < 0 ? colors.danger : daysLeft == 0 ? colors.warning : Colors.grey),
                        ),
                        const SizedBox(width: 8),
                      ],
                      if (todo.projectName != null)
                        Text(todo.projectName!, style: TextStyle(fontSize: 11, color: colors.todoText)),
                      if (todo.children.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Icon(Icons.checklist, size: 11, color: Colors.grey.shade400),
                        Text(' ${todo.children.where((c) => c.isCompleted).length}/${todo.children.length}',
                          style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                      ],
                      if (todo.isRecurring) ...[
                        const SizedBox(width: 6),
                        Icon(Icons.repeat, size: 11, color: Colors.purple.shade300),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            // Arrow
            Icon(Icons.chevron_right, size: 18, color: Colors.grey.shade400),
          ],
        ),
      ),
    );
  }

  Color _statusColor(String status, AppColors colors) {
    switch (status) {
      case 'DONE': return colors.success;
      case 'IN_PROGRESS': return colors.warning;
      case 'CANCELLED': return colors.danger;
      default: return colors.p4;
    }
  }
}
