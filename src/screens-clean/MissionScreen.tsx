import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGame } from '../store/GameContext';
import { MISSIONS, Mission } from '../constants';

const STAT_LABELS: Record<string, string> = {
  vitality: '활력', calm: '고요', connect: '연결', creative: '창의', care: '돌봄',
};

function getTodayKST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const ADMIN_PIN = '1234';

export default function MissionScreen() {
  const navigation = useNavigation();
  const { completedMissions, completeMission, resetMissions, sweatPoints } = useGame();

  const [confirmTarget, setConfirmTarget] = useState<Mission | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  // 관리자 초기화 모달
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin,       setAdminPin]       = useState('');
  const [adminAuthed,    setAdminAuthed]    = useState(false);
  const [adminError,     setAdminError]     = useState('');

  // 매일 KST 자정 미션 자동 초기화
  useEffect(() => {
    (async () => {
      const today  = getTodayKST();
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

  const handleAdminPin = () => {
    if (adminPin !== ADMIN_PIN) {
      setAdminError('PIN이 올바르지 않아요.');
      setAdminPin('');
      return;
    }
    setAdminAuthed(true);
    setAdminError('');
  };

  const handleAdminReset = async () => {
    resetMissions();
    await AsyncStorage.setItem('@mission_reset_date', getTodayKST()).catch(() => {});
    setShowAdminModal(false);
    setAdminAuthed(false);
    setAdminPin('');
  };

  const closeAdmin = () => {
    setShowAdminModal(false);
    setAdminAuthed(false);
    setAdminPin('');
    setAdminError('');
  };

  const doneCount = completedMissions.length;

  return (
    <SafeAreaView style={s.safe}>

      {/* ── 헤더 ─────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>오늘의 미션</Text>
        <Text style={s.sweat}>💧 {sweatPoints}</Text>
      </View>

      {/* ── 진행 바 ───────────────────────────── */}
      <View style={s.progress}>
        <View style={s.progressRow}>
          <Text style={s.progressText}>{doneCount} / {MISSIONS.length} 완료</Text>
          <TouchableOpacity onPress={() => setShowAdminModal(true)}>
            <Text style={s.resetHint}>🕛 매일 자정(KST) 초기화</Text>
          </TouchableOpacity>
        </View>
        <View style={s.barBg}>
          <View style={[s.barFill, { width: `${(doneCount / MISSIONS.length) * 100}%` as `${number}%` }]} />
        </View>
      </View>

      {/* ── 미션 목록 ─────────────────────────── */}
      <FlatList
        data={MISSIONS}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const done = completedMissions.includes(item.id);
          return (
            <TouchableOpacity
              style={[s.item, done && s.itemDone]}
              onPress={() => !done && setConfirmTarget(item)}
              activeOpacity={done ? 1 : 0.7}
            >
              <Text style={s.itemEmoji}>{item.emoji}</Text>
              <View style={s.itemInfo}>
                <Text style={[s.itemLabel, done && s.itemLabelDone]}>{item.label}</Text>
                <Text style={s.itemMeta}>{STAT_LABELS[item.stat]} +{item.points} 💧</Text>
              </View>
              <Text style={s.itemCheck}>{done ? '✅' : '○'}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── 활동 확인 모달 ────────────────────── */}
      {confirmTarget && (
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalEmoji}>{confirmTarget.emoji}</Text>
            <Text style={s.modalTitle}>활동 확인</Text>
            <Text style={s.modalBody}>
              "{confirmTarget.label}"{'\n'}정말 완료했나요?{'\n'}
              💧 +{confirmTarget.points} 포인트 적립
            </Text>
            <TouchableOpacity style={s.btn} onPress={handleConfirm}>
              <Text style={s.btnText}>네, 했어요! ✅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setConfirmTarget(null)}>
              <Text style={s.cancelText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── 전체 완료 축하 모달 ───────────────── */}
      {showCelebrate && (
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalEmoji}>🎊</Text>
            <Text style={s.modalTitle}>모든 미션 완료!</Text>
            <Text style={s.modalBody}>
              오늘 하루 정말 대단했어!{'\n'}
              💧 총 {sweatPoints} 포인트 적립 완료!
            </Text>
            <TouchableOpacity style={s.btn} onPress={() => setShowCelebrate(false)}>
              <Text style={s.btnText}>고마워, 최고야! 🌟</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── 관리자 초기화 모달 ────────────────── */}
      {showAdminModal && (
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>관리자 확인</Text>
            {!adminAuthed ? (
              <>
                <Text style={s.modalBody}>PIN을 입력하면 미션을 즉시 초기화할 수 있어요.</Text>
                <TextInput
                  style={s.input}
                  value={adminPin}
                  onChangeText={setAdminPin}
                  placeholder="● ● ● ●"
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={8}
                  autoFocus
                  onSubmitEditing={handleAdminPin}
                />
                {adminError ? <Text style={s.errText}>{adminError}</Text> : null}
                <TouchableOpacity style={s.btn} onPress={handleAdminPin}>
                  <Text style={s.btnText}>확인</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.modalBody}>미션 완료 기록을 초기화하면{'\n'}모든 체크가 사라져요.</Text>
                <TouchableOpacity style={[s.btn, s.btnRed]} onPress={handleAdminReset}>
                  <Text style={s.btnText}>🔄 미션 지금 초기화</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={s.cancelBtn} onPress={closeAdmin}>
              <Text style={s.cancelText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  sweat:    { fontSize: 13, fontWeight: '700', color: '#6BBFFF' },

  progress:    { padding: 16, paddingBottom: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressText:{ fontSize: 13, color: '#666666' },
  resetHint:   { fontSize: 11, color: '#BBBBBB' },
  barBg:       { height: 8, backgroundColor: '#EEEEEE', borderRadius: 4, overflow: 'hidden' },
  barFill:     { height: '100%', backgroundColor: '#5C9E4A', borderRadius: 4 },

  list: { padding: 16, gap: 8 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderWidth: 1, borderColor: '#EEEEEE',
    borderRadius: 12, backgroundColor: '#FFFFFF',
  },
  itemDone:      { opacity: 0.5 },
  itemEmoji:     { fontSize: 24 },
  itemInfo:      { flex: 1 },
  itemLabel:     { fontSize: 15, fontWeight: '600', color: '#3D3224' },
  itemLabelDone: { textDecorationLine: 'line-through', color: '#AAAAAA' },
  itemMeta:      { fontSize: 12, color: '#888888', marginTop: 2 },
  itemCheck:     { fontSize: 18 },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modal: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 24, alignItems: 'center', gap: 10,
  },
  modalEmoji: { fontSize: 48 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#3D3224' },
  modalBody:  { fontSize: 14, color: '#888888', textAlign: 'center', lineHeight: 22 },

  btn:       { backgroundColor: '#5C9E4A', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%' },
  btnRed:    { backgroundColor: '#FF6B6B' },
  btnText:   { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  cancelBtn: { paddingVertical: 6 },
  cancelText:{ fontSize: 14, color: '#999999' },

  input:   {
    borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
    padding: 12, fontSize: 18, width: '100%', textAlign: 'center', letterSpacing: 6,
  },
  errText: { fontSize: 13, color: '#FF6B6B' },
});
