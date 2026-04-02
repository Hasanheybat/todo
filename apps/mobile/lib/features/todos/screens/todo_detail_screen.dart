import 'package:flutter/material.dart';

class TodoDetailScreen extends StatelessWidget {
  final String todoId;

  const TodoDetailScreen({super.key, required this.todoId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Todo Detayı')),
      body: Center(
        child: Text(
          'Todo Detayı\nID: $todoId',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
        ),
      ),
    );
  }
}
