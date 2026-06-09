import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW } from '../constants';
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
  if (!isWeb) {
    Alert.alert('웹에서 이용하세요', '엑셀 다운로드는 웹 브라우저에서 사용할 수 있어요.');
    return;
  }
  const BOM = '﻿'; // Korean 한글 깨짐 방지
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mood_logs_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminScreen() {
  const navigation = useNavigation();
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

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
        // Supabase 미설정 → 로컬 저장소에서 불러오기
        const data = await loadLocalLogs();
        setNotConfigured(true);
        setLogs(data);
      } else {
        // Supabase 연결 → 클라우드 DB에서 불러오기
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

  const filtered = filter.trim()
    ? logs.filter(
        l =>
          l.user_name.includes(filter) ||
          l.mood_label.includes(filter) ||
          (l.memo ?? '').includes(filter),
      )
    : logs;

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

  // ── PIN Screen ──────────────────────────────────────────────────────────────
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
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.pinBtnText}>접속하기</Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Data Screen ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.outerWrap}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>감정 기록 관리</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={handleRefresh}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator size="small" color={COLORS.green} />
                : <Ionicons name="refresh" size={18} color={COLORS.green} />
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dlBtn}
              onPress={() => downloadCSV(filtered)}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={16} color="#FFF" />
              <Text style={styles.dlBtnText}>엑셀</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Supabase 미설정 안내 배너 */}
        {notConfigured && (
          <View style={styles.demoBanner}>
            <Ionicons name="alert-circle-outline" size={14} color="#B45309" />
            <Text style={styles.demoBannerText}>
              Supabase 미연결 — src/lib/supabase.ts 에 URL과 KEY를 입력하면 실제 데이터가 저장됩니다
            </Text>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statNum}>{logs.length}</Text>
            <Text style={styles.statLabel}>전체 기록</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statNum}>
              {new Set(logs.map(l => l.user_name)).size}
            </Text>
            <Text style={styles.statLabel}>사용자 수</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statNum}>
              {new Set(logs.map(l => l.logged_at?.slice(0, 10))).size}
            </Text>
            <Text style={styles.statLabel}>기록일 수</Text>
          </View>
        </View>

        {/* Search filter */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="사용자명 / 감정 / 메모 검색"
            placeholderTextColor={COLORS.textMuted}
            value={filter}
            onChangeText={setFilter}
          />
        </View>

        {/* Column header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colHead, { flex: 1.2 }]}>사용자</Text>
          <Text style={[styles.colHead, { flex: 0.8 }]}>감정</Text>
          <Text style={[styles.colHead, { flex: 2 }]}>메모</Text>
          <Text style={[styles.colHead, { flex: 1.2 }]}>기록일시</Text>
        </View>

        {/* Rows */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.id ?? Math.random().toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>기록이 없습니다.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={[styles.row, index % 2 === 0 && styles.rowAlt]}>
              <Text style={[styles.cell, { flex: 1.2 }]} numberOfLines={1}>
                {item.user_name}
              </Text>
              <Text style={[styles.cell, { flex: 0.8 }]} numberOfLines={1}>
                {item.mood_label}
              </Text>
              <Text style={[styles.cell, { flex: 2, color: COLORS.textMuted }]} numberOfLines={2}>
                {item.memo || '—'}
              </Text>
              <Text style={[styles.cell, { flex: 1.2, fontSize: 10 }]} numberOfLines={2}>
                {formatDate(item.logged_at)}
              </Text>
            </View>
          )}
        />
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

  // ── Header ──────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  iconBtn: { width: 36, height: 36, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 9999,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.green,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dlBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  // ── PIN screen ───────────────────────────────────────────────────
  pinWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  pinIcon: { fontSize: 52, marginBottom: 4 },
  pinTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  pinSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  pinInput: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 8,
    color: COLORS.text,
    ...SHADOW,
  },
  errText: { fontSize: 13, color: COLORS.heartRed, marginTop: 4 },
  pinBtn: {
    width: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...SHADOW,
  },
  pinBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // ── Stats ────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statChip: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    ...SHADOW,
  },
  statNum: { fontSize: 20, fontWeight: '800', color: COLORS.green },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  // ── Demo Banner ──────────────────────────────────────────────────
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  demoBannerText: { fontSize: 11, color: '#B45309', flex: 1, lineHeight: 16 },

  // ── Search ───────────────────────────────────────────────────────
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    ...SHADOW,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text },

  // ── Table ────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.greenLight,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  colHead: { fontSize: 11, fontWeight: '700', color: COLORS.green },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'flex-start',
  },
  rowAlt: { backgroundColor: '#FAFAF6' },
  cell: { fontSize: 12, color: COLORS.text, paddingRight: 4 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
