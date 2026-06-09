import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { GameProvider } from './src/store/GameContext';
import HomeScreen     from './src/screens-clean/HomeScreen';
import MoodLogScreen  from './src/screens-clean/MoodLogScreen';
import MissionScreen  from './src/screens-clean/MissionScreen';
import RunningScreen  from './src/screens-clean/RunningScreen';
import ExchangeScreen from './src/screens-clean/ExchangeScreen';
import AdminScreen    from './src/screens-clean/AdminScreen';
import CalendarScreen from './src/screens-clean/CalendarScreen';
import FriendScreen   from './src/screens-clean/FriendScreen';

// ── 탭 아이콘 (Ionicons 없이 이모지로 대체) ─────────────────────────────────
const TAB_ICONS: Record<string, string> = {
  홈:     '🏠',
  달력:   '📅',
  친구:   '👥',
  내정보: '👤',
};

// ── 내정보 탭 ────────────────────────────────────────────────────────────────
function MyInfoScreen() {
  const navigation = useNavigation<any>();
  return (
    <View style={info.container}>
      <Text style={info.emoji}>🚧</Text>
      <Text style={info.title}>내정보</Text>
      <Text style={info.sub}>준비 중이에요. 조금만 기다려줘!</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Admin')}
        style={info.adminBtn}
        activeOpacity={0.7}
      >
        <Text style={info.adminBtnText}>🔒 관리자</Text>
      </TouchableOpacity>
    </View>
  );
}

const info = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#FEFAE6', alignItems: 'center', justifyContent: 'center', gap: 12 },
  emoji:        { fontSize: 64 },
  title:        { fontSize: 22, fontWeight: '700', color: '#3D3224' },
  sub:          { fontSize: 14, color: '#888888' },
  adminBtn:     {
    position: 'absolute', bottom: 32,
    backgroundColor: '#FFFFFF', borderRadius: 9999,
    paddingHorizontal: 20, paddingVertical: 8,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  adminBtnText: { fontSize: 12, color: '#888888', fontWeight: '600' },
});

// ── 네비게이터 ───────────────────────────────────────────────────────────────
const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F0F0F0' },
        tabBarActiveTintColor:   '#5C9E4A',
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
            {TAB_ICONS[route.name] ?? '●'}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="홈"     component={HomeScreen} />
      <Tab.Screen name="달력"   component={CalendarScreen} />
      <Tab.Screen name="친구"   component={FriendScreen} />
      <Tab.Screen name="내정보" component={MyInfoScreen} />
    </Tab.Navigator>
  );
}

// ── 앱 루트 ──────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // 웹 전용: 한글/영문 둥근 폰트 주입
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Jua&family=Nunito:wght@400;600;700;800&display=swap');
      body { font-family: 'Jua', 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif; }
      [class*="css-text-"], [class*="r-fontSize"] {
        font-family: 'Jua', 'Nunito', -apple-system, sans-serif;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <GameProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* 메인 탭 */}
          <Stack.Screen name="Main" component={HomeTabs} />

          {/* 모달 스크린 */}
          <Stack.Screen name="MoodLog"  component={MoodLogScreen}  options={{ presentation: 'modal' }} />
          <Stack.Screen name="Mission"  component={MissionScreen}  options={{ presentation: 'modal' }} />
          <Stack.Screen name="Running"  component={RunningScreen}  options={{ presentation: 'modal' }} />
          <Stack.Screen name="Exchange" component={ExchangeScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Admin"    component={AdminScreen}    options={{ presentation: 'modal' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GameProvider>
  );
}
