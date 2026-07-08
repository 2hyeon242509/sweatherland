import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW, MOODS } from '../constants';
import { useGame } from '../store/GameContext';
import { fetchMissionLogs, fetchAllMoodLogs, fetchDailyRecords } from '../lib/supabase';

type Period = '2weeks' | '1month';

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function dateMinus(days: number): string {
  return new Date(Date.now() - days * 24 * 3600 * 1000 + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export default function ReportScreen() {
  const navigation = useNavigation();
  const { currentUsername } = useGame();

  const [period,  setPeriod]  = useState<Period>('2weeks');
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<any[]>([]);
  const [moods,    setMoods]    = useState<any[]>([]);
  const [daily,    setDaily]    = useState<any[]>([]);

  useEffect(() => {
    if (!currentUsername) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const [m, mo, d] = await Promise.all([
          fetchMissionLogs(currentUsername),
          fetchAllMoodLogs(currentUsername),
          fetchDailyRecords(currentUsername),
        ]);
        setMissions(m);
        setMoods(mo);
        setDaily(d);
      } catch {}
      setLoading(false);
    })();
  }, [currentUsername]);

  const cutoff = useMemo(
    () => period === '2weeks' ? dateMinus(14) : dateMinus(30),
    [period],
  );

  const periodLabel = period === '2weeks' ? '최근 2주' : '최근 1달';

  const filteredMissions = useMemo(
    () => missions.filter(m => (m.logged_at ?? '').slice(0, 10) >= cutoff),
    [missions, cutoff],
  );

  const filteredMoods = useMemo(
    () => moods.filter(m => (m.logged_at ?? '').slice(0, 10) >= cutoff),
    [moods, cutoff],
  );

  const filteredDaily = useMemo(
    () => daily.filter(d => d.record_date >= cutoff),
    [daily, cutoff],
  );

  // 감정 분리: 일반 vs 미션 완수 후
  const dailyMoods       = filteredMoods.filter((m: any) => !m.log_type || m.log_type === 'daily');
  const postMissionMoods = filteredMoods.filter((m: any) => m.log_type === 'post_mission');

  // 통계
  const totalMissions  = filteredMissions.length;
  const customMissions = filteredMissions.filter(m => m.mission_type === 'custom').length;
  const serverMissions = filteredMissions.filter(m => m.mission_type === 'server').length;
  const totalPoints    = filteredMissions.reduce((s: number, m: any) => s + (m.points ?? 0), 0);
  const batteryDays    = filteredDaily.filter(d => d.all_missions_done).length;
  const energy100Days  = filteredDaily.filter(d => d.energy_100).length;
  const moodDays       = dailyMoods.length;

  // 가장 많이 완료한 미션 Top 3
  const missionCount = filteredMissions.reduce((acc: Record<string, { label: string; count: number }>, m: any) => {
    if (!acc[m.mission_label]) acc[m.mission_label] = { label: m.mission_label, count: 0 };
    acc[m.mission_label].count++;
    return acc;
  }, {});
  const topMissions = Object.values(missionCount)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 3) as { label: string; count: number }[];

  // 일반 감정 분포 (Top 5)
  const moodCount = dailyMoods.reduce((acc: Record<string, number>, m: any) => {
    acc[m.mood_label] = (acc[m.mood_label] ?? 0) + 1;
    return acc;
  }, {});
  const topMoods = Object.entries(moodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 미션 완수 후 소감 (최근 5개)
  const recentPostMemos = postMissionMoods
    .filter((m: any) => m.memo && m.memo.trim())
    .slice(0, 5);

  // 활동한 날 수 (중복 날짜 제거)
  const activeDates = new Set([
    ...filteredMissions.map(m => (m.logged_at ?? '').slice(0, 10)),
    ...filteredMoods.map(m => (m.logged_at ?? '').slice(0, 10)),
  ]);
  const activeDays = activeDates.size;
  const periodDays = period === '2weeks' ? 14 : 30;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.title}>나의 활동 보고서</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 기간 선택 */}
      <View style={s.periodRow}>
        {(['2weeks', '1month'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[s.periodBtn, period === p && s.periodBtnActive]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.7}
          >
            <Text style={[s.periodBtnText, period === p && s.periodBtnTextActive]}>
              {p === '2weeks' ? '최근 2주' : '최근 1달'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.navy} />
          <Text style={s.loadingText}>데이터를 불러오는 중...</Text>
        </View>
      ) : !currentUsername ? (
        <View style={s.loadingWrap}>
          <Text style={s.emptyText}>로그인 후 이용할 수 있어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>

          {/* 한 줄 요약 */}
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>📊 {periodLabel} 요약</Text>
            <Text style={s.summaryText}>
              {activeDays > 0
                ? `${periodDays}일 중 ${activeDays}일 활동했어요! 전체 ${totalMissions}개 미션 완료, 💧${totalPoints}포인트 획득했어요.`
                : `${periodLabel} 동안 아직 기록이 없어요. 오늘부터 시작해봐요! 💪`}
            </Text>
          </View>

          {/* 핵심 지표 */}
          <View style={s.statGrid}>
            <StatCard emoji="✅" label="완료 미션" value={totalMissions} unit="개" />
            <StatCard emoji="🔋" label="배터리 완충" value={batteryDays} unit="일" />
            <StatCard emoji="💧" label="획득 포인트" value={totalPoints} unit="pt" />
            <StatCard emoji="💭" label="감정 기록" value={moodDays} unit="회" />
            <StatCard emoji="🌟" label="나만의 미션" value={customMissions} unit="개" />
            <StatCard emoji="💯" label="에너지 100" value={energy100Days} unit="일" />
          </View>

          {/* 활동 일수 바 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>📅 활동 일수</Text>
            <View style={s.barWrap}>
              <View style={[s.barFill, { width: `${periodDays > 0 ? Math.round((activeDays / periodDays) * 100) : 0}%` as `${number}%` }]} />
            </View>
            <Text style={s.barLabel}>{periodDays}일 중 {activeDays}일 ({periodDays > 0 ? Math.round((activeDays / periodDays) * 100) : 0}%)</Text>
          </View>

          {/* 자주 한 미션 Top 3 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>🏆 자주 한 미션 Top 3</Text>
            {topMissions.length === 0
              ? <Text style={s.emptyInCard}>미션 기록이 없어요.</Text>
              : topMissions.map((m, i) => (
                <View key={i} style={s.rankRow}>
                  <Text style={s.rankNum}>{['🥇','🥈','🥉'][i]}</Text>
                  <Text style={s.rankLabel} numberOfLines={1}>{m.label}</Text>
                  <Text style={s.rankCount}>{m.count}회</Text>
                </View>
              ))}
          </View>

          {/* 일반 감정 분포 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>💭 자주 느낀 감정</Text>
            {topMoods.length === 0
              ? <Text style={s.emptyInCard}>감정 기록이 없어요.</Text>
              : topMoods.map(([label, count], i) => {
                  const mood = MOODS.find(m => m.label === label);
                  return (
                    <View key={i} style={s.moodRow}>
                      <Text style={s.moodEmoji}>{mood?.emoji ?? '💭'}</Text>
                      <Text style={s.moodLabel}>{label}</Text>
                      <View style={s.moodBarWrap}>
                        <View style={[s.moodBarFill, {
                          width: `${topMoods[0][1] > 0 ? Math.round((count / topMoods[0][1]) * 100) : 0}%` as `${number}%`,
                          backgroundColor: mood?.iconColor ?? COLORS.navy,
                        }]} />
                      </View>
                      <Text style={s.moodCount}>{count}회</Text>
                    </View>
                  );
                })}
          </View>

          {/* 미션 완수 후 소감 */}
          {recentPostMemos.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>🏅 미션 완수 후 소감</Text>
              <Text style={[s.emptyInCard, { textAlign: 'left', paddingVertical: 0, fontSize: 12, color: COLORS.textMuted }]}>
                총 {postMissionMoods.length}회 기록 (최근 5개)
              </Text>
              {recentPostMemos.map((m: any, i: number) => (
                <View key={i} style={s.memoRow}>
                  <Text style={s.memoIdx}>{i + 1}</Text>
                  <Text style={s.memoText}>{m.memo}</Text>
                  <Text style={s.memoDate}>{(m.logged_at ?? '').slice(5, 10)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 격려 메시지 */}
          <View style={s.encourageCard}>
            <Text style={s.encourageEmoji}>
              {batteryDays >= 7 ? '🏆' : batteryDays >= 3 ? '🌟' : activeDays >= 3 ? '💙' : '🌱'}
            </Text>
            <Text style={s.encourageText}>
              {batteryDays >= 7
                ? '정말 대단해요! 꾸준한 노력이 빛나고 있어요.'
                : batteryDays >= 3
                ? '좋은 흐름이에요! 이 페이스를 유지해봐요.'
                : activeDays >= 3
                ? '조금씩 쌓아가고 있어요. 잘 하고 있어요!'
                : '오늘 첫 걸음을 내딛어봐요. 작은 것부터 시작해도 충분해요.'}
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatCard({ emoji, label, value, unit }: { emoji: string; label: string; value: number; unit: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statEmoji}>{emoji}</Text>
      <Text style={s.statValue}>{value}<Text style={s.statUnit}>{unit}</Text></Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title:   { fontSize: 18, fontWeight: '700', color: COLORS.text },

  periodRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.navyLight, borderRadius: 12, padding: 4,
    gap: 4,
  },
  periodBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: COLORS.navy },
  periodBtnText:   { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  periodBtnTextActive: { color: '#FFF', fontWeight: '700' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textMuted },
  emptyText:   { fontSize: 14, color: COLORS.textMuted },

  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },

  summaryCard: {
    backgroundColor: COLORS.navy, borderRadius: 18, padding: 20, gap: 8,
  },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  summaryText:  { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '30%', flexGrow: 1, backgroundColor: COLORS.card, borderRadius: 16,
    padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border, ...SHADOW,
  },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.navy },
  statUnit:  { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  statLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },

  card: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW, gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },

  barWrap: {
    height: 10, backgroundColor: COLORS.navyLight, borderRadius: 5, overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: COLORS.navy, borderRadius: 5 },
  barLabel: { fontSize: 12, color: COLORS.textMuted, textAlign: 'right' },

  rankRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankNum:   { fontSize: 20 },
  rankLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  rankCount: { fontSize: 13, fontWeight: '700', color: COLORS.navy },

  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodEmoji: { fontSize: 20, width: 28 },
  moodLabel: { width: 60, fontSize: 12, color: COLORS.text },
  moodBarWrap: {
    flex: 1, height: 8, backgroundColor: COLORS.navyLight, borderRadius: 4, overflow: 'hidden',
  },
  moodBarFill: { height: '100%', borderRadius: 4 },
  moodCount: { fontSize: 12, color: COLORS.textMuted, width: 28, textAlign: 'right' },

  emptyInCard: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 12 },

  memoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  memoIdx: {
    width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22,
    backgroundColor: COLORS.navy, color: '#FFF', fontSize: 11, fontWeight: '700',
    overflow: 'hidden',
  },
  memoText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 20 },
  memoDate: { fontSize: 11, color: COLORS.textMuted },

  encourageCard: {
    backgroundColor: COLORS.navyLight, borderRadius: 18, padding: 20,
    alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  encourageEmoji: { fontSize: 48 },
  encourageText:  { fontSize: 14, color: COLORS.text, textAlign: 'center', lineHeight: 22 },
});
