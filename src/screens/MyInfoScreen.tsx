import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, Platform, TextInput, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../store/GameContext';
import { COLORS, SHADOW } from '../constants';
import { Session } from '../lib/session';
import { UserProfile } from '../types/auth';

const isWeb = Platform.OS === 'web';

const EMOJIS = [
  '🐱','🐶','🐰','🐻','🐼','🦊',
  '🐯','🦁','🐸','🐧','🦋','🐬',
  '🌸','⭐','🌈','🌙','☀️','🌊',
  '🍀','🌺','🎀','💫','🦄','🍭',
];

interface Props {
  onLogout: () => void;
}

export default function MyInfoScreen({ onLogout }: Props) {
  const {
    characterName, profileEmoji, statusMsg, sweatPoints, energy,
    setProfileEmoji, setStatusMsg,
  } = useGame();

  const [userProfile,      setUserProfile]      = useState<UserProfile | null>(null);
  const [showEmojiModal,   setShowEmojiModal]   = useState(false);
  const [showStatusModal,  setShowStatusModal]  = useState(false);
  const [showInfoModal,    setShowInfoModal]     = useState(false);
  const [showLogoutModal,  setShowLogoutModal]  = useState(false);
  const [statusInput,      setStatusInput]      = useState('');

  /* 현재 로그인한 유저 프로필 불러오기 */
  useEffect(() => {
    (async () => {
      try {
        const username = await Session.getItem('@active_user');
        if (!username) return;
        const { loginUserProfile } = await import('../lib/supabase');
        // username만으로 프로필 조회 (PIN 없이)
        const raw = await AsyncStorage.getItem('@user_profiles');
        const list: UserProfile[] = raw ? JSON.parse(raw) : [];
        const local = list.find(p => p.username === username);
        if (local) { setUserProfile(local); return; }
        // 로컬에 없으면 Supabase에서 직접 조회
        const { supabase } = await import('../lib/supabase');
        const { data } = await (supabase as any)
          .from('user_profiles').select('*').eq('username', username).maybeSingle();
        if (data) {
          setUserProfile({
            username:    data.username,
            pin:         '',
            emoji:       data.emoji,
            realName:    data.real_name  ?? '',
            studentId:   data.student_id ?? '',
            phone:       data.phone      ?? '',
            consentDate: data.consent_date ?? '',
            createdAt:   data.created_at   ?? '',
          });
        }
      } catch {}
    })();
  }, []);

  const openStatusModal = () => {
    setStatusInput(statusMsg);
    setShowStatusModal(true);
  };

  const saveStatus = () => {
    setStatusMsg(statusInput.trim());
    setShowStatusModal(false);
  };

  const handleLogout = async () => {
    await Session.removeItem('@active_user');
    setShowLogoutModal(false);
    onLogout();
  };

  /* ── 설정 메뉴 아이템 ────────────────────────── */
  const menuSections = [
    {
      title: '프로필',
      items: [
        { icon: 'happy-outline',   label: '프로필 이모지 변경', onPress: () => setShowEmojiModal(true) },
        { icon: 'chatbubble-outline', label: '상태메시지 설정',  onPress: openStatusModal },
      ],
    },
    {
      title: '내 활동',
      items: [
        { icon: 'footsteps-outline', label: '러닝 마일리지',   value: `${sweatPoints} 마일`, onPress: undefined },
        { icon: 'heart-outline',     label: '마음 에너지',      value: `${energy} / 100`,     onPress: undefined },
      ],
    },
    {
      title: '계정',
      items: [
        { icon: 'person-outline',    label: '회원정보 확인',   onPress: () => setShowInfoModal(true) },
        { icon: 'lock-closed-outline', label: 'PIN 변경',      onPress: undefined, comingSoon: true },
        { icon: 'shield-outline',    label: '개인정보 처리방침', onPress: undefined, comingSoon: true },
      ],
    },
    {
      title: '앱 정보',
      items: [
        { icon: 'information-circle-outline', label: '버전 정보', value: '1.0.0', onPress: undefined },
        { icon: 'mail-outline',               label: '문의하기',  onPress: undefined, comingSoon: true },
      ],
    },
  ] as const;

  return (
    <View style={s.outer}>
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* ── 헤더 ──────────────────────────── */}
          <View style={s.header}>
            <Text style={s.headerTitle}>내 정보</Text>
          </View>

          {/* ── 프로필 히어로 카드 ──────────────── */}
          <View style={s.heroCard}>
            <TouchableOpacity
              style={s.avatarWrap}
              onPress={() => setShowEmojiModal(true)}
              activeOpacity={0.8}
            >
              <Text style={s.avatarEmoji}>{profileEmoji || '🐱'}</Text>
              <View style={s.avatarEditBadge}>
                <Ionicons name="pencil" size={10} color="#FFF" />
              </View>
            </TouchableOpacity>

            <View style={s.heroInfo}>
              <Text style={s.heroName}>{characterName || '스웨더'}</Text>
              <TouchableOpacity onPress={openStatusModal} activeOpacity={0.7} style={s.statusRow}>
                {statusMsg
                  ? <Text style={s.statusText}>"{statusMsg}"</Text>
                  : <Text style={s.statusPlaceholder}>상태메시지를 입력해보세요 ✏️</Text>
                }
              </TouchableOpacity>
            </View>

            {/* 활동 요약 */}
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statNum}>{sweatPoints}</Text>
                <Text style={s.statLabel}>마일리지</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statNum}>{energy}</Text>
                <Text style={s.statLabel}>마음에너지</Text>
              </View>
            </View>
          </View>

          {/* ── 메뉴 섹션들 ─────────────────────── */}
          {menuSections.map(section => (
            <View key={section.title} style={s.section}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <View style={s.menuCard}>
                {section.items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[s.menuItem, idx < section.items.length - 1 && s.menuItemBorder]}
                    onPress={item.onPress ?? undefined}
                    activeOpacity={item.onPress ? 0.7 : 1}
                    disabled={!item.onPress}
                  >
                    <View style={s.menuLeft}>
                      <View style={s.menuIconWrap}>
                        <Ionicons name={item.icon as any} size={17} color={COLORS.navy} />
                      </View>
                      <Text style={s.menuLabel}>{item.label}</Text>
                      {'comingSoon' in item && item.comingSoon && (
                        <View style={s.comingSoonBadge}>
                          <Text style={s.comingSoonText}>준비 중</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.menuRight}>
                      {'value' in item && item.value && (
                        <Text style={s.menuValue}>{item.value}</Text>
                      )}
                      {item.onPress && !('value' in item && item.value) && (
                        <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* ── 로그아웃 ──────────────────────── */}
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={() => setShowLogoutModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#C0392B" style={{ marginRight: 8 }} />
            <Text style={s.logoutText}>로그아웃</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── 이모지 선택 모달 ──────────────────── */}
      <Modal visible={showEmojiModal} transparent animationType="slide" onRequestClose={() => setShowEmojiModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.sheetHandle} />
            <Text style={s.modalTitle}>프로필 이모지 변경</Text>
            <Text style={s.modalSub}>나를 표현할 이모지를 골라봐요</Text>
            <View style={s.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[s.emojiCell, profileEmoji === e && s.emojiCellSel]}
                  onPress={() => { setProfileEmoji(e); setShowEmojiModal(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowEmojiModal(false)} activeOpacity={0.7}>
              <Text style={s.modalCancelText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 상태메시지 모달 ───────────────────── */}
      <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { paddingBottom: 40 }]}>
            <View style={s.sheetHandle} />
            <Text style={s.modalTitle}>상태메시지</Text>
            <Text style={s.modalSub}>지금 내 기분이나 한마디를 적어봐요</Text>
            <TextInput
              style={s.statusInput}
              value={statusInput}
              onChangeText={t => setStatusInput(t.slice(0, 30))}
              placeholder="최대 30자"
              placeholderTextColor={COLORS.border}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={saveStatus}
              autoFocus
            />
            <Text style={s.charCount}>{statusInput.length} / 30</Text>
            <TouchableOpacity style={s.primaryBtn} onPress={saveStatus} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>저장하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowStatusModal(false)} activeOpacity={0.7}>
              <Text style={s.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 회원정보 모달 ─────────────────────── */}
      <Modal visible={showInfoModal} transparent animationType="slide" onRequestClose={() => setShowInfoModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.sheetHandle} />
            <Text style={s.modalTitle}>회원정보</Text>
            <View style={s.infoTable}>
              {[
                { label: '아이디',   value: userProfile?.username  || characterName || '-' },
                { label: '본명',     value: userProfile?.realName  || '-' },
                { label: '학번',     value: userProfile?.studentId || '-' },
                { label: '전화번호', value: userProfile?.phone     || '-' },
                { label: '가입일',   value: userProfile?.createdAt ? userProfile.createdAt.slice(0, 10) : '-' },
              ].map(row => (
                <View key={row.label} style={s.infoRow}>
                  <Text style={s.infoLabel}>{row.label}</Text>
                  <Text style={s.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>
            <View style={s.infoNotice}>
              <Ionicons name="lock-closed-outline" size={13} color={COLORS.textMuted} />
              <Text style={s.infoNoticeText}>개인정보 수정은 담당 연구원에게 문의해주세요.</Text>
            </View>
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowInfoModal(false)} activeOpacity={0.7}>
              <Text style={s.modalCancelText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 로그아웃 확인 모달 ────────────────── */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.confirmCard}>
            <Text style={s.confirmEmoji}>👋</Text>
            <Text style={s.confirmTitle}>로그아웃 할까요?</Text>
            <Text style={s.confirmSub}>로그인 화면으로 이동해요.</Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setShowLogoutModal(false)} activeOpacity={0.8}>
                <Text style={s.confirmCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmOkBtn} onPress={handleLogout} activeOpacity={0.85}>
                <Text style={s.confirmOkText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: isWeb ? '#F5F5F5' : COLORS.bg, alignItems: isWeb ? 'center' : 'stretch' },
  safe:  { flex: 1, backgroundColor: COLORS.bg, width: isWeb ? 390 : '100%' },
  scroll: { paddingBottom: 16 },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  /* ── 히어로 카드 ─────────────────────────────── */
  heroCard: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    backgroundColor: COLORS.navyLight, borderRadius: 24,
    padding: 20, borderWidth: 1.5, borderColor: COLORS.navy,
    ...SHADOW,
  },
  avatarWrap: {
    alignSelf: 'center', marginBottom: 12,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.navy,
  },
  avatarEmoji: { fontSize: 44 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  heroInfo:    { alignItems: 'center', marginBottom: 16 },
  heroName:    { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  statusRow:   { alignItems: 'center' },
  statusText:  { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
  statusPlaceholder: { fontSize: 13, color: COLORS.border },

  statsRow: {
    flexDirection: 'row', backgroundColor: '#FFF',
    borderRadius: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 22, fontWeight: '800', color: COLORS.navy },
  statLabel:   { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  /* ── 메뉴 ───────────────────────────────────── */
  section:      { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: 8 },
  menuCard: {
    backgroundColor: COLORS.bg, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOW,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: COLORS.navyLight, justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { fontSize: 14, color: COLORS.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { fontSize: 13, fontWeight: '700', color: COLORS.navy },

  comingSoonBadge: {
    backgroundColor: '#F0F0F0', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6,
  },
  comingSoonText: { fontSize: 10, color: COLORS.textMuted },

  /* ── 로그아웃 ───────────────────────────────── */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 20, paddingVertical: 14,
    backgroundColor: '#FFF5F5', borderRadius: 16,
    borderWidth: 1, borderColor: '#FFCCCC',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#C0392B' },

  /* ── 모달 공통 ──────────────────────────────── */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 32, alignItems: 'center', gap: 10,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalSub:   { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 20, marginTop: 4 },
  modalCancelText: { fontSize: 14, color: COLORS.textMuted },

  /* 이모지 */
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginVertical: 8 },
  emojiCell: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  emojiCellSel: { borderColor: COLORS.navy, backgroundColor: COLORS.navyLight, borderWidth: 2 },
  emojiText: { fontSize: 28 },

  /* 상태메시지 */
  statusInput: {
    width: '100%', backgroundColor: COLORS.navyLight, borderRadius: 14,
    padding: 14, fontSize: 15, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border,
  },
  charCount: { fontSize: 11, color: COLORS.textMuted, alignSelf: 'flex-end' },
  primaryBtn: {
    width: '100%', backgroundColor: COLORS.navy, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: COLORS.navyDark, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  /* 회원정보 */
  infoTable: { width: '100%', gap: 2, marginTop: 4 },
  infoRow: {
    flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoLabel: { width: 72, fontSize: 13, color: COLORS.textMuted },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text },
  infoNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6,
    backgroundColor: COLORS.navyLight, borderRadius: 10, padding: 10, width: '100%',
  },
  infoNoticeText: { fontSize: 11, color: COLORS.textMuted, flex: 1 },

  /* 로그아웃 확인 */
  confirmCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, alignItems: 'center', gap: 8,
  },
  confirmEmoji: { fontSize: 44, marginBottom: 4 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  confirmSub:   { fontSize: 13, color: COLORS.textMuted },
  confirmBtns:  { flexDirection: 'row', gap: 10, width: '100%', marginTop: 12 },
  confirmCancelBtn: {
    flex: 1, backgroundColor: COLORS.navyLight, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  confirmCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  confirmOkBtn: {
    flex: 1, backgroundColor: '#C0392B', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmOkText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
