import 'package:flutter/material.dart';
import '../../../core/models/task_model.dart';
import '../../../app/theme.dart';

class TaskListItem extends StatelessWidget {
  final TaskModel task;
  final VoidCallback onTap;

  const TaskListItem({super.key, required this.task, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    final isDone = ['COMPLETED', 'APPROVED', 'FORCE_COMPLETED'].contains(task.status);
    final priorityColor = _priorityColor(task.priority, colors);
    final daysLeft = task.dueDate != null ? task.dueDate!.difference(DateTime.now()).inDays : null;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            // Priority indicator
            Container(
              width: 3, height: 36,
              decoration: BoxDecoration(color: priorityColor, borderRadius: BorderRadius.circular(2)),
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
                        decoration: BoxDecoration(color: colors.gorevBg, borderRadius: BorderRadius.circular(4)),
                        child: Text('GÖREV', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: colors.gorevText)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          task.title,
                          maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w600,
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
                      if (task.assignees.isNotEmpty)
                        Text(task.assignees.first.fullName, style: const TextStyle(fontSize: 11, color: Colors.grey)),
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

  Color _priorityColor(String priority, AppColors colors) {
    switch (priority) {
      case 'CRITICAL': return colors.p1;
      case 'HIGH': return colors.p2;
      case 'MEDIUM': return colors.p3;
      case 'LOW': case 'INFO': return colors.p4;
      default: return colors.p4;
    }
  }
}
