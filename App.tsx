import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { GameProvider, useGame } from './src/store/GameContext';
import HomeScreen from './src/screens/HomeScreen';
import MoodLogScreen from './src/screens/MoodLogScreen';
import MissionScreen from './src/screens/MissionScreen';
import RunningScreen from './src/screens/RunningScreen';
import ExchangeScreen from './src/screens/ExchangeScreen';
import AdminScreen from './src/screens/AdminScreen';
import AdminPortalScreen from './src/screens/AdminPortalScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import FriendScreen from './src/screens/FriendScreen';
import MyInfoScreen from './src/screens/MyInfoScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ReportScreen from './src/screens/ReportScreen';
import { COLORS } from './src/constants';
import { UserProfile } from './src/types/auth';
import { Session } from './src/lib/session';

// ── Navigators ────────────────────────────────────────────────
const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F0F0F0' },
        tabBarActiveTintColor:   COLORS.navy,
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'GmarketSans-Light' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            홈:     'home',
            달력:   'calendar',
            친구:   'people-outline',
            내정보: 'person',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="홈"     component={HomeScreen} />
      <Tab.Screen name="달력"   component={CalendarScreen} />
      <Tab.Screen name="친구"   component={FriendScreen} />
      <Tab.Screen name="내정보">
        {() => <MyInfoScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ── 인증 상태 ─────────────────────────────────────────────────
type AuthState = 'loading' | 'login' | 'register' | 'app';

// ── 앱 본체 ───────────────────────────────────────────────────
function AppContent() {
  const { setCharacterName, setProfileEmoji, initUserData } = useGame();
  const [auth, setAuth] = useState<AuthState>('loading');

  const handleLogout = () => setAuth('login');

  /* 앱 시작: 세션 확인 → Supabase에서 프로필 복원 */
  useEffect(() => {
    (async () => {
      try {
        const activeUser = await Session.getItem('@active_user');
        if (activeUser) {
          /* Supabase에서 먼저 조회 */
          try {
            const { supabase } = await import('./src/lib/supabase');
            const { data } = await (supabase as any)
              .from('user_profiles').select('username,emoji').eq('username', activeUser).maybeSingle();
            if (data) {
              setCharacterName(data.username);
              setProfileEmoji(data.emoji || '🐱');
              try {
                const { loadUserGameData } = await import('./src/lib/supabase');
                const gd = await loadUserGameData(data.username);
                initUserData({
                  username:    data.username,
                  sweatPoints: gd?.sweatPoints ?? 0,
                  statusMsg:   gd?.statusMsg   ?? '',
                  friendCode:  gd?.friendCode  ?? '',
                });
              } catch {}
              setAuth('app');
              return;
            }
          } catch {}
          /* 로컬 fallback */
          const raw = await AsyncStorage.getItem('@user_profiles');
          const list: UserProfile[] = raw ? JSON.parse(raw) : [];
          const profile = list.find(p => p.username === activeUser);
          if (profile) {
            setCharacterName(profile.username);
            setProfileEmoji(profile.emoji);
            setAuth('app');
            return;
          }
        }
      } catch {}
      setAuth('login');
    })();

    /* 웹 단축키: Ctrl+Shift+A → 관리자 포털 (새 탭) */
    if (Platform.OS === 'web') {
      const onKey = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
          e.preventDefault();
          window.open(window.location.origin + '/#admin', '_blank');
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, []);

  const handleLogin = (profile: UserProfile) => {
    setCharacterName(profile.username);
    setProfileEmoji(profile.emoji);
    (async () => {
      try {
        const { loadUserGameData } = await import('./src/lib/supabase');
        const gd = await loadUserGameData(profile.username);
        initUserData({
          username:    profile.username,
          sweatPoints: gd?.sweatPoints ?? 0,
          statusMsg:   gd?.statusMsg   ?? '',
          friendCode:  gd?.friendCode  ?? '',
        });
      } catch {}
    })();
    setAuth('app');
  };

  const handleRegisterComplete = (profile: UserProfile) => {
    setCharacterName(profile.username);
    setProfileEmoji(profile.emoji);
    initUserData({
      username:    profile.username,
      sweatPoints: 0,
      statusMsg:   '',
      friendCode:  profile.friendCode ?? '',
    });
    setAuth('app');
  };

  if (auth === 'loading')  return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  if (auth === 'login')    return <LoginScreen onLogin={handleLogin} onRegister={() => setAuth('register')} />;
  if (auth === 'register') return <RegisterScreen onComplete={handleRegisterComplete} onBack={() => setAuth('login')} />;

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main">
          {() => <HomeTabs onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen name="MoodLog"  component={MoodLogScreen}  options={{ presentation: 'modal' }} />
        <Stack.Screen name="Mission"  component={MissionScreen}  options={{ presentation: 'modal' }} />
        <Stack.Screen name="Running"  component={RunningScreen}  options={{ presentation: 'modal' }} />
        <Stack.Screen name="Exchange" component={ExchangeScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Admin"    component={AdminScreen}    options={{ presentation: 'modal' }} />
        <Stack.Screen name="Report"   component={ReportScreen}   options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── 루트 ──────────────────────────────────────────────────────
export default function App() {
  useFonts({
    'GmarketSans-Light':  require('./assets/fonts/GmarketSansTTFLight.ttf'),
    'GmarketSans-Medium': require('./assets/fonts/GmarketSansTTFMedium.ttf'),
    'GmarketSans-Bold':   require('./assets/fonts/GmarketSansTTFBold.ttf'),
  });

  /* 웹에서 URL 해시가 #admin 이면 관리자 포털을 직접 렌더 */
  if (Platform.OS === 'web') {
    try {
      if (window.location.hash === '#admin') {
        return <AdminPortalScreen />;
      }
    } catch {}
  }

  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
