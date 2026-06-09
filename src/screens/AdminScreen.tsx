import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW } from '../constants';
import { fetchAllMoodLogs, isSupabaseConfigured, MoodLog } from '../lib/supabase';
import { loadLocalLogs } from '../lib/localLogs';
import { UserProfile } from '../types/auth';

/** 관리자 PIN */
const ADMIN_PIN = '9999'; // ← 반드시 변경하세요

const isWeb = Platform.OS === 'web';

/** ISO 시각 → KST 형식 (YYYY-MM-DD HH:mm) */
function fmtKST(iso: string | undefined) {
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
  if (!isWeb) {
    Alert.alert('웹에서 이용하세요', 'CSV 다운로드는 웹 브라우저에서 사용할 수 있어요.');
    return;
  }
  const BOM = '﻿';
  const lines = [
    header.join(','),
    ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')),
  ];
  const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

type Tab = 'logs' | 'members';

export default function AdminScreen() {
  const navigation = useNavigation();
  const [pin,            setPin]           = useState('');
  const [authed,         setAuthed]        = useState(false);
  const [tab,            setTab]           = useState<Tab>('logs');
  const [notConfigured,  setNotConfigured] = useState(false);
  const [logs,           setLogs]          = useState<MoodLog[]>([]);
  const [members,        setMembers]       = useState<UserProfile[]>([]);
  const [loading,        setLoading]       = useState(false);
  const [error,          setError]         = useState('');
  const [filter,         setFilter]        = useState('');

  const handlePinSubmit = async () => {
    if (pin !== ADMIN_PIN) { setError('PIN이 올바르지 않아요.'); setPin(''); return; }
    setLoading(true);
    setError('');
    try {
      /* 감정 기록 */
      if (!isSupabaseConfigured()) {
        const data = await loadLocalLogs();
        setNotConfigured(true);
        setLogs(data);
      } else {
        const data = await fetchAllMoodLogs();
        setLogs(data);
      }
      /* 회원 명단 */
      const rawMembers = await AsyncStorage.getItem('@user_profiles');
      setMembers(rawMembers ? JSON.parse(rawMembers) : []);
      setAuthed(true);
    } catch (e: any) {
      setError('데이터 불러오기 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        const data = await loadLocalLogs();
        setLogs(data);
      } else {
        const data = await fetchAllMoodLogs();
        setLogs(data);
      }
      const rawMembers = await AsyncStorage.getItem('@user_profiles');
      setMembers(rawMembers ? JSON.parse(rawMembers) : []);
    } catch (e: any) {
      setError('새로고침 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const q = filter.trim().toLowerCase();

  const filteredLogs = q
    ? logs.filter(l =>
        l.user_name?.toLowerCase().includes(q) ||
        l.mood_label?.toLowerCase().includes(q) ||
        (l.memo ?? '').toLowerCase().includes(q))
    : logs;

  const filteredMembers = q
    ? members.filter(m =>
        m.username?.toLowerCase().includes(q) ||
        m.realName?.toLowerCase().includes(q) ||
        m.studentId?.includes(q) ||
        m.phone?.includes(q))
    : members;

  /* ── PIN 화면 ──────────────────────────────────────────────── */
  if (!authed) {
    return (
      <View style={styles.outerWrap}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>관리자 패널</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.pinWrap}>
            <Text style={styles.pinIcon}>🔒</Text>
            <Text style={styles.pinTitle}>관리자 전용</Text>
            <Text style={styles.pinSub}>PIN을 입력해 접속하세요</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              placeholder="● ● ● ●"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={8}
              returnKeyType="done"
              onSubmitEditing={handlePinSubmit}
            />
            {error ? <Text style={styles.errText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.pinBtn, loading && { opacity: 0.6 }]}
              onPress={handlePinSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.pinBtnText}>접속하기</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  /* ── 데이터 화면 ────────────────────────────────────────────── */
  return (
    <View style={styles.outerWrap}>
      <SafeAreaView style={styles.safe}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {tab === 'logs' ? '감정 기록 관리' : '회원 명단'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={loading} activeOpacity={0.8}>
              {loading
                ? <ActivityIndicator size="small" color={COLORS.green} />
                : <Ionicons name="refresh" size={18} color={COLORS.green} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dlBtn}
              onPress={() => {
                if (tab === 'logs') {
                  downloadCSV(
                    `moodlogs_${new Date().toISOString().slice(0,10)}.csv`,
                    ['번호','사용자','감정ID','감정','메모','기록일시(KST)'],
                    filteredLogs.map((l, i) => [
                      String(i+1), l.user_name, l.mood_id,
                      l.mood_label, l.memo ?? '', fmtKST(l.logged_at),
                    ]),
                  );
                } else {
                  downloadCSV(
                    `members_${new Date().toISOString().slice(0,10)}.csv`,
                    ['번호','아이디','본명','학번','전화번호','이모지','가입일시','동의일시'],
                    filteredMembers.map((m, i) => [
                      String(i+1), m.username, m.realName ?? '',
                      m.studentId ?? '', m.phone ?? '', m.emoji ?? '',
                      fmtKST(m.createdAt), fmtKST(m.consentDate),
                    ]),
                  );
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={16} color="#FFF" />
              <Text style={styles.dlBtnText}>CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Supabase 미설정 안내 */}
        {notConfigured && (
          <View style={styles.demoBanner}>
            <Ionicons name="alert-circle-outline" size={14} color="#B45309" />
            <Text style={styles.demoBannerText}>
              Supabase 미연결 — 로컬 저장 데이터를 표시 중입니다
            </Text>
          </View>
        )}

        {/* 탭 */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'logs' && styles.tabBtnActive]}
            onPress={() => { setTab('logs'); setFilter(''); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === 'logs' && styles.tabTextActive]}>
              📔 감정 기록 ({logs.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'members' && styles.tabBtnActive]}
            onPress={() => { setTab('members'); setFilter(''); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === 'members' && styles.tabTextActive]}>
              👥 회원 명단 ({members.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 통계 */}
        <View style={styles.statsRow}>
          {tab === 'logs' ? (
            <>
              <StatChip value={logs.length}  label="전체 기록" />
              <StatChip value={new Set(logs.map(l => l.user_name)).size} label="사용자 수" />
              <StatChip value={new Set(logs.map(l => l.logged_at?.slice(0,10))).size} label="기록일 수" />
            </>
          ) : (
            <>
              <StatChip value={members.length} label="총 회원" />
              <StatChip value={members.filter(m => m.consentDate).length} label="동의 완료" />
            </>
          )}
        </View>

        {/* 검색 */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={tab === 'logs' ? '사용자명 / 감정 / 메모' : '아이디 / 본명 / 학번'}
            placeholderTextColor={COLORS.textMuted}
            value={filter}
            onChangeText={setFilter}
          />
        </View>

        {/* ── 감정 기록 테이블 ──────────────────────────── */}
        {tab === 'logs' && (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.colHead, { flex: 1.1 }]}>사용자</Text>
              <Text style={[styles.colHead, { flex: 0.9 }]}>감정</Text>
              <Text style={[styles.colHead, { flex: 2   }]}>메모</Text>
              <Text style={[styles.colHead, { flex: 1.3 }]}>기록일시(KST)</Text>
            </View>
            <FlatList
              data={filteredLogs}
              keyExtractor={item => item.id ?? Math.random().toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={styles.emptyWrap}><Text style={styles.emptyText}>기록이 없습니다.</Text></View>}
              renderItem={({ item, index }) => (
                <View style={[styles.row, index % 2 === 0 && styles.rowAlt]}>
                  <Text style={[styles.cell, { flex: 1.1 }]} numberOfLines={1}>{item.user_name}</Text>
                  <Text style={[styles.cell, { flex: 0.9 }]} numberOfLines={1}>{item.mood_label}</Text>
                  <Text style={[styles.cell, { flex: 2, color: COLORS.textMuted }]} numberOfLines={2}>{item.memo || '—'}</Text>
                  <Text style={[styles.cell, { flex: 1.3, fontSize: 10 }]} numberOfLines={2}>{fmtKST(item.logged_at)}</Text>
                </View>
              )}
            />
          </>
        )}

        {/* ── 회원 명단 테이블 ──────────────────────────── */}
        {tab === 'members' && (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.colHead, { flex: 1 }]}>아이디</Text>
              <Text style={[styles.colHead, { flex: 1 }]}>본명</Text>
              <Text style={[styles.colHead, { flex: 1 }]}>학번</Text>
              <Text style={[styles.colHead, { flex: 1 }]}>전화번호</Text>
              <Text style={[styles.colHead, { flex: 1.2 }]}>가입일시</Text>
            </View>
            <FlatList
              data={filteredMembers}
              keyExtractor={item => item.username}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={styles.emptyWrap}><Text style={styles.emptyText}>회원이 없습니다.</Text></View>}
              renderItem={({ item, index }) => (
                <View style={[styles.row, index % 2 === 0 && styles.rowAlt]}>
                  <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>{item.username}</Text>
                  <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>{item.realName ?? '—'}</Text>
                  <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>{item.studentId ?? '—'}</Text>
                  <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>{item.phone ?? '—'}</Text>
                  <Text style={[styles.cell, { flex: 1.2, fontSize: 10 }]} numberOfLines={2}>{fmtKST(item.createdAt)}</Text>
                </View>
              )}
            />
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

function StatChip({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: isWeb ? COLORS.yellow : COLORS.bg,
    alignItems: isWeb ? 'center' : 'stretch',
  },
  safe: { flex: 1, backgroundColor: COLORS.bg, width: isWeb ? 390 : '100%' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  iconBtn:    { width: 36, height: 36, justifyContent: 'center' },
  title:      { fontSize: 17, fontWeight: '700', color: COLORS.text },
  refreshBtn: {
    width: 34, height: 34, borderRadius: 9999,
    backgroundColor: COLORS.greenLight, justifyContent: 'center', alignItems: 'center',
  },
  dlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.green, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6,
  },
  dlBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  /* 탭 */
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: COLORS.navy },
  tabText:      { fontSize: 12, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.navy, fontWeight: '700' },

  /* PIN */
  pinWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  pinIcon:  { fontSize: 52, marginBottom: 4 },
  pinTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  pinSub:   { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  pinInput: {
    width: '100%', backgroundColor: COLORS.card, borderRadius: 16,
    padding: 16, fontSize: 20, textAlign: 'center', letterSpacing: 8, color: COLORS.text, ...SHADOW,
  },
  errText: { fontSize: 13, color: COLORS.heartRed, marginTop: 4 },
  pinBtn: {
    width: '100%', backgroundColor: COLORS.green, borderRadius: 9999,
    paddingVertical: 16, alignItems: 'center', marginTop: 8, ...SHADOW,
  },
  pinBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  /* 통계 */
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginVertical: 10 },
  statChip: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14,
    paddingVertical: 10, alignItems: 'center', ...SHADOW,
  },
  statNum:   { fontSize: 20, fontWeight: '800', color: COLORS.green },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  /* 배너 */
  demoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7',
    borderWidth: 1, borderColor: '#FCD34D', borderRadius: 10,
    marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  demoBannerText: { fontSize: 11, color: '#B45309', flex: 1, lineHeight: 16 },

  /* 검색 */
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 8, ...SHADOW,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text },

  /* 테이블 */
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: COLORS.greenLight, borderRadius: 8, marginHorizontal: 16, marginBottom: 4,
  },
  colHead: { fontSize: 11, fontWeight: '700', color: COLORS.green },
  row: {
    flexDirection: 'row', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'flex-start',
  },
  rowAlt:    { backgroundColor: '#FAFAF6' },
  cell:      { fontSize: 12, color: COLORS.text, paddingRight: 4 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
