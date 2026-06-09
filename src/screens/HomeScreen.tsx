import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../store/GameContext';
import { COLORS, FONTS, MOODS, SHADOW } from '../constants';

const isWeb = Platform.OS === 'web';

const MENU_ROW1 = [
  { label: '감정 기록', emoji: '📔', screen: 'MoodLog' },
  { label: '미션',      emoji: '🚩', screen: 'Mission'  },
  { label: '러닝',      emoji: '👟', screen: 'Running'  },
] as const;

const MENU_ROW2 = [
  { label: '환전소',  emoji: '🔄', screen: 'Exchange' },
  { label: '컬렉션',  emoji: '⭐', screen: null       },
] as const;

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { energy, sweatPoints, currentMood } = useGame();
  const moodInfo = MOODS.find(m => m.id === currentMood);

  return (
    <View style={styles.outerWrap}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 헤더 ────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.logo}>S.WEATHER LAND</Text>
            <TouchableOpacity style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* ── 상단 카드 2개 ─────────────────────── */}
          <View style={styles.topCards}>
            <View style={styles.greetCard}>
              <Text style={styles.greetText}>{'안녕, 오늘도\n잘 왔어!'}</Text>
              <Text style={styles.greetSub}>오늘도 함께해서 좋아 ☺️</Text>
            </View>
            <View style={styles.weatherCard}>
              <Text style={styles.weatherCardTitle}>오늘의 날씨 무드</Text>
              <Text style={styles.weatherCardEmoji}>{moodInfo?.emoji ?? '⛅'}</Text>
              <Text style={styles.weatherCardName}>{moodInfo?.weather ?? '맑음'}</Text>
              <Text style={styles.weatherCardSub}>
                {moodInfo ? `${moodInfo.label}한 하루예요!` : '기분이 포근한 하루에요!'}
              </Text>
            </View>
          </View>

          {/* ── 에너지 / 땀방울 카드 ─────────────── */}
          <View style={styles.energyCard}>
            <View style={styles.energyLabelRow}>
              <Ionicons name="heart" size={16} color={COLORS.navy} />
              <Text style={styles.energyLabel}>에너지</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.energyValue}>{energy} / 100</Text>
            </View>
            <View style={styles.energyBarBg}>
              <View style={[styles.energyBarFill, { width: `${energy}%` as `${number}%` }]} />
            </View>
            <View style={styles.energyDivider} />
            <View style={styles.sweatRow}>
              <Text style={styles.sweatEmoji}>💧</Text>
              <Text style={styles.sweatLabel}>땀방울</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.sweatValue}>{sweatPoints.toLocaleString()}</Text>
              <Text style={styles.sweatUnit}>포인트</Text>
            </View>
          </View>

          {/* ── 메뉴 그리드 ──────────────────────── */}
          <View style={styles.menuRow}>
            {MENU_ROW1.map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <View style={styles.menuIconBox}>
                  <Text style={styles.menuEmoji}>{item.emoji}</Text>
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.menuRow, styles.menuRow2]}>
            {MENU_ROW2.map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={() => item.screen && navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <View style={styles.menuIconBox}>
                  <Text style={styles.menuEmoji}>{item.emoji}</Text>
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: isWeb ? '#F5F5F5' : COLORS.bg,
    alignItems: isWeb ? 'center' : 'stretch',
  },
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    width: isWeb ? 390 : '100%',
  },
  scroll: { paddingBottom: 36 },

  // ── 헤더 ──────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  logo: { fontSize: 19, fontWeight: '800', color: COLORS.navy, letterSpacing: 1.5, fontFamily: FONTS.bold },
  bellBtn: {
    width: 36, height: 36, borderRadius: 9999,
    backgroundColor: COLORS.card,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },

  // ── 상단 카드 ──────────────────────────────────
  topCards: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  greetCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  greetText: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 22, marginBottom: 4, fontFamily: FONTS.bold },
  greetSub: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.medium },
  weatherCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 20, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  weatherCardTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6, letterSpacing: 0.5, fontFamily: FONTS.medium },
  weatherCardEmoji: { fontSize: 32 },
  weatherCardName: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 4, fontFamily: FONTS.bold },
  weatherCardSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 3, textAlign: 'center', fontFamily: FONTS.medium },

  // ── 에너지 카드 ────────────────────────────────
  energyCard: {
    marginHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 20, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  energyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  energyLabel:  { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.bold },
  energyValue:  { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.medium },
  energyBarBg: { height: 10, backgroundColor: COLORS.navyLight, borderRadius: 9999, overflow: 'hidden' },
  energyBarFill: { height: '100%', backgroundColor: COLORS.navy, borderRadius: 9999 },
  energyDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  sweatRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sweatEmoji: { fontSize: 16 },
  sweatLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.bold },
  sweatValue: { fontSize: 16, fontWeight: '800', color: COLORS.navy, fontFamily: FONTS.bold },
  sweatUnit:  { fontSize: 12, color: COLORS.textMuted, paddingBottom: 1, fontFamily: FONTS.medium },

  // ── 메뉴 그리드 ────────────────────────────────
  menuRow:  { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  menuRow2: { justifyContent: 'center', maxWidth: 360 },
  menuItem: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 20, paddingVertical: 18, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  menuIconBox: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: COLORS.navyLight,
    justifyContent: 'center', alignItems: 'center',
  },
  menuEmoji: { fontSize: 24 },
  menuLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.bold },
});
