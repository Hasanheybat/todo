import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';

class TaskTile extends StatelessWidget {
  final Map<String, dynamic> task;
  final VoidCallback onComplete;
  final VoidCallback? onTap;

  const TaskTile({super.key, required this.task, required this.onComplete, this.onTap});

  Color _priorityColor(String? priority) {
    switch (priority) {
      case 'P1': return Colors.red;
      case 'P2': return Colors.orange;
      case 'P3': return Colors.blue;
      default: return Colors.grey.shade400;
    }
  }

  static const _colorMap = <String, Color>{
    'RED': Colors.red, 'BLUE': Colors.blue, 'GREEN': Colors.green,
    'ORANGE': Colors.orange, 'PURPLE': Colors.purple, 'TEAL': Colors.teal,
    'YELLOW': Colors.amber, 'GREY': Colors.grey,
  };

  Color _projectColor(String? color) {
    if (color == null) return Colors.grey;
    if (_colorMap.containsKey(color.toUpperCase())) return _colorMap[color.toUpperCase()]!;
    if (color.startsWith('#') && color.length >= 7) {
      try { return Color(int.parse(color.replaceAll('#', '0xFF'))); } catch (_) {}
    }
    return Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    final priority = task['priority'] as String?;
    final content = task['content'] as String? ?? '';
    final dueDate = task['dueDate'] as String?;
    final isCompleted = task['isCompleted'] as bool? ?? false;
    final labels = task['labels'] as List? ?? [];
    final project = task['project'] as Map<String, dynamic>?;

    return Slidable(
      endActionPane: ActionPane(
        motion: const BehindMotion(),
        children: [
          SlidableAction(
            onPressed: (_) => onComplete(),
            backgroundColor: Colors.green,
            foregroundColor: Colors.white,
            icon: Icons.check,
            label: 'Tamamla',
            borderRadius: BorderRadius.circular(12),
          ),
        ],
      ),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Checkbox
            GestureDetector(
              onTap: onComplete,
              child: Container(
                width: 22, height: 22,
                margin: const EdgeInsets.only(top: 2, right: 12),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: _priorityColor(priority), width: 2),
                  color: isCompleted ? _priorityColor(priority) : Colors.transparent,
                ),
                child: isCompleted ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
              ),
            ),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    content,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      decoration: isCompleted ? TextDecoration.lineThrough : null,
                      color: isCompleted ? Colors.grey : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (dueDate != null) ...[
                        Icon(Icons.event, size: 12, color: Colors.grey.shade500),
                        const SizedBox(width: 3),
                        Text(
                          dueDate.split('T')[0],
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                        ),
                        const SizedBox(width: 8),
                      ],
                      if (project != null) ...[
                        Container(
                          width: 8, height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _projectColor(project['color'] as String?),
                          ),
                        ),
                        const SizedBox(width: 3),
                        Text(project['name'] ?? '', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                      ],
                      if (labels.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Icon(Icons.label_outline, size: 12, color: Colors.grey.shade400),
                        Text(' ${labels.length}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }
}
