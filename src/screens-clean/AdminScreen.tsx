import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchAllMoodLogs, isSupabaseConfigured, MoodLog } from '../lib/supabase';
import { loadLocalLogs } from '../lib/localLogs';

/** 관리자 PIN — 운영 전 반드시 변경하세요 */
const ADMIN_PIN = '1234';

const isWeb = Platform.OS === 'web';

function formatDate(iso: string | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function downloadCSV(logs: MoodLog[]) {
  if (!isWeb) return;
  const BOM = '﻿';
  const header = ['번호', '사용자', '감정ID', '감정', '메모', '기록일시'].join(',');
  const rows = logs.map((l, i) =>
    [
      i + 1,
      `"${l.user_name}"`,
      l.mood_id,
      l.mood_label,
      `"${(l.memo ?? '').replace(/"/g, '""')}"`,
      `"${formatDate(l.logged_at)}"`,
    ].join(','),
  );
  const csv = BOM + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `mood_logs_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminScreen() {
  const navigation = useNavigation();
  const [pin,            setPin]            = useState('');
  const [authed,         setAuthed]         = useState(false);
  const [notConfigured,  setNotConfigured]  = useState(false);
  const [logs,           setLogs]           = useState<MoodLog[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [filter,         setFilter]         = useState('');

  const handlePinSubmit = async () => {
    if (pin !== ADMIN_PIN) {
      setError('PIN이 올바르지 않아요.');
      setPin('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (!isSupabaseConfigured()) {
        const data = await loadLocalLogs();
        setNotConfigured(true);
        setLogs(data);
      } else {
        const data = await fetchAllMoodLogs();
        setLogs(data);
      }
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
    } catch (e: any) {
      setError('새로고침 실패: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter.trim()
    ? logs.filter(l =>
        l.user_name.includes(filter) ||
        l.mood_label.includes(filter) ||
        (l.memo ?? '').includes(filter),
      )
    : logs;

  // ── PIN 화면 ────────────────────────────────────────────────
  if (!authed) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <Text style={s.title}>관리자 패널</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.pinWrap}>
          <Text style={s.pinIcon}>🔒</Text>
          <Text style={s.pinTitle}>관리자 전용</Text>
          <Text style={s.pinSub}>PIN을 입력해 접속하세요</Text>

          <TextInput
            style={s.pinInput}
            value={pin}
            onChangeText={setPin}
            placeholder="● ● ● ●"
            placeholderTextColor="#AAAAAA"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={8}
            returnKeyType="done"
            onSubmitEditing={handlePinSubmit}
          />
          {error ? <Text style={s.errText}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.pinBtn, loading && { opacity: 0.6 }]}
            onPress={handlePinSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.pinBtnText}>접속하기</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 데이터 화면 ─────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>감정 기록 관리</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.iconBtn} onPress={handleRefresh} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color="#5C9E4A" />
              : <Text>🔄</Text>
            }
          </TouchableOpacity>
          {isWeb && (
            <TouchableOpacity style={s.csvBtn} onPress={() => downloadCSV(filtered)}>
              <Text style={s.csvBtnText}>📥 엑셀</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Supabase 미설정 안내 */}
      {notConfigured && (
        <View style={s.demoBanner}>
          <Text style={s.demoBannerText}>
            ⚠️ Supabase 미연결 — src/lib/supabase.ts 에 URL과 KEY를 입력하면 실제 데이터가 저장됩니다
          </Text>
        </View>
      )}

      {/* 통계 */}
      <View style={s.statsRow}>
        <View style={s.statChip}>
          <Text style={s.statNum}>{logs.length}</Text>
          <Text style={s.statLabel}>전체 기록</Text>
        </View>
        <View style={s.statChip}>
          <Text style={s.statNum}>{new Set(logs.map(l => l.user_name)).size}</Text>
          <Text style={s.statLabel}>사용자 수</Text>
        </View>
        <View style={s.statChip}>
          <Text style={s.statNum}>{new Set(logs.map(l => l.logged_at?.slice(0, 10))).size}</Text>
          <Text style={s.statLabel}>기록일 수</Text>
        </View>
      </View>

      {/* 검색 필터 */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="🔍 사용자명 / 감정 / 메모 검색"
          placeholderTextColor="#AAAAAA"
          value={filter}
          onChangeText={setFilter}
        />
      </View>

      {/* 컬럼 헤더 */}
      <View style={s.tableHeader}>
        <Text style={[s.colHead, { flex: 1.2 }]}>사용자</Text>
        <Text style={[s.colHead, { flex: 0.8 }]}>감정</Text>
        <Text style={[s.colHead, { flex: 2 }]}>메모</Text>
        <Text style={[s.colHead, { flex: 1.2 }]}>기록일시</Text>
      </View>

      {/* 데이터 행 */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id ?? Math.random().toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyText}>기록이 없습니다.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[s.row, index % 2 === 0 && s.rowAlt]}>
            <Text style={[s.cell, { flex: 1.2 }]} numberOfLines={1}>{item.user_name}</Text>
            <Text style={[s.cell, { flex: 0.8 }]} numberOfLines={1}>{item.mood_label}</Text>
            <Text style={[s.cell, { flex: 2, color: '#888888' }]} numberOfLines={2}>{item.memo || '—'}</Text>
            <Text style={[s.cell, { flex: 1.2, fontSize: 10 }]} numberOfLines={2}>{formatDate(item.logged_at)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FEFAE6' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  backBtn:  { width: 40, justifyContent: 'center' },
  backText: { fontSize: 22 },
  title:    { fontSize: 17, fontWeight: '700', color: '#3D3224' },
  iconBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  csvBtn:   { backgroundColor: '#5C9E4A', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 },
  csvBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  pinWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  pinIcon:  { fontSize: 52, marginBottom: 4 },
  pinTitle: { fontSize: 20, fontWeight: '800', color: '#3D3224' },
  pinSub:   { fontSize: 13, color: '#888888', marginBottom: 8 },
  pinInput: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, fontSize: 20, textAlign: 'center', letterSpacing: 8, color: '#3D3224',
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  errText:  { fontSize: 13, color: '#FF6B6B', marginTop: 4 },
  pinBtn:   { width: '100%', backgroundColor: '#5C9E4A', borderRadius: 9999, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  pinBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  demoBanner: {
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D',
    borderRadius: 10, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  demoBannerText: { fontSize: 11, color: '#B45309', lineHeight: 16 },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  statChip: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EEEEEE' },
  statNum:  { fontSize: 20, fontWeight: '800', color: '#5C9E4A' },
  statLabel:{ fontSize: 10, color: '#888888', marginTop: 2 },

  searchRow:   { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#3D3224', borderWidth: 1, borderColor: '#EEEEEE' },

  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#EDF5E8', borderRadius: 8, marginHorizontal: 16, marginBottom: 4,
  },
  colHead: { fontSize: 11, fontWeight: '700', color: '#5C9E4A' },
  row:     { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', alignItems: 'flex-start' },
  rowAlt:  { backgroundColor: '#FAFAF6' },
  cell:    { fontSize: 12, color: '#3D3224', paddingRight: 4 },

  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#888888' },
});
