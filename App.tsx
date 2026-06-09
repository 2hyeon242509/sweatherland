import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { GameProvider } from './src/store/GameContext';
import HomeScreen from './src/screens/HomeScreen';
import MoodLogScreen from './src/screens/MoodLogScreen';
import MissionScreen from './src/screens/MissionScreen';
import RunningScreen from './src/screens/RunningScreen';
import ExchangeScreen from './src/screens/ExchangeScreen';
import AdminScreen from './src/screens/AdminScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import FriendScreen from './src/screens/FriendScreen';
import { COLORS, SHADOW } from './src/constants';

// ── 내정보 탭 ─────────────────────────────────────────────────
function MyInfoScreen() {
  const navigation = useNavigation<any>();
  return (
    <View style={placeholder.container}>
      <Text style={placeholder.emoji}>🚧</Text>
      <Text style={placeholder.title}>내정보</Text>
      <Text style={placeholder.sub}>준비 중이에요. 조금만 기다려줘!</Text>
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
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emoji: { fontSize: 64 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, fontFamily: 'GmarketSans-Light' },
  sub: { fontSize: 14, color: '#888', fontFamily: 'GmarketSans-Light' },
  adminBtn: {
    position: 'absolute', bottom: 32,
    backgroundColor: COLORS.card, borderRadius: 9999,
    paddingHorizontal: 20, paddingVertical: 8, ...SHADOW,
  },
  adminBtnText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', fontFamily: 'GmarketSans-Light' },
});

// ── Navigators ────────────────────────────────────────────────
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F0F0F0' },
        tabBarActiveTintColor: COLORS.navy,
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

export default function App() {
  // useFonts → Metro 번들러가 TTF 파일을 빌드에 포함, web에서 @font-face 자동 등록
  useFonts({
    'GmarketSans-Light':  require('./assets/fonts/GmarketSansTTFLight.ttf'),
    'GmarketSans-Medium': require('./assets/fonts/GmarketSansTTFMedium.ttf'),
    'GmarketSans-Bold':   require('./assets/fonts/GmarketSansTTFBold.ttf'),
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    // !important 없이 적용 → Ionicons inline style이 우선순위 유지
    style.textContent = `
      body { font-family: 'GmarketSans-Light', -apple-system, sans-serif; }
      [class*="css-text-"] {
        font-family: 'GmarketSans-Light', -apple-system, sans-serif;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <GameProvider>
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
    </GameProvider>
  );
}
