import { createClient } from '@supabase/supabase-js';

/**
 * 🔑 Supabase 연결 설정
 *  1. https://app.supabase.com 에서 프로젝트 생성
 *  2. Settings → API 에서 Project URL / anon key 복사
 *  3. 아래 두 값을 교체하세요
 *
 *  📋 Supabase 에서 실행할 테이블 생성 SQL:
 * ────────────────────────────────────────
 * CREATE TABLE mood_logs (
 *   id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_name   TEXT        NOT NULL DEFAULT '익명',
 *   mood_id     TEXT        NOT NULL,
 *   mood_label  TEXT        NOT NULL,
 *   memo        TEXT        DEFAULT '',
 *   logged_at   TIMESTAMPTZ DEFAULT NOW()
 * );
 * -- 익명 삽입 허용 (앱 사용자)
 * ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "anon_insert" ON mood_logs FOR INSERT WITH CHECK (true);
 * CREATE POLICY "anon_select" ON mood_logs FOR SELECT USING (true);
 * ────────────────────────────────────────
 */
export const SUPABASE_URL = 'https://ifctmlafvrhbshdfrjxz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_GlOZZ9Bmg45GXDdmKM_58w_7k0HI3O4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  unique_id:     string;   // '#0000' 형식
  nickname:      string;
  char_id:       string;   // 선택된 캐릭터 ID
  profile_emoji: string;   // 프로필 이모지
  status_msg:    string;   // 상태메시지
}

export interface MoodLog {
  id?: string;
  user_name: string;
  mood_id: string;
  mood_label: string;
  memo: string;
  logged_at?: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

/** 감정 기록 1건 저장 (앱 → DB) */
export async function saveMoodLog(
  log: Omit<MoodLog, 'id'>,
): Promise<void> {
  const { error } = await supabase.from('mood_logs').insert([log]);
  if (error) throw error;
}

/** 전체 감정 기록 조회 (관리자용) */
export async function fetchAllMoodLogs(): Promise<MoodLog[]> {
  const { data, error } = await supabase
    .from('mood_logs')
    .select('*')
    .order('logged_at', { ascending: false });
  if (error) throw error;
  return (data as MoodLog[]) ?? [];
}

/** 내 프로필 등록/업데이트 (upsert) */
export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase
    .from('users')
    .upsert([profile], { onConflict: 'unique_id' });
  if (error) throw error;
}

/** 고유 ID로 유저 검색 */
export async function searchUserById(uniqueId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('unique_id', uniqueId)
    .maybeSingle();
  if (error || !data) return null;
  return data as UserProfile;
}

/** Supabase 연결 여부 확인 */
export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co' &&
    SUPABASE_ANON_KEY !== 'YOUR_ANON_PUBLIC_KEY'
  );
}

// ── 회원 관리 (user_profiles 테이블) ─────────────────────────────────────────

import { UserProfile } from '../types/auth';

function toRow(p: UserProfile) {
  return {
    username:     p.username,
    pin:          p.pin,
    emoji:        p.emoji,
    real_name:    p.realName,
    student_id:   p.studentId,
    phone:        p.phone,
    consent_date: p.consentDate,
    created_at:   p.createdAt,
  };
}

function fromRow(row: any): UserProfile {
  return {
    username:    row.username,
    pin:         row.pin,
    emoji:       row.emoji,
    realName:    row.real_name   ?? '',
    studentId:   row.student_id  ?? '',
    phone:       row.phone       ?? '',
    consentDate: row.consent_date ?? '',
    createdAt:   row.created_at  ?? '',
  };
}

/** 아이디 중복 확인 */
export async function checkUsernameExists(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();
  return !!data;
}

/** 회원 가입 */
export async function registerUserProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase.from('user_profiles').insert([toRow(profile)]);
  if (error) throw error;
}

/** 로그인: username + pin 일치 여부 확인 후 프로필 반환 */
export async function loginUserProfile(
  username: string,
  pin: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  if (error || !data) return null;
  if (data.pin !== pin) return null;
  return fromRow(data);
}

/** 전체 회원 목록 (관리자용) */
export async function fetchAllUserProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}
