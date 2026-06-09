/**
 * 관리자 전용 포털
 * 접근 방법:
 *   웹 URL: https://[도메인]/#admin
 *   단축키: 앱 어디서든 Ctrl + Shift + A
 *
 * 일반 앱 내비게이션에서는 완전히 분리됨
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW } from '../constants';
import { UserProfile } from '../types/auth';
import { loadLocalLogs } from '../lib/localLogs';
import { MoodLog } from '../lib/supabase';

const ADMIN_PIN = '9999'; // ← 반드시 변경하세요

type Tab = 'members' | 'logs';

function fmtDate(iso: string | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  const yy = kst.getUTCFullYear();
  const mo = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${yy}-${mo}-${dd} ${hh}:${mm}`;
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
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminPortalScreen() {
  const [pin,    setPin]    = useState('');
  const [authed, setAuthed] = useState(false);
  const [error,  setError]  = useState('');
  const [tab,    setTab]    = useState<Tab>('members');
  const [loading, setLoading] = useState(false);

  const [members, setMembers] = useState<UserProfile[]>([]);
  const [logs,    setLogs]    = useState<MoodLog[]>([]);
  const [search,  setSearch]  = useState('');

  async function handleLogin() {
    if (pin !== ADMIN_PIN) { setError('PIN이 올바르지 않아요'); setPin(''); return; }
    setLoading(true);
    try {
      const rawMembers = await AsyncStorage.getItem('@user_profiles');
      setMembers(rawMembers ? JSON.parse(rawMembers) : []);
      const rawLogs = await loadLocalLogs();
      setLogs(rawLogs);
      setAuthed(true);
    } catch (e: any) {
      setError('데이터 불러오기 오류: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    try {
      const rawMembers = await AsyncStorage.getItem('@user_profiles');
      setMembers(rawMembers ? JSON.parse(rawMembers) : []);
      const rawLogs = await loadLocalLogs();
      setLogs(rawLogs);
    } catch {}
    setLoading(false);
  }

  /* ── 검색 필터 ──────────────────────────── */
  const q = search.toLowerCase();
  const filteredMembers = q
    ? members.filter(m =>
        m.username.toLowerCase().includes(q) ||
        m.realName?.toLowerCase().includes(q) ||
        m.studentId?.includes(q) ||
        m.phone?.includes(q))
    : members;

  const filteredLogs = q
    ? logs.filter(l =>
        l.user_name?.toLowerCase().includes(q) ||
        l.mood_label?.toLowerCase().includes(q) ||
        (l.memo ?? '').toLowerCase().includes(q))
    : logs;

  /* ── 엑셀 다운로드 ──────────────────────── */
  function exportMembers() {
    downloadCSV(
      `sweatherland_members_${new Date().toISOString().slice(0,10)}.csv`,
      ['번호','아이디','본명','학번','전화번호','이모지','가입일시','동의일시'],
      filteredMembers.map((m, i) => [
        String(i + 1),
        m.username,
        m.realName   ?? '',
        m.studentId  ?? '',
        m.phone      ?? '',
        m.emoji      ?? '',
        fmtDate(m.createdAt),
        fmtDate(m.consentDate),
      ]),
    );
  }

  function exportLogs() {
    downloadCSV(
      `sweatherland_moodlogs_${new Date().toISOString().slice(0,10)}.csv`,
      ['번호','사용자','감정ID','감정','메모','기록일시(KST)'],
      filteredLogs.map((l, i) => [
        String(i + 1),
        l.user_name,
        l.mood_id,
        l.mood_label,
        l.memo ?? '',
        fmtDate(l.logged_at),
      ]),
    );
  }

  /* ─── PIN 화면 ─────────────────────────── */
  if (!authed) {
    return (
      <View style={p.wrap}>
        <View style={p.loginCard}>
          <Text style={p.lockIcon}>🔒</Text>
          <Text style={p.loginTitle}>관리자 포털</Text>
          <Text style={p.loginSub}>S.WEATHER LAND 운영진 전용</Text>
          <TextInput
            style={p.pinInput}
            value={pin}
            onChangeText={t => { setPin(t); setError(''); }}
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
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={p.loginBtnText}>접속하기</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={p.backBtn}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.location.hash = '';
                window.location.reload();
              }
            }}
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
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.location.hash = '';
                  window.location.reload();
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={p.exitBtnText}>나가기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 통계 ──────────────────────── */}
        <View style={p.statsRow}>
          <StatChip label="총 회원" value={members.length} />
          <StatChip label="감정 기록" value={logs.length} />
          <StatChip label="활동 사용자" value={new Set(logs.map(l => l.user_name)).size} />
        </View>

        {/* ── 탭 ────────────────────────── */}
        <View style={p.tabRow}>
          <TouchableOpacity
            style={[p.tab, tab === 'members' && p.tabActive]}
            onPress={() => { setTab('members'); setSearch(''); }}
            activeOpacity={0.7}
          >
            <Text style={[p.tabText, tab === 'members' && p.tabTextActive]}>
              👥 회원 명단 ({members.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[p.tab, tab === 'logs' && p.tabActive]}
            onPress={() => { setTab('logs'); setSearch(''); }}
            activeOpacity={0.7}
          >
            <Text style={[p.tabText, tab === 'logs' && p.tabTextActive]}>
              📔 감정 기록 ({logs.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 검색 + 엑셀 ───────────────── */}
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
          <TouchableOpacity
            style={p.dlBtn}
            onPress={tab === 'members' ? exportMembers : exportLogs}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={15} color="#FFF" />
            <Text style={p.dlBtnText}>CSV 다운로드</Text>
          </TouchableOpacity>
        </View>

        {/* ── 테이블 ────────────────────── */}
        {tab === 'members' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* 헤더 */}
            <View style={p.tableHead}>
              {['#','아이디','본명','학번','전화번호','이모지','가입일'].map((h, i) => (
                <Text key={i} style={[p.th, i === 0 && { flex: 0.4 }, i === 2 && { flex: 1.2 }]}>{h}</Text>
              ))}
            </View>
            {filteredMembers.length === 0 ? (
              <Text style={p.empty}>회원이 없습니다.</Text>
            ) : filteredMembers.map((m, i) => (
              <View key={m.username} style={[p.row, i % 2 === 0 && p.rowAlt]}>
                <Text style={[p.td, { flex: 0.4 }]}>{i + 1}</Text>
                <Text style={p.td} numberOfLines={1}>{m.username}</Text>
                <Text style={[p.td, { flex: 1.2 }]} numberOfLines={1}>{m.realName ?? '—'}</Text>
                <Text style={p.td} numberOfLines={1}>{m.studentId ?? '—'}</Text>
                <Text style={p.td} numberOfLines={1}>{m.phone ?? '—'}</Text>
                <Text style={p.td}>{m.emoji ?? '—'}</Text>
                <Text style={p.td} numberOfLines={1}>{fmtDate(m.createdAt)}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {tab === 'logs' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={p.tableHead}>
              {['#','사용자','감정','메모','기록일시(KST)'].map((h, i) => (
                <Text key={i} style={[p.th, i === 0 && { flex: 0.4 }, i === 3 && { flex: 2 }]}>{h}</Text>
              ))}
            </View>
            {filteredLogs.length === 0 ? (
              <Text style={p.empty}>기록이 없습니다.</Text>
            ) : filteredLogs.map((l, i) => (
              <View key={l.id ?? i} style={[p.row, i % 2 === 0 && p.rowAlt]}>
                <Text style={[p.td, { flex: 0.4 }]}>{i + 1}</Text>
                <Text style={p.td} numberOfLines={1}>{l.user_name}</Text>
                <Text style={p.td} numberOfLines={1}>{l.mood_label}</Text>
                <Text style={[p.td, { flex: 2, color: '#666' }]} numberOfLines={2}>{l.memo || '—'}</Text>
                <Text style={p.td} numberOfLines={2}>{fmtDate(l.logged_at)}</Text>
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
  wrap: {
    flex: 1, backgroundColor: '#F0F2F5',
    alignItems: 'center',
  },

  /* 로그인 */
  loginCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 36,
    alignItems: 'center', gap: 12, marginTop: 80,
    width: 380, ...SHADOW,
  },
  lockIcon:    { fontSize: 52 },
  loginTitle:  { fontSize: 22, fontWeight: '800', color: COLORS.text },
  loginSub:    { fontSize: 13, color: '#888', marginBottom: 8 },
  pinInput: {
    width: '100%', backgroundColor: '#F8F8F8', borderRadius: 12,
    padding: 16, fontSize: 20, textAlign: 'center', letterSpacing: 8,
    color: COLORS.text, borderWidth: 1, borderColor: '#E0E0E0',
  },
  errText: { fontSize: 13, color: '#C0392B' },
  loginBtn: {
    width: '100%', backgroundColor: COLORS.navy, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 13, color: '#888' },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
    width: '100%',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  headerSub:   { fontSize: 11, color: '#888' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.navyLight,
    justifyContent: 'center', alignItems: 'center',
  },
  exitBtn: {
    backgroundColor: '#EEE', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  exitBtnText: { fontSize: 13, color: '#555' },

  /* 통계 */
  statsRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
    width: '100%',
  },
  statChip: {
    flex: 1, backgroundColor: COLORS.navyLight, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
  },
  statNum:   { fontSize: 22, fontWeight: '800', color: COLORS.navy },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  /* 탭 */
  tabRow: {
    flexDirection: 'row', backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0', width: '100%',
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: COLORS.navy },
  tabText:       { fontSize: 13, color: '#888' },
  tabTextActive: { color: COLORS.navy, fontWeight: '700' },

  /* 도구 행 */
  toolRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#F8F8F8', borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
    width: '100%',
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

  /* 테이블 */
  tableHead: {
    flexDirection: 'row', backgroundColor: COLORS.navyLight,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    width: '100%',
  },
  th: { flex: 1, fontSize: 11, fontWeight: '700', color: COLORS.navy, paddingRight: 4 },
  row: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0', width: '100%',
  },
  rowAlt: { backgroundColor: '#FAFAFA' },
  td: { flex: 1, fontSize: 12, color: COLORS.text, paddingRight: 6 },
  empty: {
    textAlign: 'center', color: '#888', fontSize: 14, paddingTop: 60,
  },
});
