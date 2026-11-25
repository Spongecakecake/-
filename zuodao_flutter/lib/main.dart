// 「做到」App MVP · Flutter · Material Design 3
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'session.dart';
import 'theme.dart';
import 'ui.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/create_goal_screen.dart';
import 'screens/goal_detail_screen.dart';
import 'screens/invite_screen.dart';
import 'screens/memoir_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));
  final session = Session();
  session.init();
  runApp(ZuodaoApp(session: session));
}

class ZuodaoApp extends StatelessWidget {
  final Session session;
  const ZuodaoApp({super.key, required this.session});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '做到',
      debugShowCheckedModeBanner: false,
      theme: kTheme,
      navigatorObservers: [routeObserver],
      home: SessionScope(notifier: session, child: const RootGate()),
      onGenerateRoute: (settings) {
        final args = settings.arguments;
        switch (settings.name) {
          case '/create':
            return MaterialPageRoute(builder: (_) => const CreateGoalScreen());
          case '/detail':
            return MaterialPageRoute(
                builder: (_) => GoalDetailScreen(id: args as String));
          case '/invite':
            return MaterialPageRoute(
                builder: (_) => InviteScreen(initialCode: args as String?));
          case '/memoir':
            return MaterialPageRoute(
                builder: (_) => MemoirScreen(id: args as String));
        }
        return null;
      },
    );
  }
}

/// 根路由：未登录 → 登录页；已登录 → 双 Tab
class RootGate extends StatelessWidget {
  const RootGate({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    if (!session.ready) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return session.user == null ? const LoginScreen() : const RootTabs();
  }
}

class RootTabs extends StatefulWidget {
  const RootTabs({super.key});

  @override
  State<RootTabs> createState() => _RootTabsState();
}

class _RootTabsState extends State<RootTabs> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          HomeScreen(onProfile: () => setState(() => _index = 1)),
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          NavigationDestination(
            icon: _tabIcon('约', false),
            selectedIcon: _tabIcon('约', true),
            label: '契约',
          ),
          NavigationDestination(
            icon: _tabIcon('我', false),
            selectedIcon: _tabIcon('我', true),
            label: '我的',
          ),
        ],
      ),
    );
  }

  Widget _tabIcon(String ch, bool on) => Container(
        width: 56,
        height: 30,
        decoration: BoxDecoration(
          color: on ? C.secondaryContainer : Colors.transparent,
          borderRadius: BorderRadius.circular(15),
        ),
        alignment: Alignment.center,
        child: Text(
          ch,
          style: TextStyle(
            fontSize: 14,
            fontWeight: on ? FontWeight.w700 : FontWeight.w500,
            color: on ? C.onSecondaryContainer : C.onSurfaceVariant,
          ),
        ),
      );
}
