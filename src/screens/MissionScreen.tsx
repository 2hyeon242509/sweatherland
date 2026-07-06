import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Modal,
  StyleSheet, SafeAreaView, Platform, Animated, KeyboardAvoidingView,
} from 'react-native';

const isWeb = Platform.OS === 'web';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGame } from '../store/GameContext';
import { COLORS, SHADOW, Mission, StatKey, getDailyServerMissions, MISSION_POOL } from '../constants';

/** 날짜 시드 기반으로 풀에서 count개 뽑기 */
function pickDailyMissions(dateStr: string, pool: Mission[], count = 5): Mission[] {
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = ((seed * 31 + dateStr.charCodeAt(i)) & 0xffffffff) >>> 0;
  }
  const copy = [...pool];
  const result: Mission[] = [];
  while (result.length < count && copy.length > 0) {
    seed = ((seed * 1664525 + 1013904223) & 0xffffffff) >>> 0;
    const idx = seed % copy.length;
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function getTodayKST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ── 컨페티 ────────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#2A5480', '#1A3A52', '#B7B8B9', '#5F5A58', '#E8EEF4', '#000000'];
const N_PARTICLES = 40;
const USE_ND = Platform.OS !== 'web';

interface ParticleData {
  id: number; x: number; color: string; size: number;
  isCircle: boolean; drift: number; duration: number; delay: number;
}

function ConfettiParticle({ p, active }: { p: ParticleData; active: boolean }) {
  const ty = useRef(new Animated.Value(-30)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const opac = useRef(new Animated.Value(0)).current;
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

// ── 가이드 힌트 ───────────────────────────────────────────────────────────────

const GUIDE_TIPS = [
  {
    icon: '🔁',
    title: '이미 하고 있는 걸 더 많이 해보기',
    body: '지금도 잘 하고 있는 일상적인 활동을 조금씩 늘려보세요. 매일 걷는 거리를 두 배로 늘리거나, 물을 한 잔 더 마시는 것처럼 작게 시작해도 충분해요.',
  },
  {
    icon: '🌿',
    title: '예전에 즐겨 했던 활동으로 돌아가기',
    body: '바쁘게 살다 보면 좋아하던 것들을 잊게 되죠. 오래된 취미, 즐겨 듣던 음악, 다니던 운동 코스 — 다시 꺼내봐요. 처음 시작이 어렵지, 하다 보면 설레는 마음이 돌아와요.',
  },
  {
    icon: '✨',
    title: '즐거운 활동 하나 골라 해보기',
    body: '나를 기분 좋게 만들어 주는 활동이 있다면 그걸 오늘 한 번만 해보세요. 즐거운 감정은 뇌에 진짜 신호로 전달돼요. 거창한 계획 없이, 딱 하나만 선택해도 충분해요.',
  },
];

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface ConfirmTarget {
  id:    string;
  label: string;
  emoji: string;
  points: number;
  stat:  StatKey;
}

interface CustomMissionsData {
  date:         string;
  missions:     string[];
  energyGiven:  boolean;
}

interface SwapData {
  date:     string;
  count:    number;
  missions: Mission[];
}

const CUSTOM_KEY     = '@custom_missions';
const SWAP_KEY       = '@server_mission_swaps';
const TOTAL_MISSIONS = 8;

export default function MissionScreen() {
  const navigation = useNavigation();
  const {
    completedMissions, completeMission, resetMissions,
    sweatPoints, addEnergy, recordAllMissionsToday, currentUsername,
  } = useGame();

  const today = getTodayKST();

  // ── 서버 미션 (Supabase 풀 우선, 없으면 로컬 상수 fallback) ─────────────────
  const [remotePool,     setRemotePool]     = useState<Mission[]>([]);
  const activePool = remotePool.length > 0 ? remotePool : MISSION_POOL;
  const baseMissions = useMemo(() => pickDailyMissions(today, activePool), [today, activePool]);
  const [swappedMissions, setSwappedMissions] = useState<Mission[] | null>(null);
  const [swapCount,       setSwapCount]       = useState(0);
  const effectiveMissions = swappedMissions ?? baseMissions;

  // ── 나만의 미션 ─────────────────────────────────────────────────────────────
  const [customMissions, setCustomMissions] = useState<string[]>(['', '', '']);
  const [energyGiven,    setEnergyGiven]    = useState(false);

  // ── UI 상태 ─────────────────────────────────────────────────────────────────
  const [showGuide,     setShowGuide]     = useState(false);
  const [showInput,     setShowInput]     = useState(false);
  const [inputSlot,     setInputSlot]     = useState<number>(0);
  const [inputText,     setInputText]     = useState('');
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [showEnergy,    setShowEnergy]    = useState(false);

  // ── 파티클 ──────────────────────────────────────────────────────────────────
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

  // ── Supabase 미션 풀 로드 ────────────────────────────────────────────────────
  useEffect(() => {
    import('../lib/supabase').then(({ fetchActiveMissions }) => {
      fetchActiveMissions().then(pool => { if (pool.length > 0) setRemotePool(pool); }).catch(() => {});
    });
  }, []);

  // ── 초기 로드 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const resetDate = await AsyncStorage.getItem('@mission_reset_date').catch(() => null);
      if (resetDate !== today) {
        resetMissions();
        await AsyncStorage.setItem('@mission_reset_date', today).catch(() => {});
      }
      const raw = await AsyncStorage.getItem(CUSTOM_KEY).catch(() => null);
      if (raw) {
        const data: CustomMissionsData = JSON.parse(raw);
        if (data.date === today) {
          setCustomMissions(data.missions.length === 3 ? data.missions : ['', '', '']);
          setEnergyGiven(data.energyGiven ?? false);
        }
      }
      const swapRaw = await AsyncStorage.getItem(SWAP_KEY).catch(() => null);
      if (swapRaw) {
        const swapData: SwapData = JSON.parse(swapRaw);
        if (swapData.date === today) {
          setSwapCount(swapData.count);
          setSwappedMissions(swapData.missions);
        }
      }
    })();
  }, []);

  // ── 나만의 미션 저장 ─────────────────────────────────────────────────────────
  const saveCustomMissions = async (missions: string[], eg: boolean) => {
    await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify({ date: today, missions, energyGiven: eg })).catch(() => {});
  };

  // ── 나만의 미션 추가 ─────────────────────────────────────────────────────────
  const openInputModal = (slot: number) => {
    setInputSlot(slot);
    setInputText(customMissions[slot] || '');
    setShowInput(true);
  };

  const confirmInput = async () => {
    const text = inputText.trim();
    if (!text) return;
    const next = [...customMissions];
    next[inputSlot] = text;
    setCustomMissions(next);
    setShowInput(false);
    setInputText('');

    const allFilled = next.every(t => t.length > 0);
    let newEnergyGiven = energyGiven;
    if (allFilled && !energyGiven) {
      addEnergy(10);
      setEnergyGiven(true);
      setShowEnergy(true);
      newEnergyGiven = true;
      setTimeout(() => setShowEnergy(false), 2500);
    }
    await saveCustomMissions(next, newEnergyGiven);
  };

  // ── 서버 미션 새로고침 (하루 3회) ───────────────────────────────────────────
  const swapMission = async (index: number) => {
    if (swapCount >= 3) return;
    const currentIds = new Set(effectiveMissions.map(m => m.id));
    const available = MISSION_POOL.filter(m => !currentIds.has(m.id));
    if (available.length === 0) return;
    const replacement = available[Math.floor(Math.random() * available.length)];
    const next = [...effectiveMissions];
    next[index] = replacement;
    const newCount = swapCount + 1;
    setSwappedMissions(next);
    setSwapCount(newCount);
    await AsyncStorage.setItem(SWAP_KEY, JSON.stringify({ date: today, count: newCount, missions: next })).catch(() => {});
  };

  // ── 미션 완료 처리 ───────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!confirmTarget) return;
    completeMission(confirmTarget.id, confirmTarget.points, confirmTarget.stat);
    setConfirmTarget(null);

    // Supabase에 미션 기록
    if (currentUsername) {
      const missionType = confirmTarget.id.startsWith('custom') ? 'custom' : 'server';
      import('../lib/supabase').then(({ saveMissionLog }) => {
        saveMissionLog({
          username:      currentUsername,
          mission_id:    confirmTarget.id,
          mission_label: confirmTarget.label,
          mission_type:  missionType,
          points:        confirmTarget.points,
          stat:          confirmTarget.stat,
          logged_at:     new Date(Date.now() + 9 * 3600 * 1000).toISOString(),
        }).catch(() => {});
      });
    }

    const newDone = completedMissions.length + 1;
    if (newDone >= TOTAL_MISSIONS) {
      setShowCelebrate(true);
      recordAllMissionsToday();
    }
  };

  // ── 진행 현황 ────────────────────────────────────────────────────────────────
  const filledCustomCount = customMissions.filter(t => t.length > 0).length;
  const doneCount         = completedMissions.length;

  return (
    <View style={s.outer}>
    <SafeAreaView style={s.safe}>

      {/* ── 헤더 ────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.title}>오늘의 미션</Text>
        <View style={s.sweatChip}>
          <Text style={s.sweatChipEmoji}>💧</Text>
          <Text style={s.sweatChipNum}>{sweatPoints}</Text>
        </View>
      </View>

      {/* ── 진행 바 (고정 /8) ───────────────────────── */}
      <View style={s.progress}>
        <View style={s.progressLabelRow}>
          <Text style={s.progressText}>{doneCount} / {TOTAL_MISSIONS} 완료</Text>
          <Text style={s.progressPct}>
            {Math.round((doneCount / TOTAL_MISSIONS) * 100)}%
          </Text>
        </View>
        <View style={s.progressBarBg}>
          <View style={[s.progressBarFill, {
            width: `${(doneCount / TOTAL_MISSIONS) * 100}%` as `${number}%`,
          }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>

        {/* ═══ 나만의 미션 섹션 ═════════════════════════ */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>나만의 미션</Text>
          <View style={s.sectionBadge}>
            <Text style={s.sectionBadgeText}>{filledCustomCount} / 3</Text>
          </View>
        </View>

        {/* 가이드 카드 */}
        <TouchableOpacity
          style={s.guideCard}
          onPress={() => setShowGuide(v => !v)}
          activeOpacity={0.8}
        >
          <View style={s.guideCardRow}>
            <Text style={s.guideCardIcon}>💡</Text>
            <Text style={s.guideCardTitle}>어떤 미션을 입력할까요?</Text>
            <Ionicons
              name={showGuide ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.navy}
            />
          </View>
          {showGuide && (
            <View style={s.guideTips}>
              {GUIDE_TIPS.map((tip, i) => (
                <View key={i} style={[s.guideTip, i < GUIDE_TIPS.length - 1 && s.guideTipBorder]}>
                  <Text style={s.guideTipIcon}>{tip.icon}</Text>
                  <View style={s.guideTipText}>
                    <Text style={s.guideTipTitle}>{tip.title}</Text>
                    <Text style={s.guideTipBody}>{tip.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* 나만의 미션 슬롯 */}
        {[0, 1, 2].map(i => {
          const text = customMissions[i];
          const done = completedMissions.includes(`custom_${i}`);
          const filled = text.length > 0;

          if (!filled) {
            return (
              <TouchableOpacity
                key={i}
                style={[s.item, s.itemEmpty]}
                onPress={() => openInputModal(i)}
                activeOpacity={0.7}
              >
                <Text style={s.itemEmoji}>➕</Text>
                <View style={s.itemInfo}>
                  <Text style={s.emptyLabel}>나만의 미션을 입력해봐요</Text>
                  <Text style={s.emptyHint}>탭해서 추가하기</Text>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={i}
              style={[s.item, done && s.itemDone]}
              onPress={() => !done && setConfirmTarget({ id: `custom_${i}`, label: text, emoji: '🌟', points: 10, stat: 'vitality' })}
              activeOpacity={done ? 1 : 0.7}
            >
              <Text style={s.itemEmoji}>🌟</Text>
              <View style={s.itemInfo}>
                <Text style={[s.itemLabel, done && s.itemLabelDone]}>{text}</Text>
                <Text style={s.itemMeta}>나만의 미션 • 활력 +10 💧</Text>
              </View>
              {done
                ? <Ionicons name="checkmark-circle" size={26} color={COLORS.navy} />
                : <View style={s.circle} />
              }
            </TouchableOpacity>
          );
        })}

        {/* 3개 입력 완료 배너 */}
        {filledCustomCount === 3 && (
          <View style={s.energyBanner}>
            <Text style={s.energyBannerText}>🎉 나만의 미션 3개 입력 완료!</Text>
            <Text style={s.energyBannerSub}>❤️ 에너지 +10 획득했어요</Text>
          </View>
        )}

        {/* ═══ 추천 미션 섹션 ═══════════════════════════ */}
        <View style={[s.sectionHeader, { marginTop: 24 }]}>
          <Text style={s.sectionTitle}>오늘의 추천 미션</Text>
          <View style={s.sectionBadge}>
            <Text style={s.sectionBadgeText}>5</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={s.swapCounter}>🔄 새로고침 {3 - swapCount}회 남음</Text>
        </View>

        {effectiveMissions.map((m, index) => {
          const done = completedMissions.includes(m.id);
          return (
            <View key={m.id} style={[s.item, done && s.itemDone]}>
              <TouchableOpacity
                style={s.missionMain}
                onPress={() => !done && setConfirmTarget(m)}
                activeOpacity={done ? 1 : 0.7}
              >
                <Text style={s.itemEmoji}>{m.emoji}</Text>
                <View style={s.itemInfo}>
                  <Text style={[s.itemLabel, done && s.itemLabelDone]}>{m.label}</Text>
                  <Text style={s.itemMeta}>💧 +{m.points}</Text>
                </View>
                {done
                  ? <Ionicons name="checkmark-circle" size={26} color={COLORS.navy} />
                  : <View style={s.circle} />
                }
              </TouchableOpacity>
              {!done && (
                <TouchableOpacity
                  style={[s.swapBtn, swapCount >= 3 && s.swapBtnDisabled]}
                  onPress={() => swapMission(index)}
                  disabled={swapCount >= 3}
                >
                  <Text style={s.swapBtnIcon}>🔄</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── 에너지 +10 플로팅 토스트 ──────────────────── */}
      {showEnergy && (
        <View style={s.energyToast} pointerEvents="none">
          <Text style={s.energyToastText}>❤️ 에너지 +10!</Text>
        </View>
      )}

      {/* ── 나만의 미션 입력 모달 ──────────────────────── */}
      <Modal visible={showInput} transparent animationType="slide" onRequestClose={() => setShowInput(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.overlay}>
            <View style={s.inputCard}>
              <Text style={s.inputCardTitle}>나만의 미션 입력</Text>
              <Text style={s.inputCardSub}>오늘 꼭 해보고 싶은 활동을 적어봐요 ✏️</Text>
              <TextInput
                style={s.textInput}
                value={inputText}
                onChangeText={t => setInputText(t.slice(0, 30))}
                placeholder="예: 공원에서 커피 마시기"
                placeholderTextColor={COLORS.border}
                maxLength={30}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={confirmInput}
              />
              <Text style={s.charCount}>{inputText.length} / 30</Text>
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowInput(false)} activeOpacity={0.8}>
                  <Text style={s.cancelBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.confirmBtn, !inputText.trim() && { opacity: 0.4 }]}
                  onPress={confirmInput}
                  disabled={!inputText.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={s.confirmBtnText}>추가하기 ✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 활동 확인 모달 ──────────────────────────── */}
      {confirmTarget && (
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <Text style={s.modalEmoji}>{confirmTarget.emoji}</Text>
            <Text style={s.modalTitle}>활동 확인</Text>
            <Text style={s.modalBody}>
              <Text style={{ fontWeight: '700' }}>"{confirmTarget.label}"</Text>
              {'\n'}정말 완료했나요?
            </Text>
            <Text style={s.modalReward}>💧 +{confirmTarget.points} 포인트 적립</Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setConfirmTarget(null)} activeOpacity={0.8}>
                <Text style={s.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
                <Text style={s.confirmBtnText}>네, 했어요! ✅</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── 전체 완료 축하 ──────────────────────────── */}
      {showCelebrate && (
        <View style={s.overlay}>
          {particles.map(p => (
            <ConfettiParticle key={p.id} p={p} active={showCelebrate} />
          ))}
          <View style={s.celebCard}>
            <Text style={s.celebEmoji}>🎊</Text>
            <Text style={s.celebTitle}>모든 미션 완료!</Text>
            <Text style={s.celebSub}>
              {'오늘 하루 정말 대단했어!\n이 기분을 감정 워크북에 남겨봐 💙'}
            </Text>
            <Text style={s.celebReward}>💧 총 {sweatPoints} 포인트 적립 완료!</Text>
            <TouchableOpacity
              style={[s.confirmBtn, { width: '100%', marginTop: 8 }]}
              onPress={() => setShowCelebrate(false)}
              activeOpacity={0.85}
            >
              <Text style={s.confirmBtnText}>고마워, 최고야! 🌟</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: isWeb ? '#F2F2F7' : COLORS.bg,
    alignItems: isWeb ? 'center' : 'stretch',
  },
  safe: { flex: 1, backgroundColor: COLORS.bg, width: isWeb ? 390 : '100%' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  sweatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.navyLight, borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.border,
  },
  sweatChipEmoji: { fontSize: 14 },
  sweatChipNum: { fontSize: 13, fontWeight: '700', color: COLORS.navy },

  progress: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: COLORS.navyLight, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  progressPct:  { fontSize: 13, fontWeight: '700', color: COLORS.navy },
  progressBarBg: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.navy, borderRadius: 4 },

  list: { paddingHorizontal: 16, paddingBottom: 40 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 10, marginTop: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  sectionBadge: {
    backgroundColor: COLORS.navy, borderRadius: 9999,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  swapCounter: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

  /* 가이드 카드 */
  guideCard: {
    backgroundColor: COLORS.navyLight, borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  guideCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guideCardIcon: { fontSize: 18 },
  guideCardTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.navy },
  guideTips: { marginTop: 12, gap: 0 },
  guideTip: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  guideTipBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  guideTipIcon: { fontSize: 20, marginTop: 1 },
  guideTipText: { flex: 1 },
  guideTipTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  guideTipBody:  { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },

  /* 미션 아이템 */
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW, marginBottom: 10,
  },
  itemEmpty: { borderStyle: 'dashed', backgroundColor: '#FAFAFA', opacity: 0.85 },
  itemDone: { opacity: 0.5 },
  itemEmoji: { fontSize: 28 },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  itemLabelDone: { textDecorationLine: 'line-through', color: COLORS.border },
  itemMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  emptyLabel: { fontSize: 14, color: COLORS.textMuted },
  emptyHint:  { fontSize: 12, color: COLORS.navy, marginTop: 3, fontWeight: '700' },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: COLORS.border },

  /* 서버 미션 내부 레이아웃 */
  missionMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  swapBtn: {
    marginLeft: 8, paddingHorizontal: 9, paddingVertical: 7,
    borderRadius: 10, backgroundColor: COLORS.navyLight,
    borderWidth: 1, borderColor: COLORS.border,
  },
  swapBtnDisabled: { opacity: 0.25 },
  swapBtnIcon: { fontSize: 16 },

  energyBanner: {
    backgroundColor: '#FFF0E0', borderRadius: 12,
    padding: 12, marginBottom: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#FFD0A0',
  },
  energyBannerText: { fontSize: 14, fontWeight: '700', color: '#C05000' },
  energyBannerSub:  { fontSize: 12, color: '#C05000', marginTop: 3 },

  energyToast: {
    position: 'absolute', top: 80, alignSelf: 'center',
    backgroundColor: COLORS.navy, borderRadius: 9999,
    paddingHorizontal: 20, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  energyToastText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },

  inputCard: {
    width: '100%', backgroundColor: COLORS.card, borderRadius: 24, padding: 28,
    alignItems: 'center', gap: 10, ...SHADOW,
  },
  inputCardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  inputCardSub:   { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  textInput: {
    width: '100%', backgroundColor: COLORS.navyLight, borderRadius: 12,
    padding: 14, fontSize: 15, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border,
  },
  charCount: { fontSize: 11, color: COLORS.textMuted, alignSelf: 'flex-end' },

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
  celebEmoji:  { fontSize: 72 },
  celebTitle:  { fontSize: 24, fontWeight: '800', color: COLORS.text },
  celebSub:    { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  celebReward: {
    fontSize: 14, fontWeight: '700', color: COLORS.navy,
    backgroundColor: COLORS.navyLight, borderRadius: 9999,
    paddingHorizontal: 16, paddingVertical: 6, marginTop: 4,
  },
});
