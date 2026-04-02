class AppConstants {
  static const String appName = 'Taskobi';
  static const String apiUrl = 'http://localhost:4000';

  // Priorities
  static const Map<String, String> priorityLabels = {
    'CRITICAL': 'Kritik',
    'HIGH': 'Yüksək',
    'MEDIUM': 'Orta',
    'LOW': 'Aşağı',
    'INFO': 'Məlumat',
    'P1': 'Kritik',
    'P2': 'Yüksək',
    'P3': 'Orta',
    'P4': 'Normal',
  };

  // Task statuses
  static const Map<String, String> taskStatusLabels = {
    'CREATED': 'Yaradılıb',
    'PENDING': 'Gözləyir',
    'IN_PROGRESS': 'Davam edir',
    'COMPLETED': 'Tamamlandı',
    'PENDING_APPROVAL': 'Onay gözləyir',
    'APPROVED': 'Onaylandı',
    'REJECTED': 'Rədd',
    'FORCE_COMPLETED': 'Bağlandı',
  };

  // Todo statuses
  static const Map<String, String> todoStatusLabels = {
    'WAITING': 'Gözləyir',
    'IN_PROGRESS': 'Davam edir',
    'DONE': 'Tamamlandı',
    'CANCELLED': 'İptal',
  };
}
