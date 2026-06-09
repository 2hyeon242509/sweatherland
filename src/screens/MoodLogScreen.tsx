import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGame } from '../store/GameContext';
import { COLORS, MOODS, MoodId, Mood } from '../constants';
import { saveMoodLog, isSupabaseConfigured } from '../lib/supabase';
import { saveLocalLog } from '../lib/localLogs';

const DAILY_CHEER = '지금 이 순간의 너도\n충분히 소중해! 🌿';
const MOOD_ENERGY_DATE_KEY  = '@mood_energy_date';
const MOOD_ENERGY_COUNT_KEY = '@mood_energy_count';
const MAX_DAILY_ENERGY_LOGS = 2;
const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

const isWeb = Platform.OS === 'web';

export default function MoodLogScreen() {
  const navigation = useNavigation();
  const { setMood, addEnergy, characterName } = useGame();

  const [selected, setSelected] = useState<MoodId | null>(null);
  const [memo, setMemo] = useState('');
  const [todayCount, setTodayCount] = useState(0);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    (async () => {
      const [savedDate, savedCount] = await Promise.all([
        AsyncStorage.getItem(MOOD_ENERGY_DATE_KEY),
        AsyncStorage.getItem(MOOD_ENERGY_COUNT_KEY),
      ]);
      if (savedDate === kstToday()) {
        setTodayCount(parseInt(savedCount ?? '0', 10));
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!selected) {
      setSaveError('감정을 선택해주세요 💙');
      return;
    }
    setSaveError('');
    setMood(selected);

    if (todayCount < MAX_DAILY_ENERGY_LOGS) {
      addEnergy(10);
      const newCount = todayCount + 1;
      setTodayCount(newCount);
      await Promise.all([
        AsyncStorage.setItem(MOOD_ENERGY_DATE_KEY, kstToday()),
        AsyncStorage.setItem(MOOD_ENERGY_COUNT_KEY, String(newCount)),
      ]);
    }

    const moodInfo = MOODS.find(m => m.id === selected);
    if (moodInfo) {
      const logData = {
        user_name:  characterName,
        mood_id:    selected,
        mood_label: moodInfo.label,
        memo:       memo.trim(),
      };
      if (isSupabaseConfigured()) {
        saveMoodLog(logData).catch(() => {});
      } else {
        saveLocalLog(logData).catch(() => {});
      }
    }

    navigation.goBack();
  };

  return (
    <View style={styles.outerWrap}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── 헤더 ──────────────────────────────── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>감정 입력 워크북</Text>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* ── 감정 질문 ──────────────────────────── */}
          <View style={styles.questionSection}>
            <Text style={styles.questionTitle}>오늘 기분이 어때요?</Text>
            <Text style={styles.questionSub}>
              지금 내 마음에 가까운 날씨를 선택해봐요.
            </Text>
          </View>

          {/* ── 감정 버튼 (가로 스크롤) ─────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodScroll}
          >
            {MOODS.map(mood => (
              <MoodButton
                key={mood.id}
                mood={mood}
                isSelected={selected === mood.id}
                onPress={() => { setSelected(mood.id); setSaveError(''); }}
              />
            ))}
          </ScrollView>

          {/* ── 노트 메모 ──────────────────────────── */}
          <View style={styles.notepadCard}>
            <View style={styles.spiralEdge}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <View key={i} style={styles.spiral} />
              ))}
            </View>
            <View style={styles.notepadContent}>
              <Text style={styles.notepadTitle}>오늘 어떤 일이 있었나요?</Text>
              <Text style={styles.notepadSub}>자유롭게 적어보세요.</Text>
              <Text style={styles.notepadHint}>
                예) 기분이 좋았던 일, 힘들었던 일,{'\n'}감사했던 일 등 무엇이든 좋아요 :)
              </Text>
              {[0, 1, 2].map(i => (
                <View key={i} style={styles.noteLine} />
              ))}
              <TextInput
                style={styles.noteInput}
                placeholder="여기에 적어봐요..."
                placeholderTextColor={COLORS.border}
                multiline
                value={memo}
                onChangeText={setMemo}
                textAlignVertical="top"
              />
              <View style={styles.pencilWrap}>
                <Ionicons name="pencil" size={16} color={COLORS.border} />
              </View>
            </View>
          </View>

          {/* ── 오늘의 응원 ────────────────────────── */}
          <View style={styles.cheerCard}>
            <View style={styles.cheerLeft}>
              <Text style={styles.cheerLabel}>오늘의 한 줄 응원</Text>
              <Text style={styles.cheerText}>{DAILY_CHEER}</Text>
            </View>
            <View style={styles.cheerDeco}>
              <Text style={{ fontSize: 28 }}>☁️</Text>
              <Text style={{ fontSize: 14, marginTop: -4 }}>🌸</Text>
            </View>
          </View>

          {/* ── 페이지 닷 ──────────────────────────── */}
          <View style={styles.pageDots}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
            ))}
          </View>

          {/* ── 에너지 획득 안내 ───────────────────── */}
          <Text style={styles.energyHint}>
            {todayCount < MAX_DAILY_ENERGY_LOGS
              ? `💙 오늘 에너지 획득 ${todayCount}/${MAX_DAILY_ENERGY_LOGS}회 (기록 시 +10 에너지)`
              : '✅ 오늘 에너지 획득 완료 — 기록은 계속 저장돼요'}
          </Text>

          {saveError ? <Text style={styles.errText}>{saveError}</Text> : null}

          {/* ── 저장 버튼 ──────────────────────────── */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>저장하기</Text>
            <Ionicons name="heart" size={16} color="#FFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── 감정 버튼 컴포넌트 ─────────────────────────────────────
function MoodButton({
  mood,
  isSelected,
  onPress,
}: {
  mood: Mood;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.moodBtnWrap}>
      <View style={[
        styles.moodIconCircle,
        isSelected && styles.moodIconCircleSelected,
      ]}>
        <Text style={styles.moodEmojiText}>{mood.emoji}</Text>
        {isSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={9} color="#FFF" />
          </View>
        )}
      </View>
      <Text style={[styles.moodBtnLabel, isSelected && styles.moodBtnLabelSelected]}>
        {mood.label}
      </Text>
    </TouchableOpacity>
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

  // ── 헤더 ────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  // ── 질문 ────────────────────────────────────
  questionSection: { paddingHorizontal: 20, marginBottom: 16, marginTop: 4 },
  questionTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  questionSub: { fontSize: 13, color: COLORS.textMuted },

  // ── 감정 버튼 ────────────────────────────────
  moodScroll: { paddingHorizontal: 16, paddingBottom: 4, gap: 10, marginBottom: 20 },
  moodBtnWrap: { alignItems: 'center', width: 72 },
  moodIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.card,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1.5, borderColor: COLORS.border,
    position: 'relative',
  },
  moodIconCircleSelected: {
    backgroundColor: COLORS.navyLight,
    borderColor: COLORS.navy,
    borderWidth: 2,
  },
  moodEmojiText: { fontSize: 28 },
  checkBadge: {
    position: 'absolute', top: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.navy,
    justifyContent: 'center', alignItems: 'center',
  },
  moodBtnLabel: { fontSize: 11, color: COLORS.textMuted },
  moodBtnLabelSelected: { color: COLORS.navy, fontWeight: '700' },

  // ── 노트패드 ──────────────────────────────────
  notepadCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    minHeight: 140,
    borderWidth: 1, borderColor: COLORS.border,
  },
  spiralEdge: {
    width: 22, backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: 14,
  },
  spiral: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.border,
  },
  notepadContent: { flex: 1, padding: 14, position: 'relative' },
  notepadTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  notepadSub: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8 },
  notepadHint: { fontSize: 11, color: COLORS.border, lineHeight: 17, marginBottom: 8 },
  noteLine: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 10 },
  noteInput: {
    fontSize: 13, color: COLORS.text,
    minHeight: 60, paddingTop: 0, paddingBottom: 20,
  },
  pencilWrap: { position: 'absolute', bottom: 10, right: 12 },

  // ── 응원 카드 ────────────────────────────────
  cheerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.navyLight,
    borderRadius: 18, marginHorizontal: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cheerLeft: { flex: 1 },
  cheerLabel: { fontSize: 11, fontWeight: '700', color: COLORS.navy, marginBottom: 6, letterSpacing: 0.5 },
  cheerText: { fontSize: 14, fontWeight: '600', color: COLORS.text, lineHeight: 21 },
  cheerDeco: { alignItems: 'center', gap: 2, paddingLeft: 10 },

  // ── 페이지 닷 ────────────────────────────────
  pageDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  dotActive: { width: 16, backgroundColor: COLORS.navy, borderRadius: 3 },

  // ── 저장 버튼 ────────────────────────────────
  energyHint: {
    textAlign: 'center', fontSize: 12, color: COLORS.textMuted,
    marginBottom: 8, paddingHorizontal: 16,
  },
  errText: {
    textAlign: 'center', fontSize: 13, color: COLORS.navyDark, marginBottom: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.navy,
    borderRadius: 18, marginHorizontal: 16, paddingVertical: 17,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    marginBottom: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
