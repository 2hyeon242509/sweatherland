import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGame } from '../store/GameContext';
import { COLORS, MISSIONS, Mission, SHADOW } from '../constants';

const STAT_LABELS: Record<string, string> = {
  vitality: '활력', calm: '고요', connect: '연결', creative: '창의', care: '돌봄',
};

const CONFETTI_COLORS = ['#2A5480', '#1A3A52', '#B7B8B9', '#5F5A58', '#E8EEF4', '#000000'];
const N_PARTICLES = 40;
const USE_ND = Platform.OS !== 'web';

function getTodayKST(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

interface ParticleData {
  id: number; x: number; color: string; size: number;
  isCircle: boolean; drift: number; duration: number; delay: number;
}

function ConfettiParticle({ p, active }: { p: ParticleData; active: boolean }) {
  const ty     = useRef(new Animated.Value(-30)).current;
  const tx     = useRef(new Animated.Value(0)).current;
  const opac   = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    ty.setValue(-30); tx.setValue(0); opac.setValue(1); rotate.setValue(0);
    Animated.parallel([
      Animated.timing(ty, { toValue: 900, duration: p.duration, delay: p.delay, useNativeDriver: USE_ND }),
      Animated.timing(tx, { toValue: p.drift, duration: p.duration * 0.8, delay: p.delay, useNativeDriver: USE_ND }),
      Animated.timing(rotate, { toValue: 1, duration: p.duration * 0.7, delay: p.delay, useNativeDriver: USE_ND }),
      Animated.sequence([
        Animated.delay(p.delay + p.duration - 500),
        Animated.timing(opac, { toValue: 0, duration: 500, useNativeDriver: USE_ND }),
      ]),
    ]).start();
  }, [active]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: -30, left: p.x,
        width: p.size, height: p.isCircle ? p.size : p.size * 0.5,
        borderRadius: p.isCircle ? p.size / 2 : 2,
        backgroundColor: p.color, opacity: opac,
        transform: [{ translateY: ty }, { translateX: tx }, { rotate: spin }],
      }}
    />
  );
}

export default function MissionScreen() {
  const navigation = useNavigation();
  const { completedMissions, completeMission, resetMissions, sweatPoints } = useGame();

  const [confirmTarget, setConfirmTarget] = useState<Mission | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  useEffect(() => {
    (async () => {
      const today = getTodayKST();
      const stored = await AsyncStorage.getItem('@mission_reset_date').catch(() => null);
      if (stored !== today) {
        resetMissions();
        await AsyncStorage.setItem('@mission_reset_date', today).catch(() => {});
      }
    })();
  }, []);

  const handleConfirm = () => {
    if (!confirmTarget) return;
    completeMission(confirmTarget.id, confirmTarget.points, confirmTarget.stat);
    const isLast = completedMissions.length + 1 >= MISSIONS.length;
    setConfirmTarget(null);
    if (isLast) setShowCelebrate(true);
  };

  const particles = useMemo<ParticleData[]>(() =>
    Array.from({ length: N_PARTICLES }, (_, i) => ({
      id: i,
      x: Math.random() * 390,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 10,
      isCircle: Math.random() > 0.4,
      drift: (Math.random() - 0.5) * 120,
      duration: 2200 + Math.random() * 1200,
      delay: Math.random() * 700,
    })),
  []);

  const renderItem = ({ item }: { item: Mission }) => {
    const done = completedMissions.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.item, done && styles.itemDone]}
        onPress={() => !done && setConfirmTarget(item)}
        activeOpacity={done ? 1 : 0.7}
      >
        <Text style={styles.itemEmoji}>{item.emoji}</Text>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemLabel, done && styles.itemLabelDone]}>{item.label}</Text>
          <Text style={styles.itemMeta}>{STAT_LABELS[item.stat]} +{item.points} 💧</Text>
        </View>
        {done
          ? <Ionicons name="checkmark-circle" size={26} color={COLORS.navy} />
          : <View style={styles.circle} />
        }
      </TouchableOpacity>
    );
  };

  const doneCount = completedMissions.length;

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── 헤더 ────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>오늘의 미션</Text>
        <View style={styles.sweatChip}>
          <Text style={styles.sweatChipEmoji}>💧</Text>
          <Text style={styles.sweatChipNum}>{sweatPoints}</Text>
        </View>
      </View>

      {/* ── 진행 바 ─────────────────────────────────── */}
      <View style={styles.progress}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressText}>{doneCount} / {MISSIONS.length} 완료</Text>
          <Text style={styles.progressPct}>{Math.round((doneCount / MISSIONS.length) * 100)}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(doneCount / MISSIONS.length) * 100}%` as `${number}%` }]} />
        </View>
      </View>

      {/* ── 미션 목록 ───────────────────────────────── */}
      <FlatList
        data={MISSIONS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* ── 활동 확인 모달 ──────────────────────────── */}
      {confirmTarget && (
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>{confirmTarget.emoji}</Text>
            <Text style={styles.modalTitle}>활동 확인</Text>
            <Text style={styles.modalBody}>
              <Text style={{ fontWeight: '700' }}>"{confirmTarget.label}"</Text>
              {'\n'}정말 완료했나요?
            </Text>
            <Text style={styles.modalReward}>💧 +{confirmTarget.points} 포인트 적립</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmTarget(null)} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
                <Text style={styles.confirmBtnText}>네, 했어요! ✅</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── 전체 완료 축하 (폭죽) ──────────────────── */}
      {showCelebrate && (
        <View style={styles.overlay}>
          {particles.map(p => (
            <ConfettiParticle key={p.id} p={p} active={showCelebrate} />
          ))}
          <View style={styles.celebCard}>
            <Text style={styles.celebEmoji}>🎊</Text>
            <Text style={styles.celebTitle}>모든 미션 완료!</Text>
            <Text style={styles.celebSub}>
              {'오늘 하루 정말 대단했어!\n이 기분을 감정 워크북에 남겨봐 💙'}
            </Text>
            <Text style={styles.celebReward}>
              💧 총 {sweatPoints} 포인트 적립 완료!
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, { width: '100%', marginTop: 8 }]}
              onPress={() => setShowCelebrate(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>고마워, 최고야! 🌟</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  sweatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.navyLight, borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sweatChipEmoji: { fontSize: 14 },
  sweatChipNum: { fontSize: 13, fontWeight: '700', color: COLORS.navy },

  progress: {
    paddingHorizontal: 20, marginBottom: 14,
    backgroundColor: COLORS.navyLight,
    marginHorizontal: 16, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  progressPct: { fontSize: 13, fontWeight: '700', color: COLORS.navy },
  progressBarBg: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.navy, borderRadius: 4 },

  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  itemDone: { opacity: 0.55 },
  itemEmoji: { fontSize: 28 },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  itemLabelDone: { textDecorationLine: 'line-through', color: COLORS.border },
  itemMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: COLORS.border },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%', backgroundColor: COLORS.card, borderRadius: 24, padding: 28,
    alignItems: 'center', gap: 8, ...SHADOW,
  },
  modalEmoji: { fontSize: 52, marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalBody: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 21 },
  modalReward: {
    fontSize: 13, fontWeight: '700', color: COLORS.navy,
    backgroundColor: COLORS.navyLight, borderRadius: 9999,
    paddingHorizontal: 14, paddingVertical: 5, marginTop: 4,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 12, width: '100%' },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.navyLight, borderRadius: 9999,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
  confirmBtn: {
    flex: 1, backgroundColor: COLORS.navy, borderRadius: 9999,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: COLORS.navyDark, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  celebCard: {
    width: '100%', backgroundColor: COLORS.card, borderRadius: 28, padding: 32,
    alignItems: 'center', gap: 10, ...SHADOW,
  },
  celebEmoji: { fontSize: 72 },
  celebTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  celebSub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  celebReward: {
    fontSize: 14, fontWeight: '700', color: COLORS.navy,
    backgroundColor: COLORS.navyLight, borderRadius: 9999,
    paddingHorizontal: 16, paddingVertical: 6, marginTop: 4,
  },
});
