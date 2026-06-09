import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
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
import CalendarScreen from './src/screens/CalendarScreen';
import FriendScreen from './src/screens/FriendScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { COLORS, SHADOW } from './src/constants';
import { UserProfile } from './src/types/auth';

// ── 내정보 탭 ─────────────────────────────────────────────────
function MyInfoScreen() {
  const navigation = useNavigation<any>();
  const { characterName, profileEmoji } = useGame();

  return (
    <View style={placeholder.container}>
      <Text style={placeholder.avatarEmoji}>{profileEmoji || '🐱'}</Text>
      <Text style={placeholder.name}>{characterName || '스웨더'}</Text>
      <Text style={placeholder.sub}>프로필 기능 준비 중이에요.</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Admin')}
        style={placeholder.adminBtn}
        activeOpacity={0.7}
      >
        <Text style={placeholder.adminBtnText}>🔒 관리자</Text>
      </TouchableOpacity>
    </View>
  );
}

const placeholder = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: 10 },
  avatarEmoji: { fontSize: 72 },
  name: { fontSize: 22, color: COLORS.text, fontFamily: 'GmarketSans-Light' },
  sub:  { fontSize: 14, color: '#888', fontFamily: 'GmarketSans-Light' },
  adminBtn: {
    position: 'absolute', bottom: 32,
    backgroundColor: COLORS.card, borderRadius: 9999,
    paddingHorizontal: 20, paddingVertical: 8, ...SHADOW,
  },
  adminBtnText: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'GmarketSans-Light' },
});

// ── Navigators ────────────────────────────────────────────────
const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
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
      <Tab.Screen name="내정보" component={MyInfoScreen} />
    </Tab.Navigator>
  );
}

// ── 인증 상태 ─────────────────────────────────────────────────
type AuthState = 'loading' | 'login' | 'register' | 'app';

// ── 앱 본체 (GameProvider 안에서 useGame 접근 가능) ───────────
function AppContent() {
  const { setCharacterName, setProfileEmoji } = useGame();
  const [auth, setAuth] = useState<AuthState>('loading');

  /* 앱 시작 시 로그인 상태 확인 */
  useEffect(() => {
    (async () => {
      try {
        const activeUser = await AsyncStorage.getItem('@active_user');
        if (activeUser) {
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
      } catch { /* 무시 */ }
      setAuth('login');
    })();
  }, []);

  /* 로그인 성공 */
  const handleLogin = (profile: UserProfile) => {
    setCharacterName(profile.username);
    setProfileEmoji(profile.emoji);
    setAuth('app');
  };

  /* 가입 완료 */
  const handleRegisterComplete = (profile: UserProfile) => {
    setCharacterName(profile.username);
    setProfileEmoji(profile.emoji);
    setAuth('app');
  };

  /* 로딩 중 */
  if (auth === 'loading') {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  }

  /* 로그인 화면 */
  if (auth === 'login') {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onRegister={() => setAuth('register')}
      />
    );
  }

  /* 가입 화면 */
  if (auth === 'register') {
    return (
      <RegisterScreen
        onComplete={handleRegisterComplete}
        onBack={() => setAuth('login')}
      />
    );
  }

  /* 메인 앱 */
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main"     component={HomeTabs} />
        <Stack.Screen name="MoodLog"  component={MoodLogScreen}  options={{ presentation: 'modal' }} />
        <Stack.Screen name="Mission"  component={MissionScreen}  options={{ presentation: 'modal' }} />
        <Stack.Screen name="Running"  component={RunningScreen}  options={{ presentation: 'modal' }} />
        <Stack.Screen name="Exchange" component={ExchangeScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Admin"    component={AdminScreen}    options={{ presentation: 'modal' }} />
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

  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
