class TodoLabel {
  final String id;
  final String name;
  final String? color;

  TodoLabel({required this.id, required this.name, this.color});

  factory TodoLabel.fromJson(Map<String, dynamic> json) => TodoLabel(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    color: json['color'],
  );

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'color': color};
}

class TodoModel {
  final String id;
  final String content;
  final String? description;
  final String priority;
  final String todoStatus;
  final bool isCompleted;
  final DateTime? dueDate;
  final bool isRecurring;
  final String? recurRule;
  final int? duration;
  final String? projectId;
  final String? projectName;
  final String? projectColor;
  final List<TodoLabel> labels;
  final List<TodoModel> children;
  final String? parentId;
  final DateTime createdAt;

  TodoModel({
    required this.id,
    required this.content,
    this.description,
    required this.priority,
    required this.todoStatus,
    this.isCompleted = false,
    this.dueDate,
    this.isRecurring = false,
    this.recurRule,
    this.duration,
    this.projectId,
    this.projectName,
    this.projectColor,
    this.labels = const [],
    this.children = const [],
    this.parentId,
    required this.createdAt,
  });

  factory TodoModel.fromJson(Map<String, dynamic> json) {
    final labelList = <TodoLabel>[];
    if (json['labels'] != null) {
      for (final l in json['labels'] as List) {
        labelList.add(TodoLabel.fromJson(l as Map<String, dynamic>));
      }
    }

    final childList = <TodoModel>[];
    if (json['children'] != null) {
      for (final c in json['children'] as List) {
        childList.add(TodoModel.fromJson(c as Map<String, dynamic>));
      }
    }

    return TodoModel(
      id: json['id'] ?? '',
      content: json['content'] ?? '',
      description: json['description'],
      priority: json['priority'] ?? 'P4',
      todoStatus: json['todoStatus'] ?? 'WAITING',
      isCompleted: json['isCompleted'] ?? false,
      dueDate:
          json['dueDate'] != null ? DateTime.tryParse(json['dueDate']) : null,
      isRecurring: json['isRecurring'] ?? false,
      recurRule: json['recurRule'],
      duration: json['duration'],
      projectId: json['projectId'] ?? json['project']?['id'],
      projectName: json['project']?['name'] ?? json['projectName'],
      projectColor: json['project']?['color'] ?? json['projectColor'],
      labels: labelList,
      children: childList,
      parentId: json['parentId'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'content': content,
    'description': description,
    'priority': priority,
    'todoStatus': todoStatus,
    'isCompleted': isCompleted,
    'dueDate': dueDate?.toIso8601String(),
    'isRecurring': isRecurring,
    'recurRule': recurRule,
    'duration': duration,
    'projectId': projectId,
    'projectName': projectName,
    'projectColor': projectColor,
    'labels': labels.map((l) => l.toJson()).toList(),
    'children': children.map((c) => c.toJson()).toList(),
    'parentId': parentId,
    'createdAt': createdAt.toIso8601String(),
  };
}
