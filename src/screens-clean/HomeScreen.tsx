import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGame } from '../store/GameContext';
import { MOODS } from '../constants';

const ADMIN_PIN = '1234';
const LOCK_DURATION = 7 * 24 * 60 * 60 * 1000; // 7일

const MENU_ITEMS = [
  { label: '감정 기록', emoji: '📔', screen: 'MoodLog' },
  { label: '미션',      emoji: '🚩', screen: 'Mission'  },
  { label: '러닝',      emoji: '👟', screen: 'Running'  },
  { label: '환전소',    emoji: '🔄', screen: 'Exchange' },
] as const;

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const {
    energy, sweatPoints, currentMood, characterName,
    setCharacterName, streak,
  } = useGame();
  const moodInfo = MOODS.find(m => m.id === currentMood);

  // ── 이름 변경 모달 ─────────────────────────────
  const [showNameModal,     setShowNameModal]     = useState(false);
  const [nameInput,         setNameInput]         = useState('');
  const [nameLockUntil,     setNameLockUntil]     = useState(0);
  const [nameAdminUnlocked, setNameAdminUnlocked] = useState(false);
  const [showAdminModal,    setShowAdminModal]    = useState(false);
  const [adminPin,          setAdminPin]          = useState('');
  const [adminError,        setAdminError]        = useState('');

  useEffect(() => {
    AsyncStorage.getItem('@name_lock_until').then(val => {
      if (val) setNameLockUntil(parseInt(val, 10));
    }).catch(() => {});
  }, []);

  const isNameLocked = !nameAdminUnlocked && Date.now() < nameLockUntil;
  const daysLeft     = Math.ceil((nameLockUntil - Date.now()) / (24 * 60 * 60 * 1000));

  const openNameModal = () => {
    setNameInput(characterName);
    setShowNameModal(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setCharacterName(trimmed);
    const until = Date.now() + LOCK_DURATION;
    setNameLockUntil(until);
    await AsyncStorage.setItem('@name_lock_until', String(until)).catch(() => {});
    setShowNameModal(false);
    setNameInput('');
    setNameAdminUnlocked(false);
  };

  const handleAdminPin = () => {
    if (adminPin !== ADMIN_PIN) {
      setAdminError('PIN이 올바르지 않아요.');
      setAdminPin('');
      return;
    }
    setNameAdminUnlocked(true);
    setShowAdminModal(false);
    setAdminPin('');
    setAdminError('');
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 헤더 ───────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.logo}>S.WEATHER LAND</Text>
          <Text style={s.streak}>🔥 {streak}일 연속</Text>
        </View>

        {/* ── 오늘의 날씨 무드 ────────────────────── */}
        <View style={s.moodCard}>
          <Text style={s.moodEmoji}>{moodInfo?.emoji ?? '⛅'}</Text>
          <View style={s.moodInfo}>
            <Text style={s.moodWeather}>{moodInfo?.weather ?? '맑음'}</Text>
            <Text style={s.moodLabel}>
              {moodInfo ? `${moodInfo.label}한 하루예요!` : '기분이 포근한 하루에요!'}
            </Text>
          </View>
          <TouchableOpacity
            style={s.moodLogBtn}
            onPress={() => navigation.navigate('MoodLog')}
            activeOpacity={0.8}
          >
            <Text style={s.moodLogBtnText}>기록하기</Text>
          </TouchableOpacity>
        </View>

        {/* ── 캐릭터 이름 ─────────────────────────── */}
        <TouchableOpacity style={s.nameRow} onPress={openNameModal} activeOpacity={0.7}>
          <Text style={s.charName}>{characterName}</Text>
          <Text style={s.nameEditHint}>✏️ 이름 변경</Text>
        </TouchableOpacity>

        {/* ── 마음 에너지 바 ──────────────────────── */}
        <View style={s.energyCard}>
          <View style={s.energyLabelRow}>
            <Text style={s.energyLabel}>❤️ 마음에너지</Text>
            <Text style={s.energyValue}>{energy} / 100</Text>
          </View>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${energy}%` as `${number}%` }]} />
          </View>
          <View style={s.sweatRow}>
            <Text style={s.sweatLabel}>💧 땀방울</Text>
            <Text style={s.sweatValue}>{sweatPoints.toLocaleString()} 포인트</Text>
          </View>
        </View>

        {/* ── 메뉴 그리드 ─────────────────────────── */}
        <View style={s.menuGrid}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity
              key={item.label}
              style={s.menuItem}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.75}
            >
              <Text style={s.menuEmoji}>{item.emoji}</Text>
              <Text style={s.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* ── 이름 변경 모달 ───────────────────────── */}
      {showNameModal && (
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>✏️ 이름 변경</Text>

            {isNameLocked && (
              <View style={s.lockBanner}>
                <Text style={s.lockBannerText}>
                  🔒 변경 후 {daysLeft}일 동안 바꿀 수 없어요
                </Text>
                <TouchableOpacity onPress={() => setShowAdminModal(true)}>
                  <Text style={s.lockAdminText}>관리자 해제</Text>
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              style={[s.nameInput, isNameLocked && s.nameInputDisabled]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="이름을 입력해주세요"
              maxLength={12}
              editable={!isNameLocked}
            />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowNameModal(false)}>
                <Text style={s.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, isNameLocked && s.saveBtnDisabled]}
                onPress={handleSaveName}
                disabled={isNameLocked}
              >
                <Text style={s.saveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── 관리자 PIN 모달 ──────────────────────── */}
      {showAdminModal && (
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>🔒 관리자 확인</Text>
            <TextInput
              style={s.nameInput}
              value={adminPin}
              onChangeText={setAdminPin}
              placeholder="PIN 입력"
              secureTextEntry
              keyboardType="numeric"
              maxLength={8}
              autoFocus
              onSubmitEditing={handleAdminPin}
            />
            {adminError ? <Text style={s.errText}>{adminError}</Text> : null}
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowAdminModal(false); setAdminPin(''); setAdminError(''); }}>
                <Text style={s.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleAdminPin}>
                <Text style={s.saveBtnText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FEFAE6' },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },

  // Header
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logo:    { fontSize: 16, fontWeight: '800', color: '#3D3224' },
  streak:  { fontSize: 13, fontWeight: '700', color: '#5C9E4A' },

  // Mood card
  moodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  moodEmoji:  { fontSize: 36 },
  moodInfo:   { flex: 1 },
  moodWeather:{ fontSize: 13, fontWeight: '700', color: '#3D3224' },
  moodLabel:  { fontSize: 11, color: '#888888', marginTop: 2 },
  moodLogBtn: { backgroundColor: '#5C9E4A', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 7 },
  moodLogBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  // Name row
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  charName:   { fontSize: 18, fontWeight: '800', color: '#3D3224' },
  nameEditHint: { fontSize: 11, color: '#888888' },

  // Energy card
  energyCard:    { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: '#EEEEEE' },
  energyLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  energyLabel:   { fontSize: 13, fontWeight: '700', color: '#3D3224' },
  energyValue:   { fontSize: 13, fontWeight: '700', color: '#FF6B6B' },
  barBg:         { height: 10, backgroundColor: '#EEEEEE', borderRadius: 5, overflow: 'hidden' },
  barFill:       { height: '100%', backgroundColor: '#5C9E4A', borderRadius: 5 },
  sweatRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  sweatLabel:    { fontSize: 12, color: '#3D3224', fontWeight: '600' },
  sweatValue:    { fontSize: 12, fontWeight: '700', color: '#6BBFFF' },

  // Menu grid
  menuGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  menuItem:  {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 18, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  menuEmoji: { fontSize: 32 },
  menuLabel: { fontSize: 13, fontWeight: '700', color: '#3D3224' },

  // Modal overlay
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modal: {
    width: '100%', backgroundColor: '#FFFFFF',
    borderRadius: 20, padding: 24, gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#3D3224', textAlign: 'center' },

  lockBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10,
  },
  lockBannerText: { fontSize: 12, color: '#B45309', flex: 1 },
  lockAdminText:  { fontSize: 12, color: '#5C9E4A', fontWeight: '700' },

  nameInput: {
    borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
    padding: 12, fontSize: 16, color: '#3D3224',
  },
  nameInputDisabled: { backgroundColor: '#F5F5F5', color: '#AAAAAA' },

  modalBtns:    { flexDirection: 'row', gap: 10 },
  cancelBtn:    { flex: 1, backgroundColor: '#EEEEEE', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText:{ fontSize: 14, fontWeight: '700', color: '#888888' },
  saveBtn:      { flex: 1, backgroundColor: '#5C9E4A', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#CCCCCC' },
  saveBtnText:  { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  errText:      { fontSize: 12, color: '#FF6B6B', textAlign: 'center' },
});
