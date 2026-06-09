import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../store/GameContext';
import { MOODS, COLORS, SHADOW } from '../constants';
import { loadLogsByMonth } from '../lib/localLogs';
import { MoodLog } from '../lib/supabase';

const isWeb = Platform.OS === 'web';
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// KST 기준 현재 시각
function kstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000);
}

// 달력 그리드 생성 (null = 빈 칸, number = 날짜)
function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow    = new Date(year, month - 1, 1).getDay(); // 0=일
  const daysInMonth = new Date(year, month, 0).getDate();
  const grid: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function toStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const { energy100Dates, allMissionDates } = useGame();

  const now = kstNow();
  const todayYear  = now.getUTCFullYear();
  const todayMonth = now.getUTCMonth() + 1;
  const todayDay   = now.getUTCDate();
  const todayStr   = toStr(todayYear, todayMonth, todayDay);

  const [viewYear,  setViewYear]  = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);
  const [moodByDate, setMoodByDate] = useState<Record<string, MoodLog>>({});

  // 화면 포커스될 때마다 재로드 (감정 기록 후 복귀 시 반영)
  useFocusEffect(
    useCallback(() => {
      loadLogsByMonth(viewYear, viewMonth).then(setMoodByDate);
    }, [viewYear, viewMonth]),
  );

  const goMonth = (delta: number) => {
    let y = viewYear, m = viewMonth + delta;
    if (m < 1)  { y -= 1; m = 12; }
    if (m > 12) { y += 1; m = 1; }
    setViewYear(y);
    setViewMonth(m);
  };

  const grid = buildGrid(viewYear, viewMonth);
  // 7열씩 분리 → 행 배열
  const rows: (number | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));

  // 이번 달 일자 목록
  const daysInView = Array.from(
    { length: new Date(viewYear, viewMonth, 0).getDate() },
    (_, i) => toStr(viewYear, viewMonth, i + 1),
  );
  const moodCount    = daysInView.filter(d => moodByDate[d]).length;
  const energy100Cnt = daysInView.filter(d => energy100Dates.includes(d)).length;
  const missionCnt   = daysInView.filter(d => allMissionDates.includes(d)).length;

  return (
    <View style={styles.outerWrap}>
      <SafeAreaView style={styles.safe}>

        {/* ── 월 네비게이션 헤더 ────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goMonth(-1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.monthTitle}>{viewYear}년 {viewMonth}월</Text>
            {viewYear === todayYear && viewMonth === todayMonth && (
              <View style={styles.todayDot} />
            )}
          </View>
          <TouchableOpacity onPress={() => goMonth(+1)} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* ── 이번 달 통계 요약 ─────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statEmoji}>😊</Text>
            <Text style={styles.statNum}>{moodCount}</Text>
            <Text style={styles.statLabel}>감정기록</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statEmoji}>🔋</Text>
            <Text style={styles.statNum}>{energy100Cnt}</Text>
            <Text style={styles.statLabel}>에너지 100</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statEmoji}>💧</Text>
            <Text style={styles.statNum}>{missionCnt}</Text>
            <Text style={styles.statLabel}>미션 완료</Text>
          </View>
        </View>

        {/* ── 요일 헤더 ─────────────────────── */}
        <View style={styles.dowRow}>
          {DOW_LABELS.map((d, i) => (
            <Text
              key={d}
              style={[
                styles.dowLabel,
                i === 0 && styles.sunText,
                i === 6 && styles.satText,
              ]}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* ── 달력 그리드 ───────────────────── */}
        <View style={styles.grid}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.calRow}>
              {row.map((day, colIdx) => {
                if (!day) return <View key={`e-${rowIdx}-${colIdx}`} style={styles.cell} />;

                const ds     = toStr(viewYear, viewMonth, day);
                const log    = moodByDate[ds];
                const mood   = log ? (MOODS.find(m => m.id === log.mood_id) ?? null) : null;
                const hasE   = energy100Dates.includes(ds);
                const hasM   = allMissionDates.includes(ds);
                const isToday = ds === todayStr;
                const dow    = colIdx; // 0=일, 6=토 (그리드가 일요일부터 시작)

                return (
                  <View key={ds} style={styles.cell}>
                    <Text style={[
                      styles.dayNum,
                      isToday && styles.dayNumToday,
                      dow === 0 && styles.sunText,
                      dow === 6 && styles.satText,
                    ]}>
                      {day}
                    </Text>

                    {/* 원형 + 배지 묶음 */}
                    <View style={styles.circleWrap}>
                      {/* 좌상단: 미션 전체 완료 💧 */}
                      {hasM && <Text style={styles.badgeLeft}>💧</Text>}
                      {/* 우상단: 에너지 100 🔋 */}
                      {hasE && <Text style={styles.badgeRight}>🔋</Text>}

                      <View style={[
                        styles.circle,
                        isToday && styles.circleToday,
                        mood    && { backgroundColor: mood.selectedBg },
                      ]}>
                        {mood
                          ? <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                          : null
                        }
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── 범례 ──────────────────────────── */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>💧</Text>
            <Text style={styles.legendLabel}>미션 9개 완료</Text>
          </View>
          <View style={[styles.legendItem, { marginHorizontal: 8 }]}>
            <View style={[styles.circleSample, { borderColor: COLORS.green, borderWidth: 2 }]} />
            <Text style={styles.legendLabel}>오늘</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>🔋</Text>
            <Text style={styles.legendLabel}>에너지 100 달성</Text>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: isWeb ? COLORS.yellow : COLORS.bg,
    alignItems: isWeb ? 'center' : 'stretch',
  },
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    width: isWeb ? 390 : '100%',
  },

  // ── 헤더 ──────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.card,
    justifyContent: 'center', alignItems: 'center',
    ...SHADOW,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  todayDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.green },

  // ── 통계 요약 ──────────────────────────────────
  statsRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, marginBottom: 10,
  },
  statChip: {
    flex: 1, backgroundColor: COLORS.card,
    borderRadius: 16, paddingVertical: 10,
    alignItems: 'center', gap: 2, ...SHADOW,
  },
  statEmoji: { fontSize: 20 },
  statNum:   { fontSize: 16, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 10, color: COLORS.textMuted },

  // ── 요일 헤더 ──────────────────────────────────
  dowRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  dowLabel: {
    flex: 1, textAlign: 'center',
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    paddingVertical: 4,
  },
  sunText: { color: '#E8574A' },
  satText: { color: '#5B7FDB' },

  // ── 달력 그리드 ────────────────────────────────
  grid: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  calRow: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    gap: 2,
  },
  dayNum: {
    fontSize: 11, fontWeight: '600', color: COLORS.text,
  },
  dayNumToday: {
    color: COLORS.green, fontWeight: '800',
  },

  // 원형 + 배지 컨테이너
  circleWrap: {
    width: 36, height: 36,
    position: 'relative',
  },
  circle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F0EBE8',
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  circleToday: {
    borderColor: COLORS.green,
    borderWidth: 2.5,
    backgroundColor: COLORS.greenLight,
  },
  moodEmoji: { fontSize: 18 },

  // 배지 (좌상단 / 우상단)
  badgeLeft: {
    position: 'absolute', top: -5, left: -5,
    fontSize: 13, zIndex: 2,
  },
  badgeRight: {
    position: 'absolute', top: -5, right: -5,
    fontSize: 13, zIndex: 2,
  },

  // ── 범례 ───────────────────────────────────────
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendIcon:  { fontSize: 13 },
  legendLabel: { fontSize: 11, color: COLORS.textMuted },
  circleSample: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.greenLight,
  },
});
