import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW } from '../constants';
import SweatOutLogo from '../components/SweatOutLogo';
import JejuLogo from '../components/JejuLogo';
import { Session } from '../lib/session';
import { UserProfile } from '../types/auth';

const isWeb = Platform.OS === 'web';

const EMOJIS = [
  '🐱','🐶','🐰','🐻','🐼','🦊',
  '🐯','🦁','🐸','🐧','🦋','🐬',
  '🌸','⭐','🌈','🌙','☀️','🌊',
  '🍀','🌺','🎀','💫','🦄','🍭',
];

type Step = 0 | 1 | 2 | 3;

interface Props {
  onComplete: (profile: UserProfile) => void;
  onBack:     () => void;
}

export default function RegisterScreen({ onComplete, onBack }: Props) {
  const [step,      setStep]      = useState<Step>(0);
  const [username,  setUsername]  = useState('');
  const [realName,  setRealName]  = useState('');
  const [studentId, setStudentId] = useState('');
  const [phone,     setPhone]     = useState('');
  const [error,     setError]     = useState('');

  const [consent1,  setConsent1]  = useState(false);
  const [consent2,  setConsent2]  = useState(false);
  const [consent3,  setConsent3]  = useState(false);

  const [pin,        setPin]        = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinPhase,   setPinPhase]   = useState<'enter' | 'confirm'>('enter');
  const pinRef     = useRef('');
  const pin1Ref    = useRef<TextInput>(null);
  const pin2Ref    = useRef<TextInput>(null);

  const [emoji, setEmoji] = useState('🐱');

  /* ── STEP 0 ── */
  async function handleInfoNext() {
    const u = username.trim(), r = realName.trim(), sid = studentId.trim(), p = phone.trim();
    if (!u)           { setError('아이디를 입력해주세요');           return; }
    if (u.length < 2) { setError('아이디는 2자 이상이어야 해요');    return; }
    if (u.length > 12){ setError('아이디는 12자 이내로 입력해주세요'); return; }
    if (!r)           { setError('본명을 입력해주세요');              return; }
    if (!sid)         { setError('학번을 입력해주세요');              return; }
    if (!p)           { setError('전화번호를 입력해주세요');           return; }
    try {
      const { checkUsernameExists } = await import('../lib/supabase');
      if (await checkUsernameExists(u)) { setError('이미 사용 중인 아이디예요 🙁'); return; }
    } catch {}
    setError(''); setStep(1);
  }

  /* ── STEP 1 ── */
  function handleConsentNext() {
    if (!consent1 || !consent2) { setError('필수 항목에 모두 동의해야 가입할 수 있어요'); return; }
    setError(''); setStep(2);
  }

  /* ── STEP 2: PIN ── */
  function handlePin1Change(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    setPin(digits); pinRef.current = digits; setError('');
    if (digits.length === 4) {
      setTimeout(() => { setPinPhase('confirm'); setPinConfirm(''); setTimeout(() => pin2Ref.current?.focus(), 80); }, 80);
    }
  }

  function handlePin2Change(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    setPinConfirm(digits); setError('');
    if (digits.length === 4) {
      if (digits !== pinRef.current) {
        setError('PIN이 일치하지 않아요. 처음부터 다시 입력해주세요.');
        setPin(''); setPinConfirm(''); pinRef.current = ''; setPinPhase('enter');
        setTimeout(() => pin1Ref.current?.focus(), 80);
      } else {
        setError(''); setStep(3);
      }
    }
  }

  /* ── STEP 3 ── */
  async function handleComplete() {
    const now = new Date().toISOString();
    let friendCode: string;
    try {
      const { generateUniqueFriendCode } = await import('../lib/supabase');
      friendCode = await generateUniqueFriendCode();
    } catch {
      friendCode = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    }
    const profile: UserProfile = {
      username: username.trim(), pin, emoji,
      realName: realName.trim(), studentId: studentId.trim(),
      phone: phone.trim(), consentDate: now, createdAt: now, friendCode,
    };
    try {
      const { registerUserProfile } = await import('../lib/supabase');
      await registerUserProfile(profile);
      await Session.setItem('@active_user', profile.username);
    } catch (e: any) { setError('가입 중 오류가 발생했어요: ' + (e.message ?? '')); return; }
    onComplete(profile);
  }

  function goBack() {
    setError('');
    if (step === 0) { onBack(); return; }
    if (step === 1) { setStep(0); return; }
    if (step === 2) { setPin(''); setPinConfirm(''); pinRef.current = ''; setPinPhase('enter'); setStep(1); return; }
    if (step === 3) { setStep(2); }
  }

  const currentDots = pinPhase === 'enter' ? pin : pinConfirm;

  return (
    <View style={s.outer}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 로고 */}
            <View style={s.logoWrap}>
              <SweatOutLogo width={130} height={77} />
            </View>

            {/* 뒤로 + 단계 */}
            <View style={s.topRow}>
              <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={20} color={COLORS.textMuted} />
                <Text style={s.backBtnText}>뒤로</Text>
              </TouchableOpacity>
              <View style={s.stepBar}>
                {([0,1,2,3] as Step[]).map(i => (
                  <View key={i} style={[s.stepDot, i <= step && s.stepDotActive]} />
                ))}
              </View>
              <View style={{ width: 60 }} />
            </View>

            {/* ── STEP 0: 기본정보 ── */}
            {step === 0 && (
              <View style={s.stepWrap}>
                <Text style={s.title}>기본 정보를{'\n'}입력해주세요</Text>
                <Text style={s.subtitle}>가입 및 연구 참여 확인에 사용돼요.</Text>
                <View style={s.card}>
                  <Field label="아이디" placeholder="앱에서 사용할 이름 (2~12자)" value={username} onChange={t => { setUsername(t.slice(0,12)); setError(''); }} autoFocus />
                  <View style={s.fieldGap} />
                  <Field label="본명" placeholder="실제 이름을 입력해주세요" value={realName} onChange={t => { setRealName(t); setError(''); }} />
                  <View style={s.fieldGap} />
                  <Field label="학번" placeholder="예) 202312345" value={studentId} onChange={t => { setStudentId(t); setError(''); }} keyboardType="numeric" />
                  <View style={s.fieldGap} />
                  <Field label="전화번호" placeholder="예) 010-1234-5678" value={phone} onChange={t => { setPhone(t); setError(''); }} keyboardType="phone-pad" />
                  {error ? <Text style={s.errorText}>{error}</Text> : null}
                  <Text style={s.hint}>입력 정보는 연구 목적으로만 사용돼요.</Text>
                </View>
                <TouchableOpacity style={s.primaryBtn} onPress={handleInfoNext} activeOpacity={0.85}>
                  <Text style={s.primaryBtnText}>다음</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 1: 동의 ── */}
            {step === 1 && (
              <View style={s.stepWrap}>
                <Text style={s.title}>개인정보 수집·이용{'\n'}안내 및 동의</Text>
                <Text style={s.subtitle}>아래 내용을 읽고 동의해주세요.</Text>
                <ConsentCard
                  checked={consent1} onToggle={() => { setConsent1(v => !v); setError(''); }} required
                  title="개인정보 수집·이용 동의 (필수)"
                  rows={[
                    { label: '수집 항목', value: '아이디, 본명, 학번, 전화번호' },
                    { label: '이용 목적', value: '연구 참여자 확인 및 연락' },
                    { label: '보관 기간', value: '프로젝트 종료 후 1년 이내 파기' },
                  ]}
                />
                <ConsentCard
                  checked={consent2} onToggle={() => { setConsent2(v => !v); setError(''); }} required
                  title="활동 기록 수집·이용 동의 (필수)"
                  rows={[
                    { label: '수집 항목', value: '감정 기록, 미션 수행 내역, 운동 기록' },
                    { label: '이용 목적', value: '건강증진 서비스 제공 및 연구 분석' },
                    { label: '보관 기간', value: '프로젝트 종료 후 1년 이내 파기' },
                  ]}
                />
                <ConsentCard
                  checked={consent3} onToggle={() => setConsent3(v => !v)} required={false}
                  title="연구 결과 활용 동의 (선택)"
                  rows={[
                    { label: '활용 범위', value: '익명화된 데이터를 학술 논문·보고서에 활용' },
                    { label: '안내', value: '동의하지 않아도 서비스 이용에 지장 없어요' },
                  ]}
                />
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={15} color={COLORS.navy} style={{ marginTop: 2 }} />
                  <Text style={s.infoText}>
                    동의는 언제든지 철회할 수 있어요.{'\n'}
                    내 기록을 보거나 삭제하려면 담당 연구원에게 연락하세요.
                  </Text>
                </View>
                {error ? <Text style={s.errorText}>{error}</Text> : null}
                <TouchableOpacity style={s.primaryBtn} onPress={handleConsentNext} activeOpacity={0.85}>
                  <Text style={s.primaryBtnText}>동의하고 계속하기</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 2: PIN ── */}
            {step === 2 && (
              <View style={s.stepWrap}>
                <Text style={s.title}>
                  {pinPhase === 'enter' ? 'PIN 번호를\n설정해주세요' : 'PIN을 한 번 더\n입력해주세요'}
                </Text>
                <Text style={s.subtitle}>
                  {pinPhase === 'enter' ? '로그인할 때 쓸 4자리 숫자예요.' : '아까 입력한 번호와 동일하게 입력해주세요.'}
                </Text>

                {/* PIN 입력 영역 */}
                {pinPhase === 'enter' ? (
                  <TouchableOpacity style={s.pinArea} onPress={() => pin1Ref.current?.focus()} activeOpacity={1}>
                    <View style={s.pinDots}>
                      {[0,1,2,3].map(i => (
                        <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
                      ))}
                    </View>
                    <TextInput
                      ref={pin1Ref}
                      style={s.hiddenPinInput}
                      value={pin}
                      onChangeText={handlePin1Change}
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                      autoFocus
                    />
                    <Text style={s.pinHint}>탭하여 입력</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.pinArea} onPress={() => pin2Ref.current?.focus()} activeOpacity={1}>
                    <View style={s.pinDots}>
                      {[0,1,2,3].map(i => (
                        <View key={i} style={[s.dot, i < pinConfirm.length && s.dotFilled]} />
                      ))}
                    </View>
                    <TextInput
                      ref={pin2Ref}
                      style={s.hiddenPinInput}
                      value={pinConfirm}
                      onChangeText={handlePin2Change}
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                      autoFocus
                    />
                    <Text style={s.pinHint}>탭하여 입력</Text>
                  </TouchableOpacity>
                )}

                {error ? <Text style={[s.errorText, { textAlign: 'center', marginTop: 12 }]}>{error}</Text> : null}
              </View>
            )}

            {/* ── STEP 3: 이모지 ── */}
            {step === 3 && (
              <View style={s.stepWrap}>
                <Text style={s.title}>프로필 이모지를{'\n'}선택해주세요!</Text>
                <Text style={s.subtitle}>나를 표현할 이모지를 골라봐요.</Text>
                <View style={s.previewCard}>
                  <View style={s.previewAvatar}>
                    <Text style={s.previewAvatarEmoji}>{emoji}</Text>
                  </View>
                  <View>
                    <Text style={s.previewName}>{username}</Text>
                    <Text style={s.previewSub}>새로운 여정 시작 🌱</Text>
                  </View>
                </View>
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
                  <Text style={s.primaryBtnText}>가입 완료!</Text>
                  <Ionicons name="checkmark" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}

            {/* 제주대 */}
            <View style={s.jejuRow}>
              <JejuLogo width={16} height={20} />
              <Text style={s.jejuText}>제주대학교 학생 건강증진 프로젝트</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label, placeholder, value, onChange, autoFocus = false, keyboardType = 'default',
}: {
  label: string; placeholder: string; value: string;
  onChange: (t: string) => void; autoFocus?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
}) {
  return (
    <View>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.textInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.border}
        value={value}
        onChangeText={onChange}
        autoFocus={autoFocus}
        autoCapitalize="none"
        keyboardType={keyboardType}
        returnKeyType="next"
      />
    </View>
  );
}

function ConsentCard({
  checked, onToggle, required, title, rows,
}: {
  checked: boolean; onToggle: () => void; required: boolean;
  title: string; rows: { label: string; value: string }[];
}) {
  return (
    <View style={s.consentCard}>
      <View style={s.consentRows}>
        {rows.map(r => (
          <View key={r.label} style={s.consentRow}>
            <Text style={s.consentLabel}>{r.label}</Text>
            <Text style={s.consentValue}>{r.value}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={s.consentCheck} onPress={onToggle} activeOpacity={0.7}>
        <View style={[s.checkbox, checked && s.checkboxOn]}>
          {checked && <Ionicons name="checkmark" size={12} color="#FFF" />}
        </View>
        <Text style={s.consentCheckLabel}>{title}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: isWeb ? '#F2F2F7' : COLORS.bg,
    alignItems:      isWeb ? 'center' : 'stretch',
  },
  safe: { flex: 1, backgroundColor: COLORS.bg, width: isWeb ? 390 : '100%' },
  scroll: { paddingBottom: 32, flexGrow: 1 },

  logoWrap: { alignItems: 'center', paddingTop: 20, paddingBottom: 2 },

  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 6,
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, width: 60 },
  backBtnText: { fontSize: 13, color: COLORS.textMuted },
  stepBar:     { flexDirection: 'row', gap: 8 },
  stepDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  stepDotActive: { backgroundColor: COLORS.navy },

  stepWrap: { paddingHorizontal: 24, flex: 1 },
  title:    { fontSize: 22, color: COLORS.text, lineHeight: 30, marginBottom: 6 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 14, lineHeight: 20 },

  card: {
    backgroundColor: COLORS.bg, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW, marginBottom: 16,
  },
  fieldGap:   { height: 12 },
  fieldLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.8, marginBottom: 6 },
  textInput: {
    fontSize: 16, color: COLORS.text, paddingVertical: 7,
    borderBottomWidth: 1.5, borderBottomColor: COLORS.navy,
    fontFamily: 'GmarketSans-Light',
  },
  errorText: { fontSize: 12, color: '#C0392B', marginTop: 10 },
  hint:      { fontSize: 11, color: COLORS.border, marginTop: 10 },

  consentCard: {
    backgroundColor: COLORS.bg, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, ...SHADOW,
  },
  consentRows: { gap: 5, marginBottom: 12 },
  consentRow:  { flexDirection: 'row', gap: 8 },
  consentLabel: { fontSize: 11, color: COLORS.textMuted, width: 56 },
  consentValue: { fontSize: 12, color: COLORS.text, flex: 1, lineHeight: 17 },
  consentCheck: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  consentCheckLabel: { fontSize: 13, color: COLORS.text, flex: 1 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg, flexShrink: 0,
  },
  checkboxOn: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },

  infoBox: {
    flexDirection: 'row', gap: 8,
    backgroundColor: COLORS.navyLight, borderRadius: 12, padding: 10,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  infoText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, flex: 1 },

  /* PIN */
  pinArea: { alignItems: 'center', paddingVertical: 24 },
  pinDots: { flexDirection: 'row', gap: 24, justifyContent: 'center', marginBottom: 4 },
  dot: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: COLORS.border, backgroundColor: 'transparent',
  },
  dotFilled:      { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  hiddenPinInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  pinHint:        { fontSize: 12, color: COLORS.border, marginTop: 10 },

  /* 이모지 */
  previewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.navyLight, borderRadius: 18, padding: 14, marginBottom: 16,
    borderWidth: 1.5, borderColor: COLORS.navy,
  },
  previewAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.border,
  },
  previewAvatarEmoji: { fontSize: 28 },
  previewName: { fontSize: 17, color: COLORS.text, marginBottom: 2 },
  previewSub:  { fontSize: 12, color: COLORS.textMuted },
  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 20, justifyContent: 'center',
  },
  emojiCell: {
    width: 48, height: 48, borderRadius: 13, backgroundColor: COLORS.bg,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
  },
  emojiCellSel: { borderColor: COLORS.navy, backgroundColor: COLORS.navyLight, borderWidth: 2 },
  emojiText: { fontSize: 24 },

  primaryBtn: {
    flexDirection: 'row', backgroundColor: COLORS.navy, borderRadius: 16,
    paddingVertical: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    shadowColor: COLORS.navyDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { fontSize: 16, color: '#FFF' },

  jejuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
    marginHorizontal: 24, marginTop: 8,
  },
  jejuText: { fontSize: 11, color: COLORS.border },
});
