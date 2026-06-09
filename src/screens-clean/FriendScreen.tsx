import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useGame, FriendEntry } from '../store/GameContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isSupabaseConfigured, upsertUserProfile, searchUserById, UserProfile,
} from '../lib/supabase';

// 로컬 mock 유저 검색 (Supabase 미연결 시 데모용)
async function searchLocalMock(uniqueId: string): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem('@mock_users');
    if (!raw) return null;
    const list = JSON.parse(raw) as UserProfile[];
    return list.find(u => u.unique_id === uniqueId) ?? null;
  } catch { return null; }
}

const PROFILE_EMOJIS = [
  '🐱','🐶','🐰','🐻','🐼','🦊',
  '🐯','🦁','🐸','🐧','🦋','🐬',
  '🌸','⭐','🌈','🌙','☀️','🌊',
  '🍀','🌺','🎀','💫','🦄','🍭',
];

export default function FriendScreen() {
  const {
    characterName, uniqueId, statusMsg, profileEmoji,
    friendList,
    setStatusMsg, setProfileEmoji, addFriend, removeFriend,
  } = useGame();

  // 검색 상태
  const [searchInput, setSearchInput] = useState('');
  const [searchState, setSearchState] = useState<
    'idle' | 'loading' | 'found' | 'not_found' | 'no_backend' | 'already'
  >('idle');
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);

  // 모달 상태
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput,     setStatusInput]     = useState('');

  // 삭제 확인 모달
  const [deleteConfirmId,   setDeleteConfirmId]   = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // 내 아이디 검색 경고
  const [showSelfWarning, setShowSelfWarning] = useState(false);

  // @mock_users 자동 시딩
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      AsyncStorage.getItem('@mock_users').then(raw => {
        if (!raw) {
          AsyncStorage.setItem('@mock_users', JSON.stringify([
            { unique_id: '#1000', nickname: '봄이',   char_id: 'momo',  profile_emoji: '🌸', status_msg: '오늘도 파이팅 ✨' },
            { unique_id: '#2024', nickname: '하늘이', char_id: 'sunny', profile_emoji: '☀️', status_msg: '맑은 하루!' },
            { unique_id: '#0777', nickname: '달빛이', char_id: 'lunna', profile_emoji: '🌙', status_msg: '밤하늘 산책 중 🌃' },
          ])).catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  // Supabase 연결 시 내 프로필 자동 업데이트
  useFocusEffect(useCallback(() => {
    if (isSupabaseConfigured() && uniqueId) {
      upsertUserProfile({
        unique_id:     uniqueId,
        nickname:      characterName,
        char_id:       'momo',
        profile_emoji: profileEmoji,
        status_msg:    statusMsg,
      }).catch(() => {});
    }
  }, [uniqueId, characterName, profileEmoji, statusMsg]));

  // 검색
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
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── 헤더 ───────────────────────────── */}
        <Text style={s.pageTitle}>친구</Text>

        {/* ── 내 프로필 ──────────────────────── */}
        <Text style={s.sectionLabel}>내 프로필</Text>
        <View style={[s.profileCard, s.profileCardMe]}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarEmoji}>{profileEmoji}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileNickname}>{characterName}</Text>
            <Text style={s.profileId}>{uniqueId || '...'}</Text>
            {statusMsg
              ? <Text style={s.profileStatus}>"{statusMsg}"</Text>
              : <Text style={s.profileStatusEmpty}>상태메시지를 입력해보세요</Text>
            }
          </View>
          <TouchableOpacity onPress={openStatusModal} style={s.editBtn}>
            <Text style={s.editBtnText}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* 프로필 이모지 변경 + 내 코드 */}
        <View style={s.myActions}>
          <TouchableOpacity style={s.actionChip} onPress={() => setShowEmojiPicker(true)}>
            <Text style={s.actionChipText}>🎨 프로필 사진 변경</Text>
          </TouchableOpacity>
          <View style={s.codeChip}>
            <Text style={s.codeChipText}>내 코드: <Text style={s.codeId}>{uniqueId || '...'}</Text></Text>
          </View>
        </View>

        {/* ── 친구 검색 ──────────────────────── */}
        <Text style={s.sectionLabel}>친구 검색</Text>
        <View style={s.searchRow}>
          <View style={s.searchInputWrap}>
            <Text style={s.searchHash}>#</Text>
            <TextInput
              style={s.searchInput}
              placeholder="0000"
              placeholderTextColor="#AAAAAA"
              value={searchInput.replace('#', '')}
              onChangeText={t => { setSearchInput(t.replace(/\D/g, '').slice(0, 4)); setSearchState('idle'); }}
              keyboardType="numeric"
              maxLength={4}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
          <TouchableOpacity style={s.searchBtn} onPress={handleSearch}>
            {searchState === 'loading'
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={s.searchBtnText}>검색</Text>
            }
          </TouchableOpacity>
        </View>

        {/* 검색 메시지들 */}
        {showSelfWarning && (
          <Text style={[s.searchMsg, { color: '#FF6B6B' }]}>😅 내 아이디는 검색할 수 없어요!</Text>
        )}
        {searchState === 'no_backend' && (
          <Text style={s.searchMsg}>☁️ 서버 연결 후 친구 검색이 가능해요</Text>
        )}
        {searchState === 'not_found' && (
          <Text style={s.searchMsg}>🔍 해당 코드의 친구를 찾을 수 없어요</Text>
        )}
        {searchState === 'already' && (
          <Text style={[s.searchMsg, { color: '#5C9E4A' }]}>✅ 이미 친구 목록에 있어요!</Text>
        )}

        {/* 검색 결과 카드 */}
        {searchState === 'found' && foundUser && (
          <View style={s.profileCard}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarEmoji}>{foundUser.profile_emoji}</Text>
            </View>
            <View style={s.profileInfo}>
              <Text style={s.profileNickname}>{foundUser.nickname}</Text>
              <Text style={s.profileId}>{foundUser.unique_id}</Text>
              {foundUser.status_msg ? <Text style={s.profileStatus}>"{foundUser.status_msg}"</Text> : null}
            </View>
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => handleAddFriend(foundUser)}
            >
              <Text style={s.addBtnText}>추가</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 친구 목록 ──────────────────────── */}
        <View style={s.friendListHeader}>
          <Text style={s.sectionLabel}>친구 목록</Text>
          <Text style={s.friendCount}>{friendList.length}명</Text>
        </View>

        {friendList.length === 0 ? (
          <View style={s.emptyFriends}>
            <Text style={s.emptyEmoji}>🌱</Text>
            <Text style={s.emptyText}>아직 친구가 없어요</Text>
            <Text style={s.emptySub}>친구 코드로 검색해서 추가해보세요!</Text>
          </View>
        ) : (
          friendList.map(friend => (
            <View key={friend.uniqueId} style={s.profileCard}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarEmoji}>{friend.profileEmoji}</Text>
              </View>
              <View style={s.profileInfo}>
                <Text style={s.profileNickname}>{friend.nickname}</Text>
                <Text style={s.profileId}>{friend.uniqueId}</Text>
                {friend.statusMsg ? <Text style={s.profileStatus}>"{friend.statusMsg}"</Text> : null}
              </View>
              <TouchableOpacity
                style={s.removeBtn}
                onPress={() => handleRemoveFriend(friend.uniqueId, friend.nickname)}
              >
                <Text style={s.removeBtnText}>삭제</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── 친구 삭제 확인 모달 ───────────────── */}
      {deleteConfirmId !== null && (
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalEmoji}>🗑️</Text>
            <Text style={s.modalTitle}>친구 삭제</Text>
            <Text style={s.modalBody}>
              <Text style={{ fontWeight: '700' }}>{deleteConfirmName}</Text>
              {'님을 친구 목록에서\n삭제할까요?'}
            </Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={cancelDelete}>
                <Text style={s.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete}>
                <Text style={s.deleteBtnText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── 이모지 픽커 모달 ───────────────────── */}
      {showEmojiPicker && (
        <View style={s.overlay}>
          <View style={s.modal}>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowEmojiPicker(false)}>
              <Text>✕</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>프로필 사진 선택</Text>
            <Text style={s.modalBody}>나를 표현할 이모지를 골라봐요</Text>
            <View style={s.emojiGrid}>
              {PROFILE_EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[s.emojiCell, profileEmoji === emoji && s.emojiCellSelected]}
                  onPress={() => { setProfileEmoji(emoji); setShowEmojiPicker(false); }}
                >
                  <Text style={s.emojiCellText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ── 상태메시지 편집 모달 ──────────────── */}
      {showStatusModal && (
        <View style={s.overlay}>
          <View style={s.modal}>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowStatusModal(false)}>
              <Text>✕</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>상태메시지</Text>
            <Text style={s.modalBody}>지금 내 기분이나 한마디를 적어봐요</Text>
            <TextInput
              style={s.statusInput}
              value={statusInput}
              onChangeText={t => setStatusInput(t.slice(0, 30))}
              placeholder="최대 30자"
              placeholderTextColor="#AAAAAA"
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={saveStatus}
              autoFocus
            />
            <Text style={s.charCount}>{statusInput.length} / 30</Text>
            <TouchableOpacity
              style={[s.saveBtn, !statusInput.trim() && { opacity: 0.5 }]}
              onPress={saveStatus}
            >
              <Text style={s.saveBtnText}>저장하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FEFAE6' },
  scroll: { paddingBottom: 16 },

  pageTitle:    { fontSize: 22, fontWeight: '800', color: '#3D3224', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#888888', paddingHorizontal: 20, marginBottom: 8, marginTop: 14 },

  // Profile card
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EEEEEE',
  },
  profileCardMe: { borderColor: '#5C9E4A', borderWidth: 1.5 },
  avatarCircle:  { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  avatarEmoji:   { fontSize: 28 },
  profileInfo:   { flex: 1, gap: 2 },
  profileNickname: { fontSize: 15, fontWeight: '800', color: '#3D3224' },
  profileId:       { fontSize: 11, fontWeight: '700', color: '#5C9E4A', backgroundColor: '#EDF5E8', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  profileStatus:      { fontSize: 12, color: '#888888', fontStyle: 'italic' },
  profileStatusEmpty: { fontSize: 12, color: '#CCCCCC', fontStyle: 'italic' },
  editBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  editBtnText: { fontSize: 16 },

  // My profile actions
  myActions:      { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4, alignItems: 'center' },
  actionChip:     { backgroundColor: '#FFFFFF', borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#EEEEEE' },
  actionChipText: { fontSize: 12, fontWeight: '600', color: '#3D3224' },
  codeChip:       { flex: 1, backgroundColor: '#EDF5E8', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 8 },
  codeChipText:   { fontSize: 12, color: '#3D3224', fontWeight: '600' },
  codeId:         { fontWeight: '800', color: '#5C9E4A' },

  // Search
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  searchHash:  { fontSize: 16, fontWeight: '800', color: '#888888', marginRight: 4 },
  searchInput: { flex: 1, fontSize: 18, fontWeight: '700', paddingVertical: 12, color: '#3D3224', letterSpacing: 4 },
  searchBtn:   { backgroundColor: '#5C9E4A', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center', height: 48 },
  searchBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  searchMsg: { fontSize: 13, color: '#888888', textAlign: 'center', paddingVertical: 8, paddingHorizontal: 20 },

  addBtn:     { backgroundColor: '#5C9E4A', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Friend list
  friendListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  friendCount:      { fontSize: 12, color: '#888888', fontWeight: '600', marginTop: 14 },
  removeBtn:     { backgroundColor: '#FFE8E8', borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 6 },
  removeBtnText: { color: '#FF6B6B', fontSize: 12, fontWeight: '700' },

  emptyFriends: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji:   { fontSize: 40 },
  emptyText:    { fontSize: 15, fontWeight: '700', color: '#3D3224' },
  emptySub:     { fontSize: 13, color: '#888888' },

  // Modals
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modal: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 24, gap: 10,
  },
  modalEmoji: { fontSize: 36, textAlign: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#3D3224', textAlign: 'center' },
  modalBody:  { fontSize: 13, color: '#888888', textAlign: 'center', lineHeight: 20 },
  closeBtn:   { alignSelf: 'flex-end', padding: 4 },

  modalBtns:    { flexDirection: 'row', gap: 10 },
  cancelBtn:    { flex: 1, backgroundColor: '#EEEEEE', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText:{ fontSize: 14, fontWeight: '700', color: '#888888' },
  deleteBtn:    { flex: 1, backgroundColor: '#FF6B6B', borderRadius: 10, padding: 14, alignItems: 'center' },
  deleteBtnText:{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiCell: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  emojiCellSelected: { borderColor: '#5C9E4A', backgroundColor: '#EDF5E8' },
  emojiCellText:     { fontSize: 24 },

  statusInput: {
    borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#3D3224',
  },
  charCount:  { fontSize: 11, color: '#AAAAAA', textAlign: 'right' },
  saveBtn:    { backgroundColor: '#5C9E4A', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText:{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
