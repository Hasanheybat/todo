import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(authStateProvider.notifier).login(
      _emailController.text.trim(),
      _passwordController.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Stack(
        children: [
          // Bənövşəyi dalğa header
          Positioned(
            top: -size.width * 0.3,
            left: -size.width * 0.2,
            child: Container(
              width: size.width * 1.4,
              height: size.width * 1.1,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                ),
              ),
            ),
          ),

          // İkon
          Positioned(
            top: size.height * 0.12,
            left: 0, right: 0,
            child: Column(
              children: [
                Container(
                  width: 72, height: 72,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 20, offset: const Offset(0, 8))],
                  ),
                  child: const Icon(Icons.check_rounded, size: 40, color: Color(0xFF4F46E5)),
                ),
                const SizedBox(height: 16),
                const Text('Taskobi', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.5)),
                const SizedBox(height: 4),
                Text('İşləri bitir.', style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.8))),
              ],
            ),
          ),

          // Form
          Positioned(
            top: size.height * 0.38,
            left: 0, right: 0, bottom: 0,
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('Daxil ol', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    Text('Hesabınıza daxil olun', style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
                    const SizedBox(height: 28),

                    // Email
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        style: const TextStyle(fontSize: 15),
                        decoration: const InputDecoration(
                          hintText: 'Email adresiniz',
                          hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                          prefixIcon: Icon(Icons.mail_outline, color: Color(0xFF94A3B8), size: 20),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        ),
                        validator: (v) => (v == null || v.isEmpty) ? 'Email daxil edin' : null,
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Şifrə
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: TextFormField(
                        controller: _passwordController,
                        obscureText: _obscure,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _login(),
                        style: const TextStyle(fontSize: 15),
                        decoration: InputDecoration(
                          hintText: 'Şifrə',
                          hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                          prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF94A3B8), size: 20),
                          suffixIcon: GestureDetector(
                            onTap: () => setState(() => _obscure = !_obscure),
                            child: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: const Color(0xFF94A3B8), size: 20),
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        ),
                        validator: (v) => (v == null || v.isEmpty) ? 'Şifrə daxil edin' : null,
                      ),
                    ),

                    // Error
                    if (authState.error != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 18),
                            const SizedBox(width: 8),
                            Expanded(child: Text(authState.error!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 13))),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Daxil ol düyməsi
                    GestureDetector(
                      onTap: authState.isLoading ? null : _login,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        height: 54,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF4F46E5)]),
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [BoxShadow(color: const Color(0xFF4F46E5).withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 6))],
                        ),
                        child: Center(
                          child: authState.isLoading
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                            : const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text('Daxil ol', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                                  SizedBox(width: 8),
                                  Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20),
                                ],
                              ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 30),

                    // Test hesabları
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Test hesabları', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey.shade400)),
                          const SizedBox(height: 8),
                          ...[
                            {'name': 'Həsən (Admin)', 'email': 'hasan@techflow.az'},
                            {'name': 'Leyla (Müdir)', 'email': 'leyla@techflow.az'},
                            {'name': 'Nigar (İşçi)', 'email': 'nigar@techflow.az'},
                          ].map((u) => GestureDetector(
                            onTap: () {
                              _emailController.text = u['email']!;
                              _passwordController.text = '123456';
                              setState(() {});
                            },
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 28, height: 28,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF4F46E5).withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Center(child: Text(u['name']![0], style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF4F46E5)))),
                                  ),
                                  const SizedBox(width: 10),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(u['name']!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                      Text(u['email']!, style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                                    ],
                                  ),
                                  const Spacer(),
                                  Icon(Icons.arrow_forward_ios, size: 12, color: Colors.grey.shade400),
                                ],
                              ),
                            ),
                          )),
                        ],
                      ),
                    ),

                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
