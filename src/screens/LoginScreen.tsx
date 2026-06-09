import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW } from '../constants';
import SweatOutLogo from '../components/SweatOutLogo';
import JejuLogo from '../components/JejuLogo';
import { UserProfile } from '../types/auth';

const isWeb = Platform.OS === 'web';
const NUM  = 72;

interface Props {
  onLogin:    (profile: UserProfile) => void;
  onRegister: () => void;
}

export default function LoginScreen({ onLogin, onRegister }: Props) {
  const [username, setUsername]   = useState('');
  const [pin, setPin]             = useState('');
  const [error, setError]         = useState('');
  const [busy, setBusy]           = useState(false);
  const submitted                 = useRef(false);

  /* 마지막으로 쓴 아이디 자동완성 */
  useEffect(() => {
    AsyncStorage.getItem('@last_username').then(v => { if (v) setUsername(v); });
  }, []);

  /* PIN 4자리 채워지면 자동 제출 */
  useEffect(() => {
    if (pin.length === 4 && !submitted.current) {
      submitted.current = true;
      doLogin(pin);
    }
  }, [pin]);

  async function doLogin(currentPin: string) {
    if (!username.trim()) {
      setError('아이디를 먼저 입력해주세요');
      setPin('');
      submitted.current = false;
      return;
    }
    setBusy(true);
    setError('');
    try {
      const raw  = await AsyncStorage.getItem('@user_profiles');
      const list: UserProfile[] = raw ? JSON.parse(raw) : [];
      const user = list.find(p => p.username === username.trim());

      if (!user) {
        setError('아이디를 찾을 수 없어요. 가입해주세요!');
        resetPin();
        return;
      }
      if (user.pin !== currentPin) {
        setError('PIN이 틀렸어요 🔐  다시 입력해주세요');
        resetPin();
        return;
      }

      await AsyncStorage.setItem('@last_username', user.username);
      await AsyncStorage.setItem('@active_user',   user.username);
      onLogin(user);
    } catch {
      setError('오류가 발생했어요. 다시 시도해주세요.');
      resetPin();
    }
  }

  function resetPin() {
    setPin('');
    setBusy(false);
    submitted.current = false;
  }

  function handleKey(key: string) {
    if (busy) return;
    setError('');
    submitted.current = false;
    if (key === '←') {
      setPin(p => p.slice(0, -1));
    } else if (key === '✓') {
      if (pin.length === 4) { submitted.current = true; doLogin(pin); }
    } else if (pin.length < 4) {
      setPin(p => p + key);
    }
  }

  const ROWS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['←','0','✓'],
  ];

  return (
    <View style={s.outer}>
      <SafeAreaView style={s.safe}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── 로고 ──────────────────────────────── */}
          <View style={s.logoWrap}>
            <SweatOutLogo width={190} height={112} />
            <Text style={s.logoSub}>S.WEATHER LAND</Text>
          </View>

          {/* ── 입력 카드 ─────────────────────────── */}
          <View style={s.card}>
            {/* 아이디 */}
            <Text style={s.fieldLabel}>아이디</Text>
            <View style={s.inputRow}>
              <Ionicons name="person-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={s.textInput}
                placeholder="아이디 입력"
                placeholderTextColor={COLORS.border}
                value={username}
                onChangeText={t => { setUsername(t); resetPin(); setError(''); }}
                autoCapitalize="none"
                returnKeyType="done"
              />
              {username.length > 0 && (
                <TouchableOpacity onPress={() => { setUsername(''); resetPin(); setError(''); }} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={16} color={COLORS.border} />
                </TouchableOpacity>
              )}
            </View>

            <View style={s.divider} />

            {/* PIN 표시 */}
            <Text style={s.fieldLabel}>PIN 번호</Text>
            <View style={s.pinDots}>
              {[0,1,2,3].map(i => (
                <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
              ))}
            </View>
          </View>

          {/* ── 에러 메시지 ───────────────────────── */}
          <View style={s.errorWrap}>
            {error ? <Text style={s.errorText}>{error}</Text> : null}
          </View>

          {/* ── 숫자 키패드 ───────────────────────── */}
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
                    onPress={() => handleKey(key)}
                    activeOpacity={0.7}
                    disabled={busy}
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

          {/* ── 가입하기 링크 ─────────────────────── */}
          <TouchableOpacity style={s.regLink} onPress={onRegister} activeOpacity={0.7}>
            <Text style={s.regLinkText}>
              처음이신가요?{' '}
              <Text style={s.regLinkBold}>가입하기 →</Text>
            </Text>
          </TouchableOpacity>

          {/* ── 제주대 로고 ───────────────────────── */}
          <View style={s.jejuRow}>
            <JejuLogo width={18} height={22} />
            <Text style={s.jejuText}>제주대학교 학생 건강증진 프로젝트</Text>
          </View>
        </ScrollView>
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
  scroll: { paddingBottom: 36, flexGrow: 1 },

  /* 로고 */
  logoWrap: {
    alignItems:    'center',
    paddingTop:    44,
    paddingBottom: 28,
    gap:           6,
  },
  logoSub: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2.5 },

  /* 카드 */
  card: {
    marginHorizontal: 24,
    borderRadius:     20,
    padding:          22,
    borderWidth:      1,
    borderColor:      COLORS.border,
    backgroundColor:  COLORS.bg,
    ...SHADOW,
    marginBottom:     8,
  },
  fieldLabel: {
    fontSize:      11,
    color:         COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom:  10,
  },
  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.navy,
    paddingBottom:   8,
  },
  textInput: {
    flex:       1,
    fontSize:   18,
    color:      COLORS.text,
    paddingVertical: 2,
    fontFamily: 'GmarketSans-Light',
  },
  divider: {
    height:          1,
    backgroundColor: COLORS.border,
    marginVertical:  18,
  },
  pinDots: {
    flexDirection:  'row',
    gap:            20,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dot: {
    width:           16,
    height:          16,
    borderRadius:    8,
    borderWidth:     2,
    borderColor:     COLORS.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.navy,
    borderColor:     COLORS.navy,
  },

  /* 에러 */
  errorWrap: { height: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  errorText: {
    fontSize:   13,
    color:      '#C0392B',
    textAlign:  'center',
    paddingHorizontal: 24,
  },

  /* 키패드 */
  numpad: {
    alignSelf: 'center',
    gap:       10,
    marginBottom: 14,
  },
  numRow: {
    flexDirection: 'row',
    gap:           10,
  },
  numKey: {
    width:          NUM,
    height:         NUM,
    borderRadius:   NUM / 2,
    backgroundColor: COLORS.navyLight,
    justifyContent: 'center',
    alignItems:     'center',
    borderWidth:    1,
    borderColor:    COLORS.border,
  },
  numKeyOk:  { backgroundColor: COLORS.navy,   borderColor: COLORS.navy   },
  numKeyDel: { backgroundColor: COLORS.bg,      borderColor: COLORS.border },
  numKeyText: { fontSize: 22, color: COLORS.text },

  /* 가입 링크 */
  regLink:     { alignItems: 'center', paddingVertical: 12 },
  regLinkText: { fontSize: 14, color: COLORS.textMuted },
  regLinkBold: { color: COLORS.navy, fontWeight: '700' },

  /* 제주대 */
  jejuRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    paddingTop:     14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginHorizontal: 24,
    marginTop:      6,
  },
  jejuText: { fontSize: 11, color: COLORS.border },
});
