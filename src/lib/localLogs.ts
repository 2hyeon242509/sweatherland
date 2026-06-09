/**
 * 로컬 기기 저장소 — Supabase 미연결 시 감정 기록을 AsyncStorage에 저장
 * Supabase 연결 후에는 클라우드 DB가 우선 사용됩니다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodLog } from './supabase';

const STORAGE_KEY = '@sweatherland_mood_logs';

/** 기록 1건 추가 */
export async function saveLocalLog(
  log: Omit<MoodLog, 'id' | 'logged_at'>,
): Promise<void> {
  const existing = await loadLocalLogs();
  const newEntry: MoodLog = {
    ...log,
    id: Date.now().toString(),
    logged_at: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([newEntry, ...existing]));
}

/** 전체 기록 불러오기 */
export async function loadLocalLogs(): Promise<MoodLog[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MoodLog[]) : [];
  } catch {
    return [];
  }
}

/**
 * 특정 연·월의 기록을 날짜별로 묶어 반환 (KST 기준)
 * 하루에 여러 건이 있으면 가장 최근 1건만 반환 (로그는 newest-first 저장)
 * @returns { 'YYYY-MM-DD': MoodLog }
 */
export async function loadLogsByMonth(
  year: number,
  month: number,
): Promise<Record<string, MoodLog>> {
  const all = await loadLocalLogs();
  const result: Record<string, MoodLog> = {};

  for (const log of all) {
    if (!log.logged_at) continue;
    // logged_at 은 UTC ISO 문자열 → KST 변환
    const kstMs  = new Date(log.logged_at).getTime() + 9 * 3600 * 1000;
    const kstStr = new Date(kstMs).toISOString().slice(0, 10); // YYYY-MM-DD
    const [y, m] = kstStr.split('-').map(Number);
    if (y !== year || m !== month) continue;
    // 첫 번째로 만나는 항목 = 가장 최근 (newest-first)
    if (!result[kstStr]) result[kstStr] = log;
  }

  return result;
}
