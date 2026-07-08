import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../store/GameContext';
import { COLORS, FONTS, MOODS, SHADOW } from '../constants';
import SweatOutLogo from '../components/SweatOutLogo';
import {
  getTodayNotifications, getUnreadCount, markAllRead, AppNotification,
} from '../lib/notifications';

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

const CATEGORY_STYLES: Record<string, { bg: string; border: string }> = {
  '응원':    { bg: COLORS.navyLight,  border: COLORS.navy },
  '정신건강': { bg: '#F0FFF4',         border: '#48BB78'   },
  '활동':    { bg: '#FFF9E6',         border: '#F6C90E'   },
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { energy, sweatPoints, currentMood } = useGame();
  const moodInfo = MOODS.find(m => m.id === currentMood);

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const todayNotifs = getTodayNotifications();

  const refreshUnread = useCallback(async () => {
    const count = await getUnreadCount();
    setUnreadCount(count);
  }, []);

  useFocusEffect(useCallback(() => {
    refreshUnread();
  }, [refreshUnread]));

  const openNotifModal = async () => {
    setShowNotifModal(true);
    await markAllRead(todayNotifs.map(n => n.id));
    setUnreadCount(0);
  };

  const closeNotifModal = () => {
    setShowNotifModal(false);
  };

  return (
    <View style={styles.outerWrap}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 헤더 ────────────────────────────── */}
          <View style={styles.header}>
            <SweatOutLogo width={90} height={53} />
            <TouchableOpacity style={styles.bellBtn} onPress={openNotifModal} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
              {unreadCount > 0 && <View style={styles.bellBadge} />}
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

      {/* ── 알림 모달 ─────────────────────────── */}
      <Modal
        visible={showNotifModal}
        transparent
        animationType="slide"
        onRequestClose={closeNotifModal}
      >
        <View style={styles.notifOverlay}>
          <TouchableOpacity style={styles.notifDismissArea} onPress={closeNotifModal} activeOpacity={1} />
          <View style={styles.notifPanel}>
            {/* 헤더 */}
            <View style={styles.notifHeader}>
              <Text style={styles.notifHeaderTitle}>알림</Text>
              <TouchableOpacity style={styles.notifCloseBtn} onPress={closeNotifModal} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 알림 카드 목록 */}
            {todayNotifs.map(notif => {
              const catStyle = CATEGORY_STYLES[notif.category] ?? { bg: COLORS.navyLight, border: COLORS.navy };
              return (
                <View
                  key={notif.id}
                  style={[styles.notifCard, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}
                >
                  <View style={styles.notifCardTop}>
                    <Text style={styles.notifCardEmoji}>{notif.emoji}</Text>
                    <View style={styles.notifCardMeta}>
                      <View style={styles.notifCardMetaRow}>
                        <View style={[styles.notifCategoryChip, { borderColor: catStyle.border }]}>
                          <Text style={[styles.notifCategoryText, { color: catStyle.border }]}>{notif.category}</Text>
                        </View>
                        <Text style={styles.notifTime}>{notif.scheduledTime}</Text>
                      </View>
                      <Text style={styles.notifCardTitle}>{notif.title}</Text>
                    </View>
                  </View>
                  <Text style={styles.notifCardBody}>{notif.body}</Text>
                </View>
              );
            })}

            {/* 하단 안내 */}
            <Text style={styles.notifFooter}>알림은 매일 업데이트돼요</Text>
          </View>
        </View>
      </Modal>
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
  bellBtn: {
    width: 36, height: 36, borderRadius: 9999,
    backgroundColor: COLORS.card,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  bellBadge: {
    position: 'absolute', top: 7, right: 7,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E53E3E',
    borderWidth: 1.5, borderColor: COLORS.card,
  },

  // ── 상단 카드 ──────────────────────────────────
  topCards: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  greetCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  greetText: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 22, marginBottom: 4 },
  greetSub: { fontSize: 12, color: COLORS.textMuted },
  weatherCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 20, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  weatherCardTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6, letterSpacing: 0.5 },
  weatherCardEmoji: { fontSize: 32 },
  weatherCardName: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  weatherCardSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 3, textAlign: 'center' },

  // ── 에너지 카드 ────────────────────────────────
  energyCard: {
    marginHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 20, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  energyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  energyLabel:  { fontSize: 13, fontWeight: '700', color: COLORS.text },
  energyValue:  { fontSize: 12, color: COLORS.textMuted },
  energyBarBg: { height: 10, backgroundColor: COLORS.navyLight, borderRadius: 9999, overflow: 'hidden' },
  energyBarFill: { height: '100%', backgroundColor: COLORS.navy, borderRadius: 9999 },
  energyDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  sweatRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sweatEmoji: { fontSize: 16 },
  sweatLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sweatValue: { fontSize: 16, fontWeight: '800', color: COLORS.navy },
  sweatUnit:  { fontSize: 12, color: COLORS.textMuted, paddingBottom: 1 },

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
  menuLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  // ── 알림 모달 ──────────────────────────────────
  notifOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  notifDismissArea: {
    flex: 1,
  },
  notifPanel: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 12,
    ...SHADOW,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifHeaderTitle: {
    fontSize: 18, fontWeight: '800', color: COLORS.text,
  },
  notifCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.navyLight,
    justifyContent: 'center', alignItems: 'center',
  },
  notifCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },
  notifCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  notifCardEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  notifCardMeta: {
    flex: 1,
    gap: 4,
  },
  notifCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifCategoryChip: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  notifCategoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  notifTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  notifCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  notifCardBody: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
  },
  notifFooter: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
