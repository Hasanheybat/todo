import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MainScaffold extends StatelessWidget {
  final Widget child;

  const MainScaffold({super.key, required this.child});

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/tasks')) return 1;
    if (location.startsWith('/notifications')) return 2;
    if (location.startsWith('/profile')) return 3;
    return 0; // /home default
  }

  void _onTap(BuildContext context, int index) {
    switch (index) {
      case 0: context.go('/home');
      case 1: context.go('/tasks');
      case 2: context.go('/notifications');
      case 3: context.go('/profile');
    }
  }

  void _showCreateSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 24),
              Text('Yeni yarad', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: const Color(0xFFE8F0FE), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.assignment, color: Color(0xFF246FE0)),
                ),
                title: const Text('GÖREV'),
                subtitle: const Text('Yeni tapşırıq yarat'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () { Navigator.pop(ctx); context.push('/create/task'); },
              ),
              const SizedBox(height: 8),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: const Color(0xFFFFF3E0), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.check_circle_outline, color: Color(0xFFEB8909)),
                ),
                title: const Text('TODO'),
                subtitle: const Text('Yeni todo yarat'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () { Navigator.pop(ctx); context.push('/create/todo'); },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final idx = _currentIndex(context);

    return Scaffold(
      body: child,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateSheet(context),
        backgroundColor: const Color(0xFF4F46E5),
        foregroundColor: Colors.white,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: const Icon(Icons.add, size: 28),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: idx,
        onTap: (i) => _onTap(context, i),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF4F46E5),
        unselectedItemColor: const Color(0xFF94A3B8),
        selectedFontSize: 11,
        unselectedFontSize: 11,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Bugün'),
          BottomNavigationBarItem(icon: Icon(Icons.assignment_outlined), activeIcon: Icon(Icons.assignment), label: 'Tapşırıqlar'),
          BottomNavigationBarItem(icon: Icon(Icons.notifications_outlined), activeIcon: Icon(Icons.notifications), label: 'Bildirişlər'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outlined), activeIcon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}
