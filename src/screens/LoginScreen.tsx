import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW } from '../constants';
import SweatOutLogo from '../components/SweatOutLogo';
import JejuLogo from '../components/JejuLogo';
import { Session } from '../lib/session';
import { UserProfile } from '../types/auth';

const isWeb = Platform.OS === 'web';

interface Props {
  onLogin:    (profile: UserProfile) => void;
  onRegister: () => void;
}

export default function LoginScreen({ onLogin, onRegister }: Props) {
  const [username,     setUsername]     = useState('');
  const [pin,          setPin]          = useState('');
  const [error,        setError]        = useState('');
  const [busy,         setBusy]         = useState(false);
  const [rememberUser, setRememberUser] = useState(false);
  const submitted    = useRef(false);
  const pinInputRef  = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      const remember = await AsyncStorage.getItem('@remember_username');
      if (remember === 'true') {
        setRememberUser(true);
        const saved = await AsyncStorage.getItem('@last_username');
        if (saved) setUsername(saved);
      }
    })();
  }, []);

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
      const { loginUserProfile } = await import('../lib/supabase');
      const user = await loginUserProfile(username.trim(), currentPin);
      if (!user) {
        setError('아이디 또는 PIN이 올바르지 않아요 🔐');
        setPin('');
        submitted.current = false;
        setBusy(false);
        return;
      }
      if (rememberUser) {
        await AsyncStorage.setItem('@remember_username', 'true');
        await AsyncStorage.setItem('@last_username', user.username);
      } else {
        await AsyncStorage.setItem('@remember_username', 'false');
        await AsyncStorage.removeItem('@last_username');
      }
      await Session.setItem('@active_user', user.username);
      onLogin(user);
    } catch {
      setError('오류가 발생했어요. 다시 시도해주세요.');
      setPin('');
      submitted.current = false;
      setBusy(false);
    }
  }

  function handlePinChange(text: string) {
    if (busy) return;
    const digits = text.replace(/\D/g, '').slice(0, 4);
    setPin(digits);
    setError('');
    submitted.current = false;
    if (digits.length === 4) {
      submitted.current = true;
      doLogin(digits);
    }
  }

  return (
    <View style={s.outer}>
      <SafeAreaView style={s.safe}>
        {/* 로고 */}
        <View style={s.logoWrap}>
          <SweatOutLogo width={160} height={94} />
          <Text style={s.logoSub}>S.WEATHER LAND</Text>
        </View>

        {/* 입력 카드 */}
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
              onChangeText={t => { setUsername(t); setPin(''); setError(''); submitted.current = false; }}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => pinInputRef.current?.focus()}
            />
            {username.length > 0 && (
              <TouchableOpacity onPress={() => { setUsername(''); setPin(''); setError(''); }} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color={COLORS.border} />
              </TouchableOpacity>
            )}
          </View>

          {/* 아이디 기억하기 */}
          <TouchableOpacity style={s.checkRow} onPress={() => setRememberUser(v => !v)} activeOpacity={0.7}>
            <View style={[s.checkbox, rememberUser && s.checkboxOn]}>
              {rememberUser && <Ionicons name="checkmark" size={12} color="#FFF" />}
            </View>
            <Text style={s.checkLabel}>아이디 기억하기</Text>
          </TouchableOpacity>

          <View style={s.divider} />

          {/* PIN */}
          <Text style={s.fieldLabel}>PIN 번호</Text>
          <TouchableOpacity
            style={s.pinArea}
            onPress={() => pinInputRef.current?.focus()}
            activeOpacity={1}
          >
            <View style={s.pinDots}>
              {[0,1,2,3].map(i => (
                <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
              ))}
            </View>
            <TextInput
              ref={pinInputRef}
              style={s.hiddenPinInput}
              value={pin}
              onChangeText={handlePinChange}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
          </TouchableOpacity>
          <Text style={s.pinHint}>PIN 칸을 탭하여 입력</Text>
        </View>

        {/* 에러 */}
        <View style={s.errorWrap}>
          {error ? <Text style={s.errorText}>{error}</Text> : null}
        </View>

        {/* 가입 링크 */}
        <TouchableOpacity style={s.regLink} onPress={onRegister} activeOpacity={0.7}>
          <Text style={s.regLinkText}>
            처음이신가요?{' '}
            <Text style={s.regLinkBold}>가입하기 →</Text>
          </Text>
        </TouchableOpacity>

        {/* 제주대 로고 */}
        <View style={s.jejuRow}>
          <JejuLogo width={16} height={20} />
          <Text style={s.jejuText}>제주대학교 학생 건강증진 프로젝트</Text>
        </View>
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
    width:           isWeb ? 390 : '100%',
    justifyContent:  'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

  logoWrap: {
    alignItems: 'center',
    paddingBottom: 20,
    gap: 4,
  },
  logoSub: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2.5 },

  card: {
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bg, ...SHADOW, marginBottom: 6,
  },
  fieldLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.8, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1.5, borderBottomColor: COLORS.navy, paddingBottom: 8,
  },
  textInput: {
    flex: 1, fontSize: 17, color: COLORS.text,
    paddingVertical: 2, fontFamily: 'GmarketSans-Light',
  },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  checkboxOn: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  checkLabel: { fontSize: 12, color: COLORS.textMuted },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },

  pinArea: { alignItems: 'center', paddingVertical: 8 },
  pinDots: { flexDirection: 'row', gap: 20, justifyContent: 'center' },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: COLORS.border, backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  hiddenPinInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  pinHint: { fontSize: 11, color: COLORS.border, marginTop: 6, textAlign: 'center' },

  errorWrap: { height: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  errorText: { fontSize: 13, color: '#C0392B', textAlign: 'center' },

  regLink:     { alignItems: 'center', paddingVertical: 10 },
  regLinkText: { fontSize: 14, color: COLORS.textMuted },
  regLinkBold: { color: COLORS.navy, fontWeight: '700' },

  jejuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
    marginTop: 4,
  },
  jejuText: { fontSize: 11, color: COLORS.border },
});
