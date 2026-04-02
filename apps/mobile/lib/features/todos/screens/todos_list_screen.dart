import 'package:flutter/material.dart';

class TodosListScreen extends StatelessWidget {
  const TodosListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Todo')),
      body: const Center(
        child: Text(
          'Todo',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
        ),
      ),
    );
  }
}
