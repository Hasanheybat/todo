class TaskAssignee {
  final String userId;
  final String fullName;
  final String status;

  TaskAssignee({
    required this.userId,
    required this.fullName,
    required this.status,
  });

  factory TaskAssignee.fromJson(Map<String, dynamic> json) => TaskAssignee(
    userId: json['userId'] ?? json['user']?['id'] ?? '',
    fullName: json['fullName'] ?? json['user']?['fullName'] ?? '',
    status: json['status'] ?? 'PENDING',
  );

  Map<String, dynamic> toJson() => {
    'userId': userId,
    'fullName': fullName,
    'status': status,
  };
}

class TaskModel {
  final String id;
  final String title;
  final String? description;
  final String type; // TASK or GOREV
  final String priority;
  final String status;
  final DateTime? dueDate;
  final String? businessName;
  final String? creatorName;
  final List<TaskAssignee> assignees;
  final bool isRecurring;
  final String? recurRule;
  final DateTime createdAt;

  TaskModel({
    required this.id,
    required this.title,
    this.description,
    required this.type,
    required this.priority,
    required this.status,
    this.dueDate,
    this.businessName,
    this.creatorName,
    required this.assignees,
    this.isRecurring = false,
    this.recurRule,
    required this.createdAt,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    final assigneeList = <TaskAssignee>[];
    if (json['assignees'] != null) {
      for (final a in json['assignees'] as List) {
        assigneeList.add(TaskAssignee.fromJson(a as Map<String, dynamic>));
      }
    }

    return TaskModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      type: json['type'] ?? 'TASK',
      priority: json['priority'] ?? 'P3',
      status: json['status'] ?? 'CREATED',
      dueDate:
          json['dueDate'] != null ? DateTime.tryParse(json['dueDate']) : null,
      businessName: json['business']?['name'] ?? json['businessName'],
      creatorName: json['creator']?['fullName'] ?? json['creatorName'],
      assignees: assigneeList,
      isRecurring: json['isRecurring'] ?? false,
      recurRule: json['recurRule'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'description': description,
    'type': type,
    'priority': priority,
    'status': status,
    'dueDate': dueDate?.toIso8601String(),
    'businessName': businessName,
    'creatorName': creatorName,
    'assignees': assignees.map((a) => a.toJson()).toList(),
    'isRecurring': isRecurring,
    'recurRule': recurRule,
    'createdAt': createdAt.toIso8601String(),
  };
}
