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
    final pColor = _pColor(task.priority, colors);
    final daysLeft = task.dueDate?.difference(DateTime.now()).inDays;

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
            // Prioritet nöqtəsi
            Container(
              width: 10, height: 10,
              decoration: BoxDecoration(shape: BoxShape.circle, color: pColor),
            ),
            const SizedBox(width: 12),
            // Məzmun
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.title,
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w600,
                      color: isDone ? const Color(0xFF94A3B8) : const Color(0xFF1E293B),
                      decoration: isDone ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(color: colors.gorevBg, borderRadius: BorderRadius.circular(4)),
                        child: Text('GÖREV', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: colors.gorevText)),
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
                      if (task.assignees.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Icon(Icons.person_outline, size: 12, color: const Color(0xFF94A3B8)),
                        const SizedBox(width: 2),
                        Text(task.assignees.first.fullName.split(' ').first, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
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

  Color _pColor(String p, AppColors c) {
    switch (p) { case 'CRITICAL': return c.p1; case 'HIGH': return c.p2; case 'MEDIUM': return c.p3; default: return c.p4; }
  }
}
