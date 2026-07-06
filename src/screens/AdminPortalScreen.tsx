/**
 * 관리자 전용 포털
 * 접근 방법:
 *   웹 URL: https://[도메인]/#admin
 *   단축키: 앱 어디서든 Ctrl + Shift + A
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW } from '../constants';
import { UserProfile } from '../types/auth';
import {
  MoodLog, MissionLogEntry, DailyRecord,
  fetchAllUserProfiles, fetchAllMoodLogs, fetchMissionLogs, fetchDailyRecords,
} from '../lib/supabase';

const ADMIN_PIN = '9999';

type Tab = 'members' | 'moods' | 'missions' | 'daily';

function fmtDate(iso: string | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth()+1).padStart(2,'0')}-${String(kst.getUTCDate()).padStart(2,'0')} ${String(kst.getUTCHours()).padStart(2,'0')}:${String(kst.getUTCMinutes()).padStart(2,'0')}`;
}

function downloadCSV(filename: string, header: string[], rows: string[][]) {
  const BOM = '﻿';
  const lines = [
    header.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
  ];
  const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function AdminPortalScreen() {
  const [pin,     setPinVal] = useState('');
  const [authed,  setAuthed] = useState(false);
  const [error,   setError]  = useState('');
  const [tab,     setTab]    = useState<Tab>('members');
  const [loading, setLoading] = useState(false);

  const [members,  setMembers]  = useState<UserProfile[]>([]);
  const [moods,    setMoods]    = useState<MoodLog[]>([]);
  const [missions, setMissions] = useState<MissionLogEntry[]>([]);
  const [daily,    setDaily]    = useState<DailyRecord[]>([]);
  const [search,   setSearch]   = useState('');

  async function loadAll() {
    const [m, mo, mi, d] = await Promise.all([
      fetchAllUserProfiles(),
      fetchAllMoodLogs(),
      fetchMissionLogs(),
      fetchDailyRecords(),
    ]);
    setMembers(m); setMoods(mo); setMissions(mi); setDaily(d);
  }

  async function handleLogin() {
    if (pin !== ADMIN_PIN) { setError('PIN이 올바르지 않아요'); setPinVal(''); return; }
    setLoading(true);
    try {
      await loadAll();
      setAuthed(true);
    } catch (e: any) {
      setError('데이터 오류: ' + e.message);
    } finally { setLoading(false); }
  }

  async function handleRefresh() {
    setLoading(true);
    try { await loadAll(); } catch {}
    setLoading(false);
  }

  const q = search.toLowerCase();

  const filteredMembers  = q ? members.filter(m =>
    m.username.toLowerCase().includes(q) || (m.realName ?? '').toLowerCase().includes(q) || (m.studentId ?? '').includes(q)
  ) : members;

  const filteredMoods = q ? moods.filter(l =>
    (l.user_name ?? '').toLowerCase().includes(q) || (l.mood_label ?? '').toLowerCase().includes(q)
  ) : moods;

  const filteredMissions = q ? missions.filter(m =>
    (m.username ?? '').toLowerCase().includes(q) || (m.mission_label ?? '').toLowerCase().includes(q)
  ) : missions;

  const filteredDaily = q ? daily.filter(d =>
    (d.username ?? '').toLowerCase().includes(q) || (d.record_date ?? '').includes(q)
  ) : daily;

  function exportCurrent() {
    const d = new Date().toISOString().slice(0, 10);
    if (tab === 'members') {
      downloadCSV(`members_${d}.csv`,
        ['번호','아이디','본명','학번','전화번호','이모지','스웨트','가입일'],
        filteredMembers.map((m, i) => [String(i+1), m.username, m.realName??'', m.studentId??'', m.phone??'', m.emoji??'', '', fmtDate(m.createdAt)]));
    } else if (tab === 'moods') {
      downloadCSV(`moods_${d}.csv`,
        ['번호','사용자','감정','메모','기록일시'],
        filteredMoods.map((l, i) => [String(i+1), l.user_name, l.mood_label, l.memo??'', fmtDate(l.logged_at)]));
    } else if (tab === 'missions') {
      downloadCSV(`missions_${d}.csv`,
        ['번호','사용자','미션','타입','포인트','스탯','완료일시'],
        filteredMissions.map((m, i) => [String(i+1), m.username, m.mission_label, m.mission_type, String(m.points), m.stat, fmtDate(m.logged_at)]));
    } else {
      downloadCSV(`daily_${d}.csv`,
        ['번호','사용자','날짜','미션완료','에너지100','완료수'],
        filteredDaily.map((d, i) => [String(i+1), d.username, d.record_date, d.all_missions_done?'O':'X', d.energy_100?'O':'X', String(d.missions_completed)]));
    }
  }

  // 통계 계산
  const activeUsers      = new Set(moods.map(l => l.user_name)).size;
  const missionUsers     = new Set(missions.map(m => m.username)).size;
  const fullDays         = daily.filter(d => d.all_missions_done).length;
  const avgMissionsPerUser = missionUsers > 0
    ? Math.round(missions.length / missionUsers)
    : 0;

  /* ─── PIN 화면 ─────────────────────────── */
  if (!authed) {
    return (
      <View style={p.wrap}>
        <View style={p.loginCard}>
          <Text style={p.lockIcon}>🔒</Text>
          <Text style={p.loginTitle}>관리자 포털</Text>
          <Text style={p.loginSub}>S.WEATHER LAND Admin</Text>
          <TextInput
            style={p.pinInput}
            value={pin}
            onChangeText={t => { setPinVal(t); setError(''); }}
            placeholder="관리자 PIN"
            placeholderTextColor="#aaa"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={8}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          {error ? <Text style={p.errText}>{error}</Text> : null}
          <TouchableOpacity
            style={[p.loginBtn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={p.loginBtnText}>접속하기</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={p.backBtn}
            onPress={() => { if (Platform.OS === 'web') { window.location.hash = ''; window.location.reload(); } }}
            activeOpacity={0.7}
          >
            <Text style={p.backBtnText}>← 앱으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ─── 대시보드 ─────────────────────────── */
  return (
    <View style={p.wrap}>
      <SafeAreaView style={{ flex: 1, width: '100%' }}>

        {/* ── 헤더 ──────────────────────── */}
        <View style={p.header}>
          <View>
            <Text style={p.headerTitle}>🔒 관리자 포털</Text>
            <Text style={p.headerSub}>S.WEATHER LAND Admin</Text>
          </View>
          <View style={p.headerRight}>
            {loading && <ActivityIndicator color={COLORS.navy} style={{ marginRight: 12 }} />}
            <TouchableOpacity style={p.refreshBtn} onPress={handleRefresh} activeOpacity={0.7}>
              <Ionicons name="refresh" size={18} color={COLORS.navy} />
            </TouchableOpacity>
            <TouchableOpacity
              style={p.exitBtn}
              onPress={() => { if (Platform.OS === 'web') { window.location.hash = ''; window.location.reload(); } }}
              activeOpacity={0.7}
            >
              <Text style={p.exitBtnText}>나가기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 통계 ──────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', backgroundColor: '#FFF' }} contentContainerStyle={p.statsRow}>
          <StatChip label="총 회원" value={members.length} />
          <StatChip label="감정 기록" value={moods.length} />
          <StatChip label="미션 완료" value={missions.length} />
          <StatChip label="배터리 충전일" value={fullDays} />
          <StatChip label="활동 회원" value={Math.max(activeUsers, missionUsers)} />
          <StatChip label="인당 미션" value={avgMissionsPerUser} />
        </ScrollView>

        {/* ── 탭 ────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }} contentContainerStyle={p.tabRow}>
          {([
            { key: 'members',  label: `👥 회원 (${members.length})` },
            { key: 'moods',    label: `💭 감정 (${moods.length})` },
            { key: 'missions', label: `✅ 미션 (${missions.length})` },
            { key: 'daily',    label: `📅 일별 (${daily.length})` },
          ] as const).map(t => (
            <TouchableOpacity
              key={t.key}
              style={[p.tab, tab === t.key && p.tabActive]}
              onPress={() => { setTab(t.key); setSearch(''); }}
              activeOpacity={0.7}
            >
              <Text style={[p.tabText, tab === t.key && p.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── 검색 + 다운로드 ───────────── */}
        <View style={p.toolRow}>
          <View style={p.searchBox}>
            <Ionicons name="search" size={14} color="#aaa" style={{ marginRight: 6 }} />
            <TextInput
              style={p.searchInput}
              placeholder="검색…"
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={p.dlBtn} onPress={exportCurrent} activeOpacity={0.7}>
            <Ionicons name="download-outline" size={15} color="#FFF" />
            <Text style={p.dlBtnText}>CSV</Text>
          </TouchableOpacity>
        </View>

        {/* ── 회원 명단 ─────────────────── */}
        {tab === 'members' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={p.tableHead}>
              {['#','아이디','본명','학번','이모지','가입일'].map((h, i) => (
                <Text key={i} style={[p.th, i===0&&{flex:0.4}]}>{h}</Text>
              ))}
            </View>
            {filteredMembers.length === 0
              ? <Text style={p.empty}>회원이 없습니다.</Text>
              : filteredMembers.map((m, i) => (
                <View key={m.username} style={[p.row, i%2===0&&p.rowAlt]}>
                  <Text style={[p.td,{flex:0.4}]}>{i+1}</Text>
                  <Text style={p.td} numberOfLines={1}>{m.username}</Text>
                  <Text style={p.td} numberOfLines={1}>{m.realName??'—'}</Text>
                  <Text style={p.td} numberOfLines={1}>{m.studentId??'—'}</Text>
                  <Text style={p.td}>{m.emoji??'—'}</Text>
                  <Text style={p.td} numberOfLines={1}>{fmtDate(m.createdAt)}</Text>
                </View>
              ))}
          </ScrollView>
        )}

        {/* ── 감정 기록 ─────────────────── */}
        {tab === 'moods' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={p.tableHead}>
              {['#','사용자','감정','메모','기록일시'].map((h, i) => (
                <Text key={i} style={[p.th, i===0&&{flex:0.4}, i===3&&{flex:2}]}>{h}</Text>
              ))}
            </View>
            {filteredMoods.length === 0
              ? <Text style={p.empty}>기록이 없습니다.</Text>
              : filteredMoods.map((l, i) => (
                <View key={l.id??i} style={[p.row, i%2===0&&p.rowAlt]}>
                  <Text style={[p.td,{flex:0.4}]}>{i+1}</Text>
                  <Text style={p.td} numberOfLines={1}>{l.user_name}</Text>
                  <Text style={p.td} numberOfLines={1}>{l.mood_label}</Text>
                  <Text style={[p.td,{flex:2,color:'#666'}]} numberOfLines={2}>{l.memo||'—'}</Text>
                  <Text style={p.td} numberOfLines={1}>{fmtDate(l.logged_at)}</Text>
                </View>
              ))}
          </ScrollView>
        )}

        {/* ── 미션 기록 ─────────────────── */}
        {tab === 'missions' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={p.tableHead}>
              {['#','사용자','미션','타입','💧','완료일시'].map((h, i) => (
                <Text key={i} style={[p.th, i===0&&{flex:0.4}, i===2&&{flex:1.8}]}>{h}</Text>
              ))}
            </View>
            {filteredMissions.length === 0
              ? <Text style={p.empty}>미션 기록이 없습니다.{'\n'}(Supabase에 mission_logs 테이블이 필요해요)</Text>
              : filteredMissions.map((m, i) => (
                <View key={m.id??i} style={[p.row, i%2===0&&p.rowAlt]}>
                  <Text style={[p.td,{flex:0.4}]}>{i+1}</Text>
                  <Text style={p.td} numberOfLines={1}>{m.username}</Text>
                  <Text style={[p.td,{flex:1.8}]} numberOfLines={1}>{m.mission_label}</Text>
                  <Text style={[p.td,{color: m.mission_type==='custom'?COLORS.navy:'#666'}]} numberOfLines={1}>
                    {m.mission_type==='custom'?'나만의':'추천'}
                  </Text>
                  <Text style={p.td}>{m.points}</Text>
                  <Text style={p.td} numberOfLines={1}>{fmtDate(m.logged_at)}</Text>
                </View>
              ))}
          </ScrollView>
        )}

        {/* ── 일별 활동 ─────────────────── */}
        {tab === 'daily' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={p.tableHead}>
              {['#','사용자','날짜','미션완료','에너지100','완료수'].map((h, i) => (
                <Text key={i} style={[p.th, i===0&&{flex:0.4}]}>{h}</Text>
              ))}
            </View>
            {filteredDaily.length === 0
              ? <Text style={p.empty}>일별 기록이 없습니다.{'\n'}(Supabase에 daily_records 테이블이 필요해요)</Text>
              : filteredDaily.map((d, i) => (
                <View key={d.id??i} style={[p.row, i%2===0&&p.rowAlt]}>
                  <Text style={[p.td,{flex:0.4}]}>{i+1}</Text>
                  <Text style={p.td} numberOfLines={1}>{d.username}</Text>
                  <Text style={p.td}>{d.record_date}</Text>
                  <Text style={[p.td,{color:d.all_missions_done?'#27AE60':'#aaa',fontWeight:'700'}]}>{d.all_missions_done?'✅':'—'}</Text>
                  <Text style={[p.td,{color:d.energy_100?COLORS.navy:'#aaa',fontWeight:'700'}]}>{d.energy_100?'💯':'—'}</Text>
                  <Text style={p.td}>{d.missions_completed}</Text>
                </View>
              ))}
          </ScrollView>
        )}

      </SafeAreaView>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <View style={p.statChip}>
      <Text style={p.statNum}>{value}</Text>
      <Text style={p.statLabel}>{label}</Text>
    </View>
  );
}

const p = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F0F2F5', alignItems: 'center' },

  loginCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 36,
    alignItems: 'center', gap: 12, marginTop: 80, width: 380, ...SHADOW,
  },
  lockIcon:    { fontSize: 52 },
  loginTitle:  { fontSize: 22, fontWeight: '800', color: COLORS.text },
  loginSub:    { fontSize: 13, color: '#888', marginBottom: 8 },
  pinInput: {
    width: '100%', backgroundColor: '#F8F8F8', borderRadius: 12,
    padding: 16, fontSize: 20, textAlign: 'center', letterSpacing: 8,
    color: COLORS.text, borderWidth: 1, borderColor: '#E0E0E0',
  },
  errText:      { fontSize: 13, color: '#C0392B' },
  loginBtn: {
    width: '100%', backgroundColor: COLORS.navy, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  backBtn:      { paddingVertical: 8 },
  backBtnText:  { fontSize: 13, color: '#888' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', width: '100%',
  },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: COLORS.text },
  headerSub:    { fontSize: 11, color: '#888' },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.navyLight,
    justifyContent: 'center', alignItems: 'center',
  },
  exitBtn: { backgroundColor: '#EEE', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  exitBtnText: { fontSize: 13, color: '#555' },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  statChip: {
    backgroundColor: COLORS.navyLight, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', minWidth: 80,
  },
  statNum:   { fontSize: 20, fontWeight: '800', color: COLORS.navy },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 4 },
  tab: {
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: COLORS.navy },
  tabText:       { fontSize: 13, color: '#888' },
  tabTextActive: { color: COLORS.navy, fontWeight: '700' },

  toolRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#F8F8F8', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', width: '100%',
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text },
  dlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.navy, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
  },
  dlBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  tableHead: {
    flexDirection: 'row', backgroundColor: COLORS.navyLight,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, width: '100%',
  },
  th:  { flex: 1, fontSize: 11, fontWeight: '700', color: COLORS.navy, paddingRight: 4 },
  row: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0', width: '100%',
  },
  rowAlt: { backgroundColor: '#FAFAFA' },
  td:     { flex: 1, fontSize: 12, color: COLORS.text, paddingRight: 6 },
  empty:  { textAlign: 'center', color: '#888', fontSize: 13, paddingTop: 60, lineHeight: 22 },
});
