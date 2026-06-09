import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGame } from '../store/GameContext';
import { MOODS, MoodId, MOOD_RESPONSES } from '../constants';
import { saveMoodLog, isSupabaseConfigured } from '../lib/supabase';
import { saveLocalLog } from '../lib/localLogs';

const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

const MOOD_ENERGY_DATE_KEY  = '@mood_energy_date';
const MOOD_ENERGY_COUNT_KEY = '@mood_energy_count';
const MAX_DAILY_ENERGY_LOGS = 2;

const DAILY_CHEER = '지금 이 순간의 너도\n충분히 소중해! 🌿';

export default function MoodLogScreen() {
  const navigation = useNavigation();
  const { setMood, addEnergy, characterName } = useGame();

  const [selected,   setSelected]   = useState<MoodId | null>(null);
  const [memo,       setMemo]       = useState('');
  const [todayCount, setTodayCount] = useState(0);
  const [saveError,  setSaveError]  = useState('');
  const [responseIdx] = useState(() => Math.floor(Math.random() * 2));

  const selectedMood = MOODS.find(m => m.id === selected) ?? null;

  // 오늘 에너지 획득 횟수 로드
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
      setSaveError('감정을 선택해주세요.');
      return;
    }
    setSaveError('');
    setMood(selected);

    // 하루 최대 2회(+20 에너지)까지만 획득
    if (todayCount < MAX_DAILY_ENERGY_LOGS) {
      addEnergy(10);
      const newCount = todayCount + 1;
      setTodayCount(newCount);
      await Promise.all([
        AsyncStorage.setItem(MOOD_ENERGY_DATE_KEY, kstToday()),
        AsyncStorage.setItem(MOOD_ENERGY_COUNT_KEY, String(newCount)),
      ]);
    }

    // 감정 기록 저장
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
    <SafeAreaView style={s.safe}>

      {/* ── 헤더 ─────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>감정 입력 워크북</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── 감정 선택 질문 ───────────────────── */}
        <View style={s.section}>
          <Text style={s.question}>오늘 기분이 어때요?</Text>
          <Text style={s.questionSub}>지금 내 마음에 가까운 날씨를 선택해봐요.</Text>
        </View>

        {/* ── 감정 버튼 (가로 스크롤) ─────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.moodScroll}
        >
          {MOODS.map(mood => (
            <TouchableOpacity
              key={mood.id}
              style={[s.moodBtn, selected === mood.id && s.moodBtnSelected]}
              onPress={() => { setSelected(mood.id); setSaveError(''); }}
            >
              <Text style={s.moodEmoji}>{mood.emoji}</Text>
              <Text style={[s.moodLabel, selected === mood.id && s.moodLabelSelected]}>
                {mood.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── 캐릭터 반응 ─────────────────────── */}
        {selectedMood && (
          <View style={s.responseCard}>
            <Text style={s.responseChar}>🦌</Text>
            <View style={s.responseBubble}>
              <Text style={s.responseText}>
                {MOOD_RESPONSES[selectedMood.id][responseIdx]}
              </Text>
            </View>
          </View>
        )}

        {/* ── 메모 입력 ───────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>오늘 어떤 일이 있었나요?</Text>
          <TextInput
            style={s.memoInput}
            placeholder="자유롭게 적어봐요..."
            placeholderTextColor="#bbb"
            multiline
            value={memo}
            onChangeText={setMemo}
            textAlignVertical="top"
          />
        </View>

        {/* ── 오늘의 응원 ─────────────────────── */}
        <View style={s.cheerCard}>
          <Text style={s.cheerLabel}>오늘의 한 줄 응원</Text>
          <Text style={s.cheerText}>{DAILY_CHEER}</Text>
        </View>

      </ScrollView>

      {/* ── 저장 버튼 영역 ───────────────────── */}
      <View style={s.footer}>
        <Text style={s.energyHint}>
          {todayCount < MAX_DAILY_ENERGY_LOGS
            ? `💧 오늘 에너지 획득 ${todayCount}/${MAX_DAILY_ENERGY_LOGS}회 (기록 시 +10 에너지)`
            : '✅ 오늘 에너지 획득 완료 — 기록은 계속 저장돼요'}
        </Text>
        {saveError ? <Text style={s.errText}>{saveError}</Text> : null}
        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnText}>저장하기</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FEFAE6' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  backBtn:  { width: 40, justifyContent: 'center' },
  backText: { fontSize: 22 },
  title:    { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#3D3224' },
  scroll:   { paddingBottom: 16 },

  section:      { padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#3D3224', marginBottom: 10 },
  question:     { fontSize: 22, fontWeight: '800', color: '#3D3224', marginBottom: 4 },
  questionSub:  { fontSize: 13, color: '#888888' },

  // Mood scroll
  moodScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  moodBtn: {
    alignItems: 'center', width: 72, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#EEEEEE', borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  moodBtnSelected: { borderColor: '#5C9E4A', backgroundColor: '#EDF5E8' },
  moodEmoji:       { fontSize: 28, marginBottom: 4 },
  moodLabel:       { fontSize: 10, color: '#888888', textAlign: 'center' },
  moodLabelSelected: { color: '#5C9E4A', fontWeight: '700' },

  // Response card
  responseCard: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  responseChar:   { fontSize: 44 },
  responseBubble: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: '#EEEEEE',
  },
  responseText: { fontSize: 13, color: '#3D3224', lineHeight: 19 },

  memoInput: {
    borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
    padding: 12, fontSize: 14, minHeight: 100, backgroundColor: '#FFFFFF',
  },

  // Cheer card
  cheerCard: {
    margin: 20, backgroundColor: '#EDF5E8', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#C8E6C0',
  },
  cheerLabel: { fontSize: 11, fontWeight: '700', color: '#5C9E4A', marginBottom: 6, letterSpacing: 0.5 },
  cheerText:  { fontSize: 14, fontWeight: '600', color: '#3D3224', lineHeight: 21 },

  // Footer
  footer:      { padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#EEEEEE', backgroundColor: '#FEFAE6' },
  energyHint:  { fontSize: 12, color: '#888888', textAlign: 'center', marginBottom: 8 },
  errText:     { fontSize: 13, color: '#FF6B6B', textAlign: 'center', marginBottom: 8 },
  saveBtn:     { backgroundColor: '#5C9E4A', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
