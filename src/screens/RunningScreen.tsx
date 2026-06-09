import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../store/GameContext';
import { COLORS, SHADOW } from '../constants';

const MOCK_HISTORY = [
  { date: '2024.05.21  12:10', from: 500, to: 50 },
  { date: '2024.05.18  09:34', from: 200, to: 20 },
];

const BONUS_RATE = 20;
const isWeb = Platform.OS === 'web';

export default function RunningScreen() {
  const navigation = useNavigation();
  const { energy, sweatPoints, exchangeSweatToEnergy } = useGame();
  const [historyList] = useState(MOCK_HISTORY);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'warn' | ''>('');

  const canExchange = sweatPoints >= 100;

  const handleExchange = () => {
    if (!canExchange) {
      setMessage('100 마일리지가 필요해요. 조금 더 움직여볼까요?');
      setMessageType('warn');
      return;
    }
    exchangeSweatToEnergy();
    setMessage('환전 완료! 🔥 100 마일리지 → 마음에너지 +10 이 적립됐어!');
    setMessageType('success');
  };

  return (
    <View style={styles.outerWrap}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ──────────────────────────────── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>러닝 환전소</Text>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="help-circle-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* ── Hero Banner (텍스트 전용) ────────────── */}
          <View style={styles.heroBanner}>
            <Text style={styles.heroBannerLabel}>러닝 마일리지</Text>
            <Text style={styles.heroBannerTitle}>
              {'달릴수록 쌓이는 마일리지!\n에너지로 환전해보세요.'}
            </Text>
          </View>

          {/* ── Mileage Display ─────────────────────── */}
          <View style={styles.mileageSection}>
            <Text style={styles.mileageSectionLabel}>보유 마일리지</Text>
            <View style={styles.mileageRow}>
              <Text style={styles.mileageShoe}>👟</Text>
              <Text style={styles.mileageNumber}>{sweatPoints.toLocaleString()}</Text>
              <Text style={styles.mileageUnit}>마일</Text>
            </View>
          </View>

          {/* ── Exchange Rate Card ──────────────────── */}
          <View style={styles.exchangeRateCard}>
            <View style={[styles.rateBox, { backgroundColor: COLORS.navyLight }]}>
              <Text style={styles.rateBoxEmoji}>👟</Text>
              <Text style={styles.rateBoxNum}>100</Text>
              <Text style={styles.rateBoxUnit}>마일리지</Text>
            </View>
            <View style={styles.arrowWrap}>
              <Ionicons name="arrow-forward" size={24} color={COLORS.navy} />
            </View>
            <View style={[styles.rateBox, { backgroundColor: COLORS.navyLight }]}>
              <Ionicons name="heart" size={28} color={COLORS.navy} />
              <Text style={[styles.rateBoxNum, { color: COLORS.navy }]}>10</Text>
              <Text style={[styles.rateBoxUnit, { color: COLORS.navy }]}>에너지</Text>
            </View>
          </View>

          {/* ── Bonus Card ──────────────────────────── */}
          <View style={styles.bonusCard}>
            <View style={styles.bonusLeft}>
              <View style={styles.bonusBadge}>
                <Text style={styles.bonusBadgeText}>{BONUS_RATE}%</Text>
              </View>
              <View style={styles.bonusTextWrap}>
                <Text style={styles.bonusTitle}>오늘의 환전 보너스</Text>
                <Text style={styles.bonusDesc}>
                  러닝 3km 달성!{'\n'}환전 보너스 +{BONUS_RATE}% 적용 중
                </Text>
              </View>
            </View>
            <View style={styles.bonusStars}>
              <Text style={{ fontSize: 16 }}>✨</Text>
              <Text style={{ fontSize: 12 }}>✨</Text>
            </View>
          </View>

          {/* ── Current Energy Info ─────────────────── */}
          <View style={styles.energyInfo}>
            <Ionicons name="heart" size={14} color={COLORS.navy} />
            <Text style={styles.energyInfoText}>현재 마음에너지</Text>
            <Text style={styles.energyInfoVal}>{energy} / 100</Text>
          </View>

          {/* ── Result Message ──────────────────────── */}
          {message ? (
            <Text style={[
              styles.resultMsg,
              messageType === 'warn' && styles.resultMsgWarn,
            ]}>
              {message}
            </Text>
          ) : null}

          {/* ── Exchange Button ─────────────────────── */}
          <TouchableOpacity
            style={[styles.exchangeBtn, !canExchange && styles.exchangeBtnDisabled]}
            onPress={handleExchange}
            activeOpacity={0.85}
          >
            <Ionicons name="sync" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.exchangeBtnText}>환전하기</Text>
          </TouchableOpacity>

          {!canExchange && (
            <Text style={styles.notEnoughHint}>
              100 마일리지 이상 모아야 환전할 수 있어요
            </Text>
          )}

          {/* ── Recent History ──────────────────────── */}
          <View style={styles.historySection}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>최근 환전 내역</Text>
              <TouchableOpacity>
                <Text style={styles.sectionLink}>전체 보기 ›</Text>
              </TouchableOpacity>
            </View>

            {historyList.map((item, i) => (
              <View key={i} style={styles.historyItem}>
                <View style={styles.historyIconWrap}>
                  <Text style={{ fontSize: 18 }}>👟</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>{item.date}</Text>
                  <Text style={styles.historyDesc}>
                    {item.from} 마일 → {item.to} 에너지
                  </Text>
                </View>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>+{item.to}</Text>
                </View>
              </View>
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
  scroll: { paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  heroBanner: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 20, marginHorizontal: 16, marginBottom: 16,
    padding: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  heroBannerLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.navy,
    letterSpacing: 0.5, marginBottom: 8,
  },
  heroBannerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 22 },

  mileageSection: {
    backgroundColor: COLORS.card, borderRadius: 20, marginHorizontal: 16,
    padding: 20, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  mileageSectionLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, letterSpacing: 0.5,
  },
  mileageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  mileageShoe: { fontSize: 28 },
  mileageNumber: { fontSize: 40, fontWeight: '800', color: COLORS.text, lineHeight: 46 },
  mileageUnit: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted, paddingBottom: 5 },

  exchangeRateCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 20, marginHorizontal: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  rateBox: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  rateBoxEmoji: { fontSize: 28 },
  rateBoxNum: { fontSize: 22, fontWeight: '800', color: COLORS.navy },
  rateBoxUnit: { fontSize: 11, fontWeight: '600', color: COLORS.navy },
  arrowWrap: { paddingHorizontal: 14, alignItems: 'center' },

  bonusCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 20, marginHorizontal: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: COLORS.border, ...SHADOW,
  },
  bonusLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bonusBadge: { backgroundColor: COLORS.navy, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  bonusBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  bonusTextWrap: { flex: 1 },
  bonusTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  bonusDesc: { fontSize: 11, color: COLORS.textMuted, lineHeight: 17 },
  bonusStars: { alignItems: 'center' },

  energyInfo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginBottom: 10,
  },
  energyInfoText: { fontSize: 13, color: COLORS.textMuted },
  energyInfoVal: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  resultMsg: {
    textAlign: 'center', fontSize: 13, color: COLORS.navy,
    marginHorizontal: 16, marginBottom: 10, fontWeight: '600',
  },
  resultMsgWarn: { color: COLORS.navyDark },

  exchangeBtn: {
    flexDirection: 'row', backgroundColor: COLORS.navy, borderRadius: 18,
    marginHorizontal: 16, paddingVertical: 17, justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
    shadowColor: COLORS.navyDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  exchangeBtnDisabled: { backgroundColor: COLORS.border, shadowOpacity: 0, elevation: 0 },
  exchangeBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  notEnoughHint: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginBottom: 20 },

  historySection: {
    backgroundColor: COLORS.card, borderRadius: 20, marginHorizontal: 16,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  sectionLink: { fontSize: 12, color: COLORS.navy, fontWeight: '600' },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  historyIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.navyLight,
    justifyContent: 'center', alignItems: 'center',
  },
  historyDate: { fontSize: 11, color: COLORS.textMuted, marginBottom: 2 },
  historyDesc: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  historyBadge: {
    backgroundColor: COLORS.navyLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  historyBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.navy },
});
