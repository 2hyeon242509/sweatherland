import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useGame } from '../store/GameContext';
import { MOODS } from '../constants';
import { loadLogsByMonth } from '../lib/localLogs';
import { MoodLog } from '../lib/supabase';

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function kstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000);
}

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow    = new Date(year, month - 1, 1).getDay();
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

  const now        = kstNow();
  const todayYear  = now.getUTCFullYear();
  const todayMonth = now.getUTCMonth() + 1;
  const todayDay   = now.getUTCDate();
  const todayStr   = toStr(todayYear, todayMonth, todayDay);

  const [viewYear,   setViewYear]   = useState(todayYear);
  const [viewMonth,  setViewMonth]  = useState(todayMonth);
  const [moodByDate, setMoodByDate] = useState<Record<string, MoodLog>>({});

  // 화면 포커스 시 재로드
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
  const rows: (number | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));

  // 이번 달 통계
  const daysInView = Array.from(
    { length: new Date(viewYear, viewMonth, 0).getDate() },
    (_, i) => toStr(viewYear, viewMonth, i + 1),
  );
  const moodCount    = daysInView.filter(d => moodByDate[d]).length;
  const energy100Cnt = daysInView.filter(d => energy100Dates.includes(d)).length;
  const missionCnt   = daysInView.filter(d => allMissionDates.includes(d)).length;

  return (
    <SafeAreaView style={s.safe}>

      {/* ── 헤더 ─────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => goMonth(-1)} style={s.navBtn}>
          <Text style={s.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.monthTitle}>{viewYear}년 {viewMonth}월</Text>
        <TouchableOpacity onPress={() => goMonth(+1)} style={s.navBtn}>
          <Text style={s.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── 이번 달 통계 ─────────────────────── */}
      <View style={s.statsRow}>
        <View style={s.statChip}>
          <Text style={s.statNum}>{moodCount}</Text>
          <Text style={s.statLabel}>😊 감정기록</Text>
        </View>
        <View style={s.statChip}>
          <Text style={s.statNum}>{energy100Cnt}</Text>
          <Text style={s.statLabel}>🔋 에너지 100</Text>
        </View>
        <View style={s.statChip}>
          <Text style={s.statNum}>{missionCnt}</Text>
          <Text style={s.statLabel}>💧 미션 완료</Text>
        </View>
      </View>

      {/* ── 요일 헤더 ─────────────────────────── */}
      <View style={s.dowRow}>
        {DOW_LABELS.map((d, i) => (
          <Text key={d} style={[s.dowLabel, i === 0 && s.sunText, i === 6 && s.satText]}>
            {d}
          </Text>
        ))}
      </View>

      {/* ── 달력 그리드 ───────────────────────── */}
      <View style={s.grid}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={s.calRow}>
            {row.map((day, colIdx) => {
              if (!day) return <View key={`e-${rowIdx}-${colIdx}`} style={s.cell} />;

              const ds      = toStr(viewYear, viewMonth, day);
              const log     = moodByDate[ds];
              const mood    = log ? (MOODS.find(m => m.id === log.mood_id) ?? null) : null;
              const hasE    = energy100Dates.includes(ds);
              const hasM    = allMissionDates.includes(ds);
              const isToday = ds === todayStr;
              const dow     = colIdx;

              return (
                <View key={ds} style={s.cell}>
                  <Text style={[
                    s.dayNum,
                    isToday && s.dayNumToday,
                    dow === 0 && s.sunText,
                    dow === 6 && s.satText,
                  ]}>
                    {day}
                  </Text>
                  <View style={s.circleWrap}>
                    {hasM && <Text style={s.badgeLeft}>💧</Text>}
                    {hasE && <Text style={s.badgeRight}>🔋</Text>}
                    <View style={[
                      s.circle,
                      isToday && s.circleToday,
                      mood && { backgroundColor: mood.selectedBg },
                    ]}>
                      {mood ? <Text style={s.moodEmoji}>{mood.emoji}</Text> : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* ── 범례 ──────────────────────────────── */}
      <View style={s.legend}>
        <Text style={s.legendItem}>💧 미션 9개 완료</Text>
        <Text style={s.legendItem}>🟢 오늘</Text>
        <Text style={s.legendItem}>🔋 에너지 100 달성</Text>
      </View>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FEFAE6' },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  navBtn:     { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  navText:    { fontSize: 26, fontWeight: '700', color: '#333333' },
  monthTitle: { fontSize: 17, fontWeight: '800', color: '#3D3224' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  statChip: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 10, backgroundColor: '#FFFFFF',
  },
  statNum:  { fontSize: 18, fontWeight: '800', color: '#3D3224' },
  statLabel:{ fontSize: 10, color: '#888888', marginTop: 2 },

  dowRow:   { flexDirection: 'row', paddingHorizontal: 8, marginBottom: 2 },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#888888', paddingVertical: 4 },
  sunText:  { color: '#E8574A' },
  satText:  { color: '#5B7FDB' },

  grid:   { flex: 1, paddingHorizontal: 8, paddingBottom: 4 },
  calRow: { flex: 1, flexDirection: 'row' },
  cell:   { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4, gap: 2 },

  dayNum:      { fontSize: 11, fontWeight: '600', color: '#333333' },
  dayNumToday: { color: '#5C9E4A', fontWeight: '800' },

  circleWrap: { width: 34, height: 34, position: 'relative' },
  circle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#DDDDDD',
    justifyContent: 'center', alignItems: 'center',
  },
  circleToday: { borderColor: '#5C9E4A', borderWidth: 2, backgroundColor: '#EDF5E8' },
  moodEmoji:   { fontSize: 17 },

  badgeLeft:  { position: 'absolute', top: -5, left: -5, fontSize: 12, zIndex: 2 },
  badgeRight: { position: 'absolute', top: -5, right: -5, fontSize: 12, zIndex: 2 },

  legend:     { flexDirection: 'row', justifyContent: 'center', gap: 16, padding: 10, borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  legendItem: { fontSize: 11, color: '#888888' },
});
