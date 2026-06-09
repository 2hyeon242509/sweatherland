import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW } from '../constants';

const isWeb = Platform.OS === 'web';

const PROFILE_EMOJIS = [
  '🐱','🐶','🐰','🐻','🐼','🦊',
  '🐯','🦁','🐸','🐧','🦋','🐬',
  '🌸','⭐','🌈','🌙','☀️','🌊',
  '🍀','🌺','🎀','💫','🦄','🍭',
];

// 단계: 0 = 인트로, 1 = 닉네임, 2 = 이모지
type Step = 0 | 1 | 2;

interface OnboardingScreenProps {
  onComplete: (nickname: string, emoji: string) => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep]         = useState<Step>(0);
  const [nickname, setNickname] = useState('');
  const [emoji, setEmoji]       = useState('🐱');
  const [error, setError]       = useState('');

  const handleNicknameNext = () => {
    const trimmed = nickname.trim();
    if (!trimmed) { setError('닉네임을 입력해주세요 😊'); return; }
    if (trimmed.length > 10) { setError('10자 이내로 입력해주세요'); return; }
    setError('');
    setStep(2);
  };

  const handleComplete = () => {
    onComplete(nickname.trim() || '스웨더', emoji);
  };

  return (
    <View style={styles.outerWrap}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── 로고 영역 ─────────────────────────────── */}
            <View style={styles.logoArea}>
              <View style={styles.logoBox}>
                <Text style={styles.logoMark}>S</Text>
              </View>
              <Text style={styles.logoTitle}>SWEAT OUT</Text>
              <Text style={styles.logoSub}>S.WEATHER LAND</Text>
            </View>

            {/* ── STEP 0: 인트로 ────────────────────────── */}
            {step === 0 && (
              <View style={styles.stepWrap}>
                <View style={styles.welcomeCard}>
                  <Text style={styles.welcomeEmoji}>🌤</Text>
                  <Text style={styles.welcomeTitle}>스웻아웃에 오신 걸{'\n'}환영해요!</Text>
                  <Text style={styles.welcomeDesc}>
                    {'매일의 감정을 기록하고\n작은 미션을 완료하며\n나만의 건강한 루틴을 만들어봐요.'}
                  </Text>
                </View>

                <View style={styles.featureList}>
                  {[
                    { icon: '📔', text: '감정 워크북으로 오늘 기분 기록하기' },
                    { icon: '🚩', text: '작은 미션 완료하고 땀방울 모으기' },
                    { icon: '👟', text: '러닝 마일리지를 마음에너지로 환전' },
                    { icon: '👥', text: '친구 코드로 서로 연결하기' },
                  ].map((f, i) => (
                    <View key={i} style={styles.featureItem}>
                      <Text style={styles.featureEmoji}>{f.icon}</Text>
                      <Text style={styles.featureText}>{f.text}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(1)} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>시작하기</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 1: 닉네임 입력 ───────────────────── */}
            {step === 1 && (
              <View style={styles.stepWrap}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNum}>1 / 2</Text>
                  <Text style={styles.stepTitle}>어떻게 불러드릴까요?</Text>
                  <Text style={styles.stepDesc}>앱에서 사용할 닉네임을 알려주세요.</Text>
                </View>

                <View style={styles.inputCard}>
                  <Text style={styles.inputLabel}>닉네임</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="예) 봄이, 하늘이, 달빛"
                      placeholderTextColor={COLORS.border}
                      value={nickname}
                      onChangeText={t => { setNickname(t.slice(0, 10)); setError(''); }}
                      maxLength={10}
                      returnKeyType="next"
                      onSubmitEditing={handleNicknameNext}
                      autoFocus
                    />
                    <Text style={styles.charCount}>{nickname.length}/10</Text>
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  <Text style={styles.inputHint}>나중에 언제든지 변경할 수 있어요.</Text>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleNicknameNext} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>다음</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.backLink} onPress={() => setStep(0)} activeOpacity={0.7}>
                  <Text style={styles.backLinkText}>← 뒤로</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 2: 프로필 이모지 선택 ───────────── */}
            {step === 2 && (
              <View style={styles.stepWrap}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNum}>2 / 2</Text>
                  <Text style={styles.stepTitle}>프로필 이모지를{'\n'}선택해주세요!</Text>
                  <Text style={styles.stepDesc}>나를 표현할 이모지를 골라봐요.</Text>
                </View>

                {/* 선택된 이모지 미리보기 */}
                <View style={styles.previewCard}>
                  <View style={styles.previewAvatar}>
                    <Text style={styles.previewAvatarEmoji}>{emoji}</Text>
                  </View>
                  <View>
                    <Text style={styles.previewName}>{nickname || '스웨더'}</Text>
                    <Text style={styles.previewId}>새로운 여정을 시작해요 🌱</Text>
                  </View>
                </View>

                {/* 이모지 그리드 */}
                <View style={styles.emojiGrid}>
                  {PROFILE_EMOJIS.map(e => (
                    <TouchableOpacity
                      key={e}
                      style={[styles.emojiCell, emoji === e && styles.emojiCellSelected]}
                      onPress={() => setEmoji(e)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emojiText}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleComplete} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>완료 — 시작할게요!</Text>
                  <Ionicons name="checkmark" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.backLink} onPress={() => setStep(1)} activeOpacity={0.7}>
                  <Text style={styles.backLinkText}>← 뒤로</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
  scroll: { paddingBottom: 48, flexGrow: 1 },

  // ── 로고 ──────────────────────────────────────
  logoArea: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  logoBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: COLORS.navy,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.navyDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  logoMark: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  logoTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.navy,
    letterSpacing: 3, marginBottom: 4,
  },
  logoSub: { fontSize: 12, color: COLORS.textMuted, letterSpacing: 1.5 },

  // ── 스텝 공통 ─────────────────────────────────
  stepWrap: { paddingHorizontal: 24, flex: 1 },
  stepHeader: { marginBottom: 28 },
  stepNum: {
    fontSize: 12, fontWeight: '700', color: COLORS.navy,
    letterSpacing: 1, marginBottom: 8,
  },
  stepTitle: {
    fontSize: 26, fontWeight: '800', color: COLORS.text,
    lineHeight: 34, marginBottom: 8,
  },
  stepDesc: { fontSize: 14, color: COLORS.textMuted, lineHeight: 21 },

  // ── 웰컴 카드 ─────────────────────────────────
  welcomeCard: {
    backgroundColor: COLORS.navyLight,
    borderRadius: 24, padding: 24, alignItems: 'center',
    marginBottom: 24, borderWidth: 1, borderColor: COLORS.border,
  },
  welcomeEmoji: { fontSize: 56, marginBottom: 12 },
  welcomeTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.text,
    textAlign: 'center', lineHeight: 30, marginBottom: 12,
  },
  welcomeDesc: {
    fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22,
  },

  featureList: { marginBottom: 28, gap: 12 },
  featureItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  featureEmoji: { fontSize: 22 },
  featureText: { fontSize: 13, color: COLORS.text, fontWeight: '500', flex: 1 },

  // ── 닉네임 입력 ───────────────────────────────
  inputCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 10, letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textInput: {
    flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text,
    borderBottomWidth: 2, borderBottomColor: COLORS.navy,
    paddingVertical: 8,
  },
  charCount: { fontSize: 12, color: COLORS.border },
  errorText: { fontSize: 13, color: COLORS.navyDark, marginTop: 8 },
  inputHint: { fontSize: 11, color: COLORS.border, marginTop: 10 },

  // ── 프로필 미리보기 ───────────────────────────
  previewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: COLORS.navyLight, borderRadius: 20,
    padding: 16, marginBottom: 24,
    borderWidth: 1.5, borderColor: COLORS.navy,
  },
  previewAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.border,
  },
  previewAvatarEmoji: { fontSize: 32 },
  previewName: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  previewId: { fontSize: 12, color: COLORS.textMuted },

  // ── 이모지 그리드 ─────────────────────────────
  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 28,
    justifyContent: 'center',
  },
  emojiCell: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  emojiCellSelected: {
    borderColor: COLORS.navy, backgroundColor: COLORS.navyLight, borderWidth: 2,
  },
  emojiText: { fontSize: 26 },

  // ── 버튼 ──────────────────────────────────────
  primaryBtn: {
    flexDirection: 'row', backgroundColor: COLORS.navy,
    borderRadius: 18, paddingVertical: 17,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.navyDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkText: { fontSize: 13, color: COLORS.textMuted },
});
