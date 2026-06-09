import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../store/GameContext';

export default function RunningScreen() {
  const navigation = useNavigation();
  const { energy, sweatPoints, exchangeSweatToEnergy } = useGame();
  const [message,     setMessage]     = useState('');
  const [messageType, setMessageType] = useState<'success' | 'warn' | ''>('');

  const canExchange = sweatPoints >= 100;

  const handleExchange = () => {
    if (!canExchange) {
      setMessage('100 마일리지가 필요해요. 조금 더 움직여볼까요?');
      setMessageType('warn');
      return;
    }
    exchangeSweatToEnergy();
    setMessage('환전 완료! 🔥 100 마일리지 → 마음에너지 +10 이 적립됐어!');
    setMessageType('success');
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* ── 헤더 ─────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>러닝 환전소</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* ── 보유 마일리지 ─────────────────── */}
        <View style={s.section}>
          <Text style={s.label}>보유 마일리지 (땀방울)</Text>
          <Text style={s.bigNum}>{sweatPoints.toLocaleString()}</Text>
        </View>

        {/* ── 환전 비율 ─────────────────────── */}
        <View style={s.rateCard}>
          <View style={s.rateBox}>
            <Text style={s.rateEmoji}>👟</Text>
            <Text style={s.rateNum}>100</Text>
            <Text style={s.rateUnit}>마일리지</Text>
          </View>
          <Text style={s.rateArrow}>→</Text>
          <View style={s.rateBox}>
            <Text style={s.rateEmoji}>❤️</Text>
            <Text style={[s.rateNum, { color: '#FF6B6B' }]}>10</Text>
            <Text style={[s.rateUnit, { color: '#FF6B6B' }]}>에너지</Text>
          </View>
        </View>

        {/* ── 현재 에너지 ───────────────────── */}
        <View style={s.section}>
          <Text style={s.label}>현재 마음에너지</Text>
          <Text style={s.energyText}>❤️ {energy} / 100</Text>
        </View>

        {/* ── 결과 메시지 ───────────────────── */}
        {message ? (
          <Text style={[s.resultMsg, messageType === 'warn' && s.resultMsgWarn]}>
            {message}
          </Text>
        ) : null}

        {/* ── 환전 버튼 ─────────────────────── */}
        <View style={s.btnWrap}>
          <TouchableOpacity
            style={[s.btn, !canExchange && s.btnDisabled]}
            onPress={handleExchange}
          >
            <Text style={s.btnText}>환전하기</Text>
          </TouchableOpacity>
          {!canExchange && (
            <Text style={s.hint}>100 마일리지 이상 모아야 환전할 수 있어요</Text>
          )}
        </View>

      </ScrollView>
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
  scroll:   { paddingBottom: 40 },

  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  label:   { fontSize: 12, color: '#888888', fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  bigNum:  { fontSize: 40, fontWeight: '800', color: '#3D3224' },
  energyText: { fontSize: 18, fontWeight: '600', color: '#3D3224' },

  // Exchange rate card
  rateCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, margin: 20, backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#EEEEEE',
  },
  rateBox:  { alignItems: 'center', gap: 4 },
  rateEmoji:{ fontSize: 28 },
  rateNum:  { fontSize: 24, fontWeight: '800', color: '#5C9E4A' },
  rateUnit: { fontSize: 12, fontWeight: '600', color: '#5C9E4A' },
  rateArrow:{ fontSize: 24, color: '#AAAAAA', fontWeight: '700' },

  resultMsg:     { fontSize: 14, color: '#5C9E4A', textAlign: 'center', padding: 16, fontWeight: '600' },
  resultMsgWarn: { color: '#FF6B6B' },

  btnWrap:    { padding: 20 },
  btn:        { backgroundColor: '#5C9E4A', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled:{ backgroundColor: '#CCCCCC' },
  btnText:    { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  hint:       { fontSize: 13, color: '#888888', textAlign: 'center', marginTop: 10 },
});
