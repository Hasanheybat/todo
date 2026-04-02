class NotificationModel {
  final String id;
  final String type;
  final String title;
  final String message;
  final bool isRead;
  final String? link;
  final String? senderId;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    this.isRead = false,
    this.link,
    this.senderId,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) =>
      NotificationModel(
        id: json['id'] ?? '',
        type: json['type'] ?? 'GENERAL',
        title: json['title'] ?? '',
        message: json['message'] ?? '',
        isRead: json['isRead'] ?? false,
        link: json['link'],
        senderId: json['senderId'],
        createdAt:
            DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'title': title,
    'message': message,
    'isRead': isRead,
    'link': link,
    'senderId': senderId,
    'createdAt': createdAt.toIso8601String(),
  };
}
