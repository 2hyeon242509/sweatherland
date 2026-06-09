import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Platform, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGame } from '../store/GameContext';
import { COLORS, ALL_FRIENDS, Friend, SHADOW } from '../constants';

const ADMIN_PIN = '1234';
const LOCK_DURATION = 7 * 24 * 60 * 60 * 1000; // 7일
const isWeb = Platform.OS === 'web';

export default function FriendSelectScreen() {
  const navigation = useNavigation();
  const { selectedFriendIds, setSelectedFriends } = useGame();

  // 단일 선택 — 기존 저장값이 여러 개여도 첫 번째만 사용
  const [tempSelection, setTempSelection] = useState<string[]>(
    selectedFriendIds.length > 0 ? [selectedFriendIds[0]] : ['momo'],
  );
  const [lockUntil, setLockUntil] = useState(0);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // 확인 모달
  const [showConfirm, setShowConfirm] = useState(false);
  // 관리자 모달
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('@friend_lock_until').then(val => {
      if (val) setLockUntil(parseInt(val, 10));
    }).catch(() => {});
  }, []);

  const now = Date.now();
  const isLocked = !adminUnlocked && now < lockUntil;
  const msLeft = lockUntil - now;
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000));

  // 1명만 선택 — 탭하면 그 캐릭터로 교체
  const toggleFriend = (id: string) => {
    if (isLocked) return;
    setTempSelection([id]);
  };

  const handleConfirmChange = async () => {
    setSelectedFriends(tempSelection);
    // 관리자가 아닌 경우에도 변경 후 새 잠금 설정
    const until = Date.now() + LOCK_DURATION;
    setLockUntil(until);
    await AsyncStorage.setItem('@friend_lock_until', String(until)).catch(() => {});
    setShowConfirm(false);
    navigation.goBack();
  };

  const handleAdminPin = () => {
    if (adminPin !== ADMIN_PIN) {
      setAdminError('PIN이 올바르지 않아요.');
      setAdminPin('');
      return;
    }
    setAdminUnlocked(true);
    setShowAdminModal(false);
    setAdminPin('');
    setAdminError('');
  };

  const selectionChanged = tempSelection[0] !== selectedFriendIds[0];
  const canSave = !isLocked && selectionChanged && tempSelection.length === 1;

  return (
    <View style={styles.outerWrap}>
      <SafeAreaView style={styles.safe}>

        {/* ── 헤더 ──────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>함께할 친구 선택</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 잠금 안내 배너 ─────────────────────── */}
          {isLocked && (
            <View style={styles.lockBanner}>
              <Ionicons name="lock-closed" size={14} color="#B45309" />
              <Text style={styles.lockBannerText}>
                {daysLeft > 1
                  ? `변경 후 ${daysLeft}일 동안 바꿀 수 없어요`
                  : `오늘 안에 변경 가능해요 (약 ${hoursLeft}시간 남음)`}
              </Text>
            </View>
          )}

          {/* ── 관리자 잠금 해제 배너 ──────────────── */}
          {adminUnlocked && (
            <View style={styles.adminBanner}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.green} />
              <Text style={styles.adminBannerText}>관리자 모드 — 잠금 해제됨</Text>
            </View>
          )}

          {/* ── 안내 문구 ──────────────────────────── */}
          <Text style={styles.subtitle}>
            {isLocked
              ? '잠금 중이라 지금은 변경할 수 없어요 🔒\n아래 관리자 버튼으로 해제할 수 있어요.'
              : '함께할 친구를 1명 골라봐요!\n변경 후 7일간 다시 바꿀 수 없어요.'}
          </Text>

          {/* ── 캐릭터 그리드 ──────────────────────── */}
          <View style={styles.grid}>
            {ALL_FRIENDS.map((f: Friend) => {
              const isSelected = tempSelection[0] === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.card,
                    { backgroundColor: f.bg },
                    isSelected && styles.cardSelected,
                    isLocked && !isSelected && styles.cardDimmed,
                  ]}
                  onPress={() => toggleFriend(f.id)}
                  activeOpacity={isLocked ? 1 : 0.78}
                >
                  {/* 선택 체크 뱃지 */}
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={11} color="#FFF" />
                    </View>
                  )}

                  <Text style={styles.cardEmoji}>{f.emoji}</Text>
                  <Text style={styles.cardName}>{f.name}</Text>
                  <Text style={styles.cardDesc}>{f.description}</Text>
                  <Text style={styles.cardPersonality}>{f.personality}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── 관리자 잠금 해제 버튼 ──────────────── */}
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => setShowAdminModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.adminBtnText}>관리자 잠금 해제</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── 선택 완료 버튼 (조건부) ────────────── */}
        {canSave && (
          <View style={styles.saveBtnWrap}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => setShowConfirm(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>선택 완료</Text>
              <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── 변경 확인 모달 ─────────────────────── */}
        {showConfirm && (
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowConfirm(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              <Text style={styles.modalEmoji}>🤝</Text>
              <Text style={styles.modalTitle}>친구 변경 확인</Text>
              {(() => {
                const f = ALL_FRIENDS.find(x => x.id === tempSelection[0])!;
                return (
                  <>
                    <View style={[styles.previewChip, { backgroundColor: f.bg, paddingHorizontal: 24, paddingVertical: 14 }]}>
                      <Text style={{ fontSize: 44 }}>{f.emoji}</Text>
                      <Text style={[styles.previewName, { fontSize: 13, marginTop: 4 }]}>{f.name}</Text>
                      <Text style={{ fontSize: 11, color: COLORS.textMuted, textAlign: 'center' }}>{f.description}</Text>
                    </View>
                    <Text style={styles.modalBody}>
                      <Text style={{ color: COLORS.heartRed, fontWeight: '700' }}>
                        변경 후 7일간 다시 바꿀 수 없어요!
                      </Text>
                      {'\n'}정말 변경할까요?
                    </Text>
                  </>
                );
              })()}

              <TouchableOpacity style={[styles.confirmBtn, { width: '100%', marginTop: 8 }]} onPress={handleConfirmChange} activeOpacity={0.8}>
                <Text style={styles.confirmBtnText}>변경할게요!</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── 관리자 PIN 모달 ────────────────────── */}
        {showAdminModal && (
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => { setShowAdminModal(false); setAdminPin(''); setAdminError(''); }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              <Text style={styles.modalEmoji}>🔒</Text>
              <Text style={styles.modalTitle}>관리자 확인</Text>
              <Text style={styles.modalBody}>
                PIN을 입력하면 잠금이 해제돼요.{'\n'}변경 후 새 잠금이 적용됩니다.
              </Text>
              <TextInput
                style={styles.pinInput}
                value={adminPin}
                onChangeText={setAdminPin}
                placeholder="● ● ● ●"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                keyboardType="numeric"
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={handleAdminPin}
              />
              {adminError ? <Text style={styles.pinError}>{adminError}</Text> : null}
              <TouchableOpacity style={[styles.confirmBtn, { width: '100%', marginTop: 12 }]} onPress={handleAdminPin} activeOpacity={0.8}>
                <Text style={styles.confirmBtnText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: isWeb ? COLORS.yellow : COLORS.bg,
    alignItems: isWeb ? 'center' : 'stretch',
  },
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    width: isWeb ? 390 : '100%',
  },

  // ── Header ────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  iconBtn: { width: 36, height: 36, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  // ── Scroll content ────────────────────────
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  // ── Lock banner ───────────────────────────
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  lockBannerText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
    flex: 1,
  },

  // ── Admin banner ─────────────────────────
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#EFF8E8',
    borderWidth: 1,
    borderColor: '#D4EDCA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  adminBannerText: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: '600',
  },

  // ── Subtitle ──────────────────────────────
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 16,
    marginTop: 4,
  },

  // ── Character Grid ────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  card: {
    width: '47%',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    ...SHADOW,
  },
  cardSelected: {
    borderWidth: 2.5,
    borderColor: COLORS.green,
  },
  cardDimmed: {
    opacity: 0.45,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: { fontSize: 42, marginBottom: 2 },
  cardName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  cardDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 2,
  },
  cardPersonality: {
    fontSize: 10,
    color: COLORS.green,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 2,
  },

  // ── Admin button ──────────────────────────
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 9,
    marginBottom: 8,
    ...SHADOW,
  },
  adminBtnText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // ── Save button ───────────────────────────
  saveBtnWrap: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.green,
    borderRadius: 9999,
    paddingVertical: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // ── Modal overlay ─────────────────────────
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 999,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    ...SHADOW,
  },
  modalEmoji: { fontSize: 52, marginBottom: 2 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalBody: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // 선택 친구 미리보기
  previewRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  previewChip: {
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 3,
  },
  previewName: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },

  // X 닫기 버튼
  closeBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 1,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: COLORS.green,
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // PIN 입력
  pinInput: {
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 14,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  pinError: { fontSize: 12, color: COLORS.heartRed, marginTop: 2 },
});
