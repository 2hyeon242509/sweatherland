import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../store/GameContext';
import { COLORS, SHADOW } from '../constants';

const MOCK_HISTORY = [
  { date: '2024.05.21  12:10', from: 500, to: 50 },
  { date: '2024.05.18  09:34', from: 200, to: 20 },
];

const BONUS_RATE = 20;
const isWeb = Platform.OS === 'web';

/* 걸음수 → 마일리지 변환 (10,000걸음 = 100마일) */
function stepsToMileage(steps: number): number {
  return Math.min(300, Math.floor(steps / 100));
}
/* 거리(km) → 마일리지 (5km = 100마일) */
function distanceToMileage(km: number): number {
  return Math.min(300, Math.floor(km * 20));
}

interface FitnessResult {
  steps:           number | null;
  exerciseMinutes: number | null;
  distance:        number | null;
  calories:        number | null;
}

export default function RunningScreen() {
  const navigation = useNavigation();
  const { energy, sweatPoints, exchangeSweatToEnergy, addSweat } = useGame();

  const [historyList] = useState(MOCK_HISTORY);
  const [message,     setMessage]     = useState('');
  const [messageType, setMessageType] = useState<'success' | 'warn' | ''>('');

  /* ── OCR 상태 ─────────────────────────────── */
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult,  setOcrResult]  = useState<FitnessResult | null>(null);
  const [ocrError,   setOcrError]   = useState('');
  const [ocrAdded,   setOcrAdded]   = useState(false);

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

  /* ── 이미지 선택 & AI 분석 (웹 전용) ────────── */
  const handleImageUpload = () => {
    if (Platform.OS !== 'web') return;

    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/*';

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setOcrLoading(true);
      setOcrResult(null);
      setOcrError('');
      setOcrAdded(false);

      try {
        /* 이미지 → base64 */
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = (ev: any) => resolve(ev.target.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        /* Vercel 서버리스 API 호출 */
        const res = await fetch('/api/extract-fitness', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ imageBase64: base64 }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? '서버 오류');
        }

        const data: FitnessResult = await res.json();

        if (data.steps == null && data.distance == null) {
          setOcrError('걸음수나 거리 정보를 찾지 못했어요. 다른 이미지를 올려보세요.');
        } else {
          setOcrResult(data);
        }
      } catch (err: any) {
        setOcrError(err.message ?? '분석 중 오류가 발생했어요.');
      } finally {
        setOcrLoading(false);
      }
    };

    input.click();
  };

  /* ── 마일리지 적립 ────────────────────────── */
  const handleAddMileage = () => {
    if (!ocrResult || ocrAdded) return;

    let mileage = 0;
    if (ocrResult.steps != null)    mileage = stepsToMileage(ocrResult.steps);
    else if (ocrResult.distance != null) mileage = distanceToMileage(ocrResult.distance);

    if (mileage <= 0) { setOcrError('마일리지로 환산할 수 없어요.'); return; }

    addSweat(mileage);
    setOcrAdded(true);
    setMessage(`🎉 ${mileage} 마일리지가 추가됐어요!`);
    setMessageType('success');
  };

  /* ── 마일리지 계산 ────────────────────────── */
  const getMileageFromResult = (): number => {
    if (!ocrResult) return 0;
    if (ocrResult.steps    != null) return stepsToMileage(ocrResult.steps);
    if (ocrResult.distance != null) return distanceToMileage(ocrResult.distance);
    return 0;
  };

  return (
    <View style={styles.outerWrap}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Header ──────────────────────────── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>러닝 환전소</Text>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="help-circle-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* ── 📸 AI 스크린샷 인증 카드 ──────────── */}
          {isWeb && (
            <View style={styles.ocrCard}>
              <View style={styles.ocrHeader}>
                <Text style={styles.ocrBadge}>AI 자동 인증</Text>
                <Text style={styles.ocrTitle}>📸 스크린샷으로 마일리지 추가</Text>
                <Text style={styles.ocrDesc}>
                  피트니스 앱 스크린샷을 올리면{'\n'}AI가 걸음수를 읽어 마일리지로 환산해요.
                </Text>
              </View>

              {/* 변환 안내 */}
              <View style={styles.ocrRateRow}>
                <View style={styles.ocrRateItem}>
                  <Text style={styles.ocrRateNum}>1,000</Text>
                  <Text style={styles.ocrRateLabel}>걸음</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} />
                <View style={styles.ocrRateItem}>
                  <Text style={[styles.ocrRateNum, { color: COLORS.navy }]}>10</Text>
                  <Text style={styles.ocrRateLabel}>마일리지</Text>
                </View>
                <View style={styles.ocrRateDivider} />
                <View style={styles.ocrRateItem}>
                  <Text style={styles.ocrRateNum}>1 km</Text>
                  <Text style={styles.ocrRateLabel}>거리</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} />
                <View style={styles.ocrRateItem}>
                  <Text style={[styles.ocrRateNum, { color: COLORS.navy }]}>20</Text>
                  <Text style={styles.ocrRateLabel}>마일리지</Text>
                </View>
              </View>

              {/* 업로드 버튼 */}
              {!ocrLoading && !ocrResult && (
                <TouchableOpacity style={styles.uploadBtn} onPress={handleImageUpload} activeOpacity={0.85}>
                  <Ionicons name="image-outline" size={18} color={COLORS.navy} style={{ marginRight: 8 }} />
                  <Text style={styles.uploadBtnText}>이미지 선택하기</Text>
                </TouchableOpacity>
              )}

              {/* 로딩 */}
              {ocrLoading && (
                <View style={styles.ocrLoadingWrap}>
                  <ActivityIndicator color={COLORS.navy} size="small" />
                  <Text style={styles.ocrLoadingText}>AI가 걸음수를 분석하고 있어요...</Text>
                </View>
              )}

              {/* 에러 */}
              {ocrError ? (
                <View style={styles.ocrErrorBox}>
                  <Text style={styles.ocrErrorText}>{ocrError}</Text>
                  <TouchableOpacity onPress={handleImageUpload} style={styles.retryBtn} activeOpacity={0.7}>
                    <Text style={styles.retryBtnText}>다시 올리기</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* 분석 결과 */}
              {ocrResult && !ocrAdded && (
                <View style={styles.ocrResultBox}>
                  <Text style={styles.ocrResultTitle}>✅ 인식 결과</Text>
                  {ocrResult.steps != null && (
                    <Text style={styles.ocrResultItem}>
                      👟 걸음수: <Text style={styles.ocrResultVal}>{ocrResult.steps.toLocaleString()}걸음</Text>
                    </Text>
                  )}
                  {ocrResult.distance != null && (
                    <Text style={styles.ocrResultItem}>
                      📍 거리: <Text style={styles.ocrResultVal}>{ocrResult.distance.toFixed(1)}km</Text>
                    </Text>
                  )}
                  {ocrResult.exerciseMinutes != null && (
                    <Text style={styles.ocrResultItem}>
                      ⏱ 운동 시간: <Text style={styles.ocrResultVal}>{ocrResult.exerciseMinutes}분</Text>
                    </Text>
                  )}
                  {ocrResult.calories != null && (
                    <Text style={styles.ocrResultItem}>
                      🔥 칼로리: <Text style={styles.ocrResultVal}>{ocrResult.calories.toLocaleString()}kcal</Text>
                    </Text>
                  )}

                  <View style={styles.ocrMileageRow}>
                    <Text style={styles.ocrMileageLabel}>적립 예정 마일리지</Text>
                    <Text style={styles.ocrMileageVal}>+{getMileageFromResult()}</Text>
                  </View>

                  <View style={styles.ocrBtnRow}>
                    <TouchableOpacity style={styles.ocrAddBtn} onPress={handleAddMileage} activeOpacity={0.85}>
                      <Ionicons name="add-circle" size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.ocrAddBtnText}>마일리지 추가하기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.ocrCancelBtn}
                      onPress={() => { setOcrResult(null); setOcrError(''); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.ocrCancelBtnText}>취소</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* 적립 완료 */}
              {ocrAdded && (
                <View style={styles.ocrDoneBox}>
                  <Text style={styles.ocrDoneText}>🎉 마일리지가 추가됐어요!</Text>
                  <TouchableOpacity
                    onPress={() => { setOcrResult(null); setOcrAdded(false); setOcrError(''); }}
                    style={styles.retryBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.retryBtnText}>또 올리기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ── Hero Banner ──────────────────────── */}
          <View style={styles.heroBanner}>
            <Text style={styles.heroBannerLabel}>러닝 마일리지</Text>
            <Text style={styles.heroBannerTitle}>
              {'달릴수록 쌓이는 마일리지!\n에너지로 환전해보세요.'}
            </Text>
          </View>

          {/* ── Mileage Display ─────────────────── */}
          <View style={styles.mileageSection}>
            <Text style={styles.mileageSectionLabel}>보유 마일리지</Text>
            <View style={styles.mileageRow}>
              <Text style={styles.mileageShoe}>👟</Text>
              <Text style={styles.mileageNumber}>{sweatPoints.toLocaleString()}</Text>
              <Text style={styles.mileageUnit}>마일</Text>
            </View>
          </View>

          {/* ── Exchange Rate Card ──────────────── */}
          <View style={styles.exchangeRateCard}>
            <View style={[styles.rateBox, { backgroundColor: COLORS.navyLight }]}>
              <Text style={styles.rateBoxEmoji}>👟</Text>
              <Text style={styles.rateBoxNum}>100</Text>
              <Text style={styles.rateBoxUnit}>마일리지</Text>
            </View>
            <View style={styles.arrowWrap}>
              <Ionicons name="arrow-forward" size={24} color={COLORS.navy} />
            </View>
            <View style={[styles.rateBox, { backgroundColor: COLORS.navyLight }]}>
              <Ionicons name="heart" size={28} color={COLORS.navy} />
              <Text style={[styles.rateBoxNum, { color: COLORS.navy }]}>10</Text>
              <Text style={[styles.rateBoxUnit, { color: COLORS.navy }]}>에너지</Text>
            </View>
          </View>

          {/* ── Bonus Card ──────────────────────── */}
          <View style={styles.bonusCard}>
            <View style={styles.bonusLeft}>
              <View style={styles.bonusBadge}>
                <Text style={styles.bonusBadgeText}>{BONUS_RATE}%</Text>
              </View>
              <View style={styles.bonusTextWrap}>
                <Text style={styles.bonusTitle}>오늘의 환전 보너스</Text>
                <Text style={styles.bonusDesc}>
                  러닝 3km 달성!{'\n'}환전 보너스 +{BONUS_RATE}% 적용 중
                </Text>
              </View>
            </View>
            <View style={styles.bonusStars}>
              <Text style={{ fontSize: 16 }}>✨</Text>
              <Text style={{ fontSize: 12 }}>✨</Text>
            </View>
          </View>

          {/* ── Energy Info ─────────────────────── */}
          <View style={styles.energyInfo}>
            <Ionicons name="heart" size={14} color={COLORS.navy} />
            <Text style={styles.energyInfoText}>현재 마음에너지</Text>
            <Text style={styles.energyInfoVal}>{energy} / 100</Text>
          </View>

          {/* ── Result Message ──────────────────── */}
          {message ? (
            <Text style={[styles.resultMsg, messageType === 'warn' && styles.resultMsgWarn]}>
              {message}
            </Text>
          ) : null}

          {/* ── Exchange Button ─────────────────── */}
          <TouchableOpacity
            style={[styles.exchangeBtn, !canExchange && styles.exchangeBtnDisabled]}
            onPress={handleExchange}
            activeOpacity={0.85}
          >
            <Ionicons name="sync" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.exchangeBtnText}>환전하기</Text>
          </TouchableOpacity>

          {!canExchange && (
            <Text style={styles.notEnoughHint}>100 마일리지 이상 모아야 환전할 수 있어요</Text>
          )}

          {/* ── Recent History ──────────────────── */}
          <View style={styles.historySection}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>최근 환전 내역</Text>
              <TouchableOpacity>
                <Text style={styles.sectionLink}>전체 보기 ›</Text>
              </TouchableOpacity>
            </View>
            {historyList.map((item, i) => (
              <View key={i} style={styles.historyItem}>
                <View style={styles.historyIconWrap}>
                  <Text style={{ fontSize: 18 }}>👟</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>{item.date}</Text>
                  <Text style={styles.historyDesc}>{item.from} 마일 → {item.to} 에너지</Text>
                </View>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>+{item.to}</Text>
                </View>
              </View>
            ))}
          </View>

        </ScrollView>
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
  safe: { flex: 1, backgroundColor: COLORS.bg, width: isWeb ? 390 : '100%' },
  scroll: { paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  /* ── OCR 카드 ─────────────────────────────── */
  ocrCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 20, marginHorizontal: 16, marginBottom: 14,
    padding: 18, borderWidth: 1.5, borderColor: COLORS.navy,
    ...SHADOW,
  },
  ocrHeader: { marginBottom: 14 },
  ocrBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.navy, color: '#FFF',
    fontSize: 10, fontWeight: '700', letterSpacing: 0.8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8,
  },
  ocrTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  ocrDesc:  { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },

  /* 변환 안내 */
  ocrRateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.navyLight, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 8, marginBottom: 14,
  },
  ocrRateItem:    { alignItems: 'center', minWidth: 44 },
  ocrRateNum:     { fontSize: 13, fontWeight: '700', color: COLORS.text },
  ocrRateLabel:   { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  ocrRateDivider: { width: 1, height: 28, backgroundColor: COLORS.border, marginHorizontal: 4 },

  /* 업로드 버튼 */
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.navyLight, borderRadius: 14,
    paddingVertical: 13, borderWidth: 1.5, borderColor: COLORS.navy,
    borderStyle: 'dashed',
  },
  uploadBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.navy },

  /* 로딩 */
  ocrLoadingWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  ocrLoadingText: { fontSize: 13, color: COLORS.textMuted },

  /* 에러 */
  ocrErrorBox: {
    backgroundColor: '#FFF5F5', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FFCCCC', alignItems: 'center', gap: 10,
  },
  ocrErrorText: { fontSize: 13, color: '#C0392B', textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    backgroundColor: COLORS.navyLight, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  retryBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.navy },

  /* 분석 결과 */
  ocrResultBox: {
    backgroundColor: '#F0F8F0', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#A8D5A8',
  },
  ocrResultTitle: { fontSize: 13, fontWeight: '700', color: '#2E7D32', marginBottom: 8 },
  ocrResultItem:  { fontSize: 13, color: COLORS.text, marginBottom: 4 },
  ocrResultVal:   { fontWeight: '700', color: COLORS.navy },

  ocrMileageRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#C8E6C9',
  },
  ocrMileageLabel: { fontSize: 13, color: COLORS.textMuted },
  ocrMileageVal:   { fontSize: 22, fontWeight: '800', color: COLORS.navy },

  ocrBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  ocrAddBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: COLORS.navy,
    borderRadius: 12, paddingVertical: 12, justifyContent: 'center', alignItems: 'center',
  },
  ocrAddBtnText:  { fontSize: 14, fontWeight: '700', color: '#FFF' },
  ocrCancelBtn:   { backgroundColor: COLORS.navyLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  ocrCancelBtnText: { fontSize: 13, color: COLORS.textMuted },

  /* 완료 */
  ocrDoneBox: {
    backgroundColor: COLORS.navyLight, borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 10,
  },
  ocrDoneText: { fontSize: 14, fontWeight: '700', color: COLORS.navy },

  /* ── 기존 스타일 ──────────────────────────── */
  heroBanner: {
    backgroundColor: COLORS.navyLight, borderRadius: 20,
    marginHorizontal: 16, marginBottom: 16, padding: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  heroBannerLabel: { fontSize: 12, fontWeight: '700', color: COLORS.navy, letterSpacing: 0.5, marginBottom: 8 },
  heroBannerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 22 },

  mileageSection: {
    backgroundColor: COLORS.card, borderRadius: 20, marginHorizontal: 16,
    padding: 20, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  mileageSectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8, letterSpacing: 0.5 },
  mileageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  mileageShoe:   { fontSize: 28 },
  mileageNumber: { fontSize: 40, fontWeight: '800', color: COLORS.text, lineHeight: 46 },
  mileageUnit:   { fontSize: 16, fontWeight: '700', color: COLORS.textMuted, paddingBottom: 5 },

  exchangeRateCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 20, marginHorizontal: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  rateBox:     { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  rateBoxEmoji: { fontSize: 28 },
  rateBoxNum:  { fontSize: 22, fontWeight: '800', color: COLORS.navy },
  rateBoxUnit: { fontSize: 12, fontWeight: '700', color: COLORS.navy },
  arrowWrap:   { paddingHorizontal: 14, alignItems: 'center' },

  bonusCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 20, marginHorizontal: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: COLORS.border, ...SHADOW,
  },
  bonusLeft:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bonusBadge:   { backgroundColor: COLORS.navy, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  bonusBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  bonusTextWrap: { flex: 1 },
  bonusTitle:   { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  bonusDesc:    { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  bonusStars:   { alignItems: 'center' },

  energyInfo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginBottom: 10,
  },
  energyInfoText: { fontSize: 13, color: COLORS.textMuted },
  energyInfoVal:  { fontSize: 14, fontWeight: '700', color: COLORS.text },

  resultMsg:     { textAlign: 'center', fontSize: 13, color: COLORS.navy, marginHorizontal: 16, marginBottom: 10, fontWeight: '600' },
  resultMsgWarn: { color: COLORS.navyDark },

  exchangeBtn: {
    flexDirection: 'row', backgroundColor: COLORS.navy, borderRadius: 18,
    marginHorizontal: 16, paddingVertical: 17, justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
    shadowColor: COLORS.navyDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  exchangeBtnDisabled: { backgroundColor: COLORS.border, shadowOpacity: 0, elevation: 0 },
  exchangeBtnText:     { fontSize: 16, fontWeight: '700', color: '#FFF' },
  notEnoughHint: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginBottom: 20 },

  historySection: {
    backgroundColor: COLORS.card, borderRadius: 20, marginHorizontal: 16,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  sectionLink:  { fontSize: 12, color: COLORS.navy, fontWeight: '700' },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  historyIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.navyLight,
    justifyContent: 'center', alignItems: 'center',
  },
  historyDate:      { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  historyDesc:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  historyBadge:     { backgroundColor: COLORS.navyLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  historyBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.navy },
});
