import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW } from '../constants';
import SweatOutLogo from '../components/SweatOutLogo';
import JejuLogo from '../components/JejuLogo';
import { UserProfile } from '../types/auth';

const isWeb  = Platform.OS === 'web';
const NUM    = 72;

const EMOJIS = [
  '🐱','🐶','🐰','🐻','🐼','🦊',
  '🐯','🦁','🐸','🐧','🦋','🐬',
  '🌸','⭐','🌈','🌙','☀️','🌊',
  '🍀','🌺','🎀','💫','🦄','🍭',
];

type Step = 0 | 1 | 2;

interface Props {
  onComplete: (profile: UserProfile) => void;
  onBack:     () => void;
}

export default function RegisterScreen({ onComplete, onBack }: Props) {
  const [step, setStep]         = useState<Step>(0);
  const [username, setUsername] = useState('');
  const [pin, setPin]           = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinPhase, setPinPhase] = useState<'enter' | 'confirm'>('enter');
  const [emoji, setEmoji]       = useState('🐱');
  const [error, setError]       = useState('');
  const submitted               = useRef(false);

  /* ─── Step 0: 아이디 ─────────────────────────── */
  async function handleUsernameNext() {
    const val = username.trim();
    if (!val)              { setError('아이디를 입력해주세요 😊'); return; }
    if (val.length > 12)   { setError('12자 이내로 입력해주세요');  return; }
    if (val.length < 2)    { setError('2자 이상 입력해주세요');     return; }

    /* 중복 확인 */
    try {
      const raw  = await AsyncStorage.getItem('@user_profiles');
      const list: UserProfile[] = raw ? JSON.parse(raw) : [];
      if (list.find(p => p.username === val)) {
        setError('이미 사용 중인 아이디예요 🙁');
        return;
      }
    } catch { /* 무시 */ }

    setError('');
    setStep(1);
  }

  /* ─── Step 1: PIN 설정 ────────────────────────── */
  function handlePinKey(key: string) {
    if (submitted.current) return;
    setError('');
    const current   = pinPhase === 'enter' ? pin : pinConfirm;
    const setCurrent = pinPhase === 'enter' ? setPin : setPinConfirm;

    if (key === '←') {
      setCurrent(p => p.slice(0, -1));
      return;
    }
    if (key === '✓') {
      if (current.length === 4) confirmPin(current);
      return;
    }
    if (current.length < 4) {
      const next = current + key;
      setCurrent(next);
      if (next.length === 4) {
        setTimeout(() => confirmPin(next), 80); // 마지막 점 보이고 넘어가기
      }
    }
  }

  function confirmPin(value: string) {
    if (pinPhase === 'enter') {
      setPinPhase('confirm');
      setPinConfirm('');
    } else {
      if (value !== pin) {
        setError('PIN이 일치하지 않아요. 다시 설정해주세요.');
        setPin('');
        setPinConfirm('');
        setPinPhase('enter');
      } else {
        setError('');
        setStep(2);
      }
    }
  }

  /* ─── Step 2: 완료 ───────────────────────────── */
  async function handleComplete() {
    const profile: UserProfile = {
      username,
      pin,
      emoji,
      createdAt: new Date().toISOString(),
    };
    try {
      const raw  = await AsyncStorage.getItem('@user_profiles');
      const list: UserProfile[] = raw ? JSON.parse(raw) : [];
      list.push(profile);
      await AsyncStorage.setItem('@user_profiles', JSON.stringify(list));
      await AsyncStorage.setItem('@last_username', username);
      await AsyncStorage.setItem('@active_user',   username);
    } catch { /* 무시 */ }
    onComplete(profile);
  }

  const currentDots = pinPhase === 'enter' ? pin : pinConfirm;
  const ROWS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['←','0','✓'],
  ];

  return (
    <View style={s.outer}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── 로고 ──────────────────────────────── */}
            <View style={s.logoWrap}>
              <SweatOutLogo width={160} height={94} />
            </View>

            {/* ── 뒤로 버튼 ─────────────────────────── */}
            <TouchableOpacity
              style={s.backBtn}
              onPress={step === 0 ? onBack : () => {
                setError('');
                if (step === 1) { setPin(''); setPinConfirm(''); setPinPhase('enter'); setStep(0); }
                if (step === 2) { setStep(1); }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.textMuted} />
              <Text style={s.backBtnText}>뒤로</Text>
            </TouchableOpacity>

            {/* ── 단계 표시 ─────────────────────────── */}
            <View style={s.stepBar}>
              {([0,1,2] as Step[]).map(i => (
                <View key={i} style={[s.stepDot, i <= step && s.stepDotActive]} />
              ))}
            </View>

            {/* ═══════════════════════════════════════ */}
            {/* STEP 0: 아이디 입력                     */}
            {/* ═══════════════════════════════════════ */}
            {step === 0 && (
              <View style={s.stepWrap}>
                <Text style={s.title}>아이디를 만들어주세요</Text>
                <Text style={s.subtitle}>로그인할 때 쓰는 이름이에요.</Text>

                <View style={s.card}>
                  <Text style={s.fieldLabel}>아이디</Text>
                  <View style={s.inputRow}>
                    <Ionicons name="person-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={s.textInput}
                      placeholder="예) 봄이, 하늘이, sweat01"
                      placeholderTextColor={COLORS.border}
                      value={username}
                      onChangeText={t => { setUsername(t.slice(0, 12)); setError(''); }}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleUsernameNext}
                      autoFocus
                    />
                    <Text style={s.charCount}>{username.length}/12</Text>
                  </View>
                  {error ? <Text style={s.errorText}>{error}</Text> : <View style={{ height: 18 }} />}
                  <Text style={s.hint}>2~12자, 나중에 변경할 수 없어요.</Text>
                </View>

                <TouchableOpacity style={s.primaryBtn} onPress={handleUsernameNext} activeOpacity={0.85}>
                  <Text style={s.primaryBtnText}>다음</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* STEP 1: PIN 설정                        */}
            {/* ═══════════════════════════════════════ */}
            {step === 1 && (
              <View style={s.stepWrap}>
                <Text style={s.title}>
                  {pinPhase === 'enter' ? 'PIN 번호를 설정해주세요' : 'PIN을 한 번 더 입력해주세요'}
                </Text>
                <Text style={s.subtitle}>
                  {pinPhase === 'enter'
                    ? '로그인할 때 사용할 4자리 번호예요.'
                    : '아까 입력한 번호와 동일하게 입력해주세요.'}
                </Text>

                {/* PIN 4자리 점 */}
                <View style={s.pinDots}>
                  {[0,1,2,3].map(i => (
                    <View key={i} style={[s.dot, i < currentDots.length && s.dotFilled]} />
                  ))}
                </View>

                {error ? (
                  <Text style={s.pinErrorText}>{error}</Text>
                ) : (
                  <View style={{ height: 26 }} />
                )}

                {/* 키패드 */}
                <View style={s.numpad}>
                  {ROWS.map((row, ri) => (
                    <View key={ri} style={s.numRow}>
                      {row.map(key => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            s.numKey,
                            key === '✓' && s.numKeyOk,
                            key === '←' && s.numKeyDel,
                          ]}
                          onPress={() => handlePinKey(key)}
                          activeOpacity={0.7}
                        >
                          {key === '←' ? (
                            <Ionicons name="backspace-outline" size={22} color={COLORS.text} />
                          ) : key === '✓' ? (
                            <Ionicons name="checkmark" size={22} color="#FFF" />
                          ) : (
                            <Text style={s.numKeyText}>{key}</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* STEP 2: 이모지 선택                     */}
            {/* ═══════════════════════════════════════ */}
            {step === 2 && (
              <View style={s.stepWrap}>
                <Text style={s.title}>프로필 이모지를{'\n'}선택해주세요!</Text>
                <Text style={s.subtitle}>나를 표현할 이모지를 골라봐요.</Text>

                {/* 미리보기 */}
                <View style={s.previewCard}>
                  <View style={s.previewAvatar}>
                    <Text style={s.previewAvatarEmoji}>{emoji}</Text>
                  </View>
                  <View>
                    <Text style={s.previewName}>{username}</Text>
                    <Text style={s.previewSub}>새로운 여정 시작 🌱</Text>
                  </View>
                </View>

                {/* 이모지 그리드 */}
                <View style={s.emojiGrid}>
                  {EMOJIS.map(e => (
                    <TouchableOpacity
                      key={e}
                      style={[s.emojiCell, emoji === e && s.emojiCellSel]}
                      onPress={() => setEmoji(e)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.emojiText}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={s.primaryBtn} onPress={handleComplete} activeOpacity={0.85}>
                  <Text style={s.primaryBtnText}>완료 — 시작할게요!</Text>
                  <Ionicons name="checkmark" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}

            {/* ── 제주대 ────────────────────────────── */}
            <View style={s.jejuRow}>
              <JejuLogo width={18} height={22} />
              <Text style={s.jejuText}>제주대학교 학생 건강증진 프로젝트</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: isWeb ? '#F2F2F7' : COLORS.bg,
    alignItems:      isWeb ? 'center' : 'stretch',
  },
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    width: isWeb ? 390 : '100%',
  },
  scroll: { paddingBottom: 40, flexGrow: 1 },

  /* 로고 */
  logoWrap: {
    alignItems:    'center',
    paddingTop:    28,
    paddingBottom: 4,
  },

  /* 뒤로 */
  backBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            6,
    paddingHorizontal: 24,
    paddingVertical:   8,
  },
  backBtnText: { fontSize: 13, color: COLORS.textMuted },

  /* 단계 점 */
  stepBar: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:             8,
    paddingVertical: 12,
  },
  stepDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: COLORS.border,
  },
  stepDotActive: { backgroundColor: COLORS.navy },

  /* 스텝 콘텐츠 */
  stepWrap: { paddingHorizontal: 24, flex: 1 },
  title: {
    fontSize:     24,
    color:        COLORS.text,
    lineHeight:   32,
    marginBottom:  8,
  },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 24, lineHeight: 21 },

  /* 카드 */
  card: {
    backgroundColor: COLORS.bg,
    borderRadius:    20,
    padding:         20,
    borderWidth:     1,
    borderColor:     COLORS.border,
    ...SHADOW,
    marginBottom:    24,
  },
  fieldLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.8, marginBottom: 10 },
  inputRow: {
    flexDirection:     'row',
    alignItems:        'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.navy,
    paddingBottom:     8,
  },
  textInput: {
    flex:            1,
    fontSize:        18,
    color:           COLORS.text,
    paddingVertical: 2,
    fontFamily:      'GmarketSans-Light',
  },
  charCount: { fontSize: 12, color: COLORS.border, marginLeft: 6 },
  errorText: { fontSize: 12, color: '#C0392B', marginTop: 8 },
  hint:      { fontSize: 11, color: COLORS.border, marginTop: 10 },

  /* PIN 점 */
  pinDots: {
    flexDirection:   'row',
    gap:              20,
    justifyContent:  'center',
    paddingVertical: 28,
  },
  dot: {
    width:           18,
    height:          18,
    borderRadius:    9,
    borderWidth:     2,
    borderColor:     COLORS.border,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  pinErrorText: {
    fontSize:   13,
    color:      '#C0392B',
    textAlign:  'center',
    marginBottom: 12,
    height:     26,
  },

  /* 키패드 */
  numpad:  { alignSelf: 'center', gap: 10, marginBottom: 14 },
  numRow:  { flexDirection: 'row', gap: 10 },
  numKey: {
    width:           NUM,
    height:          NUM,
    borderRadius:    NUM / 2,
    backgroundColor: COLORS.navyLight,
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  numKeyOk:   { backgroundColor: COLORS.navy,   borderColor: COLORS.navy },
  numKeyDel:  { backgroundColor: COLORS.bg,      borderColor: COLORS.border },
  numKeyText: { fontSize: 22, color: COLORS.text },

  /* 프로필 미리보기 */
  previewCard: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             16,
    backgroundColor: COLORS.navyLight,
    borderRadius:   20,
    padding:         16,
    marginBottom:    22,
    borderWidth:     1.5,
    borderColor:     COLORS.navy,
  },
  previewAvatar: {
    width:          60,
    height:         60,
    borderRadius:   30,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems:     'center',
    borderWidth:    2,
    borderColor:    COLORS.border,
  },
  previewAvatarEmoji: { fontSize: 32 },
  previewName: { fontSize: 18, color: COLORS.text, marginBottom: 4 },
  previewSub:  { fontSize: 12, color: COLORS.textMuted },

  /* 이모지 그리드 */
  emojiGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:             8,
    marginBottom:   28,
    justifyContent: 'center',
  },
  emojiCell: {
    width:           52,
    height:          52,
    borderRadius:    14,
    backgroundColor: COLORS.bg,
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     COLORS.border,
  },
  emojiCellSel: {
    borderColor:     COLORS.navy,
    backgroundColor: COLORS.navyLight,
    borderWidth:     2,
  },
  emojiText: { fontSize: 26 },

  /* 버튼 */
  primaryBtn: {
    flexDirection:  'row',
    backgroundColor: COLORS.navy,
    borderRadius:   18,
    paddingVertical: 17,
    justifyContent: 'center',
    alignItems:     'center',
    marginBottom:   12,
    shadowColor:    COLORS.navyDark,
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.25,
    shadowRadius:   8,
    elevation:      4,
  },
  primaryBtnText: { fontSize: 16, color: '#FFF' },

  /* 제주대 */
  jejuRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:             6,
    paddingTop:     14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginHorizontal: 24,
    marginTop:      12,
  },
  jejuText: { fontSize: 11, color: COLORS.border },
});
