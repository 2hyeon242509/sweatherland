import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Platform,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useGame, FriendEntry } from '../store/GameContext';
import { COLORS, SHADOW } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isSupabaseConfigured, upsertUserProfile, searchUserById, UserProfile,
} from '../lib/supabase';

async function searchLocalMock(uniqueId: string): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem('@mock_users');
    if (!raw) return null;
    const list = JSON.parse(raw) as UserProfile[];
    return list.find(u => u.unique_id === uniqueId) ?? null;
  } catch { return null; }
}

const isWeb = Platform.OS === 'web';

const PROFILE_EMOJIS = [
  '🐱','🐶','🐰','🐻','🐼','🦊',
  '🐯','🦁','🐸','🐧','🦋','🐬',
  '🌸','⭐','🌈','🌙','☀️','🌊',
  '🍀','🌺','🎀','💫','🦄','🍭',
];

// ── 프로필 카드 컴포넌트 ──────────────────────────────────────
interface ProfileCardProps {
  profileEmoji: string;
  nickname: string;
  uniqueId: string;
  statusMsg: string;
  onEdit?: () => void;
  rightSlot?: React.ReactNode;
  isMe?: boolean;
}

function ProfileCard({
  profileEmoji, nickname, uniqueId, statusMsg,
  onEdit, rightSlot, isMe,
}: ProfileCardProps) {
  return (
    <View style={[styles.profileCard, isMe && styles.profileCardMe]}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarEmoji}>{profileEmoji}</Text>
      </View>
      <View style={styles.profileInfo}>
        <View style={styles.profileTopRow}>
          <Text style={styles.profileNickname} numberOfLines={1}>{nickname}</Text>
          <Text style={styles.profileUniqueId}>{uniqueId}</Text>
        </View>
        {statusMsg ? (
          <Text style={styles.profileStatus} numberOfLines={1}>"{statusMsg}"</Text>
        ) : isMe ? (
          <Text style={styles.profileStatusEmpty}>상태메시지를 입력해보세요</Text>
        ) : null}
      </View>
      {onEdit && (
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
      {rightSlot}
    </View>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────────
export default function FriendScreen() {
  const {
    characterName, uniqueId, statusMsg, profileEmoji,
    friendList, setStatusMsg, setProfileEmoji, addFriend, removeFriend,
  } = useGame();

  const [searchInput,  setSearchInput]  = useState('');
  const [searchState,  setSearchState]  = useState<
    'idle' | 'loading' | 'found' | 'not_found' | 'no_backend' | 'already'
  >('idle');
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);

  const [showEmojiPicker,  setShowEmojiPicker]  = useState(false);
  const [showStatusModal,  setShowStatusModal]  = useState(false);
  const [statusInput,      setStatusInput]      = useState('');

  const [deleteConfirmId,   setDeleteConfirmId]   = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [showSelfWarning,   setShowSelfWarning]   = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      AsyncStorage.getItem('@mock_users').then(raw => {
        if (!raw) {
          AsyncStorage.setItem('@mock_users', JSON.stringify([
            { unique_id: '#1000', nickname: '봄이',  char_id: 'momo',  profile_emoji: '🌸', status_msg: '오늘도 파이팅 ✨' },
            { unique_id: '#2024', nickname: '하늘이', char_id: 'sunny', profile_emoji: '☀️', status_msg: '맑은 하루!' },
            { unique_id: '#0777', nickname: '달빛이', char_id: 'lunna', profile_emoji: '🌙', status_msg: '밤하늘 산책 중 🌃' },
          ])).catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (isSupabaseConfigured() && uniqueId) {
      upsertUserProfile({
        unique_id:     uniqueId,
        nickname:      characterName,
        char_id:       '',
        profile_emoji: profileEmoji,
        status_msg:    statusMsg,
      }).catch(() => {});
    }
  }, [uniqueId, characterName, profileEmoji, statusMsg]));

  const handleSearch = async () => {
    const query = searchInput.trim().toUpperCase();
    if (!query) return;
    const formatted = query.startsWith('#') ? query : `#${query}`;

    if (formatted === uniqueId) {
      setShowSelfWarning(true);
      setTimeout(() => setShowSelfWarning(false), 2000);
      return;
    }
    if (friendList.some(f => f.uniqueId === formatted)) {
      setSearchState('already');
      setFoundUser(null);
      return;
    }
    setSearchState('loading');

    let result: UserProfile | null = null;
    if (isSupabaseConfigured()) {
      result = await searchUserById(formatted);
    } else {
      result = await searchLocalMock(formatted);
    }

    if (result) {
      setSearchState('found');
      setFoundUser(result);
    } else {
      setSearchState(isSupabaseConfigured() ? 'not_found' : 'no_backend');
      setFoundUser(null);
    }
  };

  const handleAddFriend = (user: UserProfile) => {
    addFriend({
      uniqueId:     user.unique_id,
      nickname:     user.nickname,
      charId:       user.char_id,
      profileEmoji: user.profile_emoji,
      statusMsg:    user.status_msg,
      addedAt:      new Date().toISOString(),
    });
    setSearchState('already');
    setFoundUser(null);
    setSearchInput('');
  };

  const handleRemoveFriend = (uid: string, name: string) => {
    setDeleteConfirmId(uid);
    setDeleteConfirmName(name);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) removeFriend(deleteConfirmId);
    setDeleteConfirmId(null);
    setDeleteConfirmName('');
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
    setDeleteConfirmName('');
  };

  const openStatusModal = () => {
    setStatusInput(statusMsg);
    setShowStatusModal(true);
  };

  const saveStatus = () => {
    setStatusMsg(statusInput.trim());
    setShowStatusModal(false);
  };

  return (
    <View style={styles.outerWrap}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── 헤더 ───────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>친구</Text>
          </View>

          {/* ── 내 프로필 ──────────────────── */}
          <Text style={styles.sectionLabel}>내 프로필</Text>
          <ProfileCard
            profileEmoji={profileEmoji}
            nickname={characterName}
            uniqueId={uniqueId || '...'}
            statusMsg={statusMsg}
            onEdit={openStatusModal}
            isMe
          />

          <View style={styles.myProfileActions}>
            <TouchableOpacity style={styles.actionChip} onPress={() => setShowEmojiPicker(true)} activeOpacity={0.8}>
              <Text style={styles.actionChipEmoji}>🎨</Text>
              <Text style={styles.actionChipLabel}>프로필 사진 변경</Text>
            </TouchableOpacity>
            <View style={styles.codeChip}>
              <Ionicons name="key-outline" size={14} color={COLORS.navy} />
              <Text style={styles.codeChipText}>내 코드: <Text style={styles.codeChipId}>{uniqueId || '...'}</Text></Text>
            </View>
          </View>

          {/* ── 친구 검색 ──────────────────── */}
          <Text style={styles.sectionLabel}>친구 검색</Text>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Text style={styles.searchHash}>#</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="0000"
                placeholderTextColor={COLORS.textMuted}
                value={searchInput.replace('#', '')}
                onChangeText={t => { setSearchInput(t.replace(/\D/g, '').slice(0, 4)); setSearchState('idle'); }}
                keyboardType="numeric"
                maxLength={4}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
            </View>
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
              {searchState === 'loading'
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="search" size={18} color="#FFF" />
              }
            </TouchableOpacity>
          </View>

          {showSelfWarning && (
            <View style={styles.searchMsg}>
              <Text style={{ fontSize: 16 }}>😅</Text>
              <Text style={[styles.searchMsgText, { color: COLORS.navyDark }]}>내 아이디는 검색할 수 없어요!</Text>
            </View>
          )}

          {searchState === 'no_backend' && (
            <View style={styles.searchMsg}>
              <Ionicons name="cloud-offline-outline" size={20} color={COLORS.textMuted} />
              <Text style={styles.searchMsgText}>서버 연결 후 친구 검색이 가능해요</Text>
            </View>
          )}
          {searchState === 'not_found' && (
            <View style={styles.searchMsg}>
              <Ionicons name="help-circle-outline" size={20} color={COLORS.textMuted} />
              <Text style={styles.searchMsgText}>해당 코드의 친구를 찾을 수 없어요</Text>
            </View>
          )}
          {searchState === 'already' && (
            <View style={styles.searchMsg}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.navy} />
              <Text style={[styles.searchMsgText, { color: COLORS.navy }]}>이미 친구 목록에 있어요!</Text>
            </View>
          )}
          {searchState === 'found' && foundUser && (
            <View style={styles.searchResultWrap}>
              <ProfileCard
                profileEmoji={foundUser.profile_emoji}
                nickname={foundUser.nickname}
                uniqueId={foundUser.unique_id}
                statusMsg={foundUser.status_msg}
                rightSlot={
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleAddFriend(foundUser)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="person-add" size={14} color="#FFF" />
                    <Text style={styles.addBtnText}>추가</Text>
                  </TouchableOpacity>
                }
              />
            </View>
          )}

          {/* ── 친구 목록 ──────────────────── */}
          <View style={styles.friendListHeader}>
            <Text style={styles.sectionLabel}>친구 목록</Text>
            <Text style={styles.friendCount}>{friendList.length}명</Text>
          </View>

          {friendList.length === 0 ? (
            <View style={styles.emptyFriends}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyText}>아직 친구가 없어요</Text>
              <Text style={styles.emptySubText}>친구 코드로 검색해서 추가해보세요!</Text>
            </View>
          ) : (
            friendList.map(friend => (
              <View key={friend.uniqueId} style={styles.friendCardWrap}>
                <ProfileCard
                  profileEmoji={friend.profileEmoji}
                  nickname={friend.nickname}
                  uniqueId={friend.uniqueId}
                  statusMsg={friend.statusMsg}
                  rightSlot={
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemoveFriend(friend.uniqueId, friend.nickname)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="person-remove-outline" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  }
                />
              </View>
            ))
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* ── 친구 삭제 확인 모달 ───────────── */}
        {deleteConfirmId !== null && (
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <Text style={{ fontSize: 36, marginBottom: 4 }}>🗑️</Text>
              <Text style={styles.modalTitle}>친구 삭제</Text>
              <Text style={[styles.modalSub, { marginBottom: 8 }]}>
                <Text style={{ fontWeight: '700', color: COLORS.text }}>{deleteConfirmName}</Text>
                {'님을 친구 목록에서\n삭제할까요?'}
              </Text>
              <View style={styles.deleteModalBtns}>
                <TouchableOpacity style={styles.deleteCancelBtn} onPress={cancelDelete} activeOpacity={0.8}>
                  <Text style={styles.deleteCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmDelete} activeOpacity={0.8}>
                  <Text style={styles.deleteConfirmText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── 이모지 픽커 모달 ───────────────── */}
        {showEmojiPicker && (
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowEmojiPicker(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>프로필 사진 선택</Text>
              <Text style={styles.modalSub}>나를 표현할 이모지를 골라봐요</Text>
              <View style={styles.emojiGrid}>
                {PROFILE_EMOJIS.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.emojiCell, profileEmoji === emoji && styles.emojiCellSelected]}
                    onPress={() => { setProfileEmoji(emoji); setShowEmojiPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiCellText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── 상태메시지 편집 모달 ──────────── */}
        {showStatusModal && (
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowStatusModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>상태메시지</Text>
              <Text style={styles.modalSub}>지금 내 기분이나 한마디를 적어봐요</Text>
              <TextInput
                style={styles.statusInput}
                value={statusInput}
                onChangeText={t => setStatusInput(t.slice(0, 30))}
                placeholder="최대 30자"
                placeholderTextColor={COLORS.textMuted}
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={saveStatus}
                autoFocus
              />
              <Text style={styles.charCount}>{statusInput.length} / 30</Text>
              <TouchableOpacity
                style={[styles.confirmBtn, !statusInput.trim() && { opacity: 0.5 }]}
                onPress={saveStatus}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmBtnText}>저장하기</Text>
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
    backgroundColor: isWeb ? '#F5F5F5' : COLORS.bg,
    alignItems: isWeb ? 'center' : 'stretch',
  },
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    width: isWeb ? 390 : '100%',
  },
  scroll: { paddingBottom: 16 },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.textMuted,
    paddingHorizontal: 20, marginBottom: 8, marginTop: 14,
  },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16, borderRadius: 20, padding: 14,
    gap: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  profileCardMe: { borderColor: COLORS.navy },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.navyLight,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarEmoji: { fontSize: 30 },
  profileInfo: { flex: 1, gap: 4 },
  profileTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileNickname: { fontSize: 15, fontWeight: '800', color: COLORS.text, flexShrink: 1 },
  profileUniqueId: {
    fontSize: 11, fontWeight: '700', color: COLORS.navy,
    backgroundColor: COLORS.navyLight, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  profileStatus: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  profileStatusEmpty: { fontSize: 12, color: COLORS.border, fontStyle: 'italic' },
  editBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.navyLight, justifyContent: 'center', alignItems: 'center',
  },

  myProfileActions: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10, alignItems: 'center',
  },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.card, borderRadius: 9999,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  actionChipEmoji: { fontSize: 14 },
  actionChipLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  codeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.navyLight, borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  codeChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  codeChipId: { fontWeight: '800', color: COLORS.navy },

  searchRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: COLORS.border, ...SHADOW,
  },
  searchHash: { fontSize: 18, fontWeight: '800', color: COLORS.navy, marginRight: 2 },
  searchInput: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text, letterSpacing: 4 },
  searchBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.navy,
    justifyContent: 'center', alignItems: 'center', ...SHADOW,
  },

  searchMsg: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, marginTop: 10,
  },
  searchMsgText: { fontSize: 13, color: COLORS.textMuted },
  searchResultWrap: { marginTop: 8 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.navy, borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 7, ...SHADOW,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.navyLight, justifyContent: 'center', alignItems: 'center',
  },

  friendListHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 8, marginTop: 14,
  },
  friendCount: { fontSize: 13, fontWeight: '700', color: COLORS.navy },
  friendCardWrap: { marginBottom: 8 },

  emptyFriends: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptySubText: { fontSize: 12, color: COLORS.textMuted },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24, zIndex: 999,
  },
  modalCard: {
    width: '100%', backgroundColor: COLORS.card,
    borderRadius: 24, padding: 24, alignItems: 'center', gap: 10, ...SHADOW,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalSub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  closeBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.navyLight,
    justifyContent: 'center', alignItems: 'center', zIndex: 1,
  },

  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 8, marginTop: 4,
  },
  emojiCell: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  emojiCellSelected: {
    borderColor: COLORS.navy,
    backgroundColor: COLORS.navyLight,
  },
  emojiCellText: { fontSize: 26 },

  statusInput: {
    width: '100%', backgroundColor: COLORS.bg, borderRadius: 14,
    padding: 14, fontSize: 15, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 4,
  },
  charCount: { fontSize: 11, color: COLORS.textMuted, alignSelf: 'flex-end', marginTop: -4 },
  confirmBtn: {
    width: '100%', backgroundColor: COLORS.navy, borderRadius: 9999,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: COLORS.navyDark, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  deleteModalBtns: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  deleteCancelBtn: {
    flex: 1, backgroundColor: COLORS.navyLight,
    borderRadius: 9999, paddingVertical: 13,
    alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
  },
  deleteCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  deleteConfirmBtn: {
    flex: 1, backgroundColor: COLORS.navyDark,
    borderRadius: 9999, paddingVertical: 13, alignItems: 'center',
    shadowColor: COLORS.navyDark, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  deleteConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
