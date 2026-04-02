class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String role; // SUPER_ADMIN, TENANT_ADMIN, etc.
  final String? tenantId;
  final String? tenantName;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.tenantId,
    this.tenantName,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
    id: json['id'] ?? '',
    email: json['email'] ?? '',
    fullName: json['fullName'] ?? '',
    role: json['role'] ?? 'EMPLOYEE',
    tenantId: json['tenantId'],
    tenantName: json['tenant']?['name'],
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'fullName': fullName,
    'role': role,
    'tenantId': tenantId,
  };
}
