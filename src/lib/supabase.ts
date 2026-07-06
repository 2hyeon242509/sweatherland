import { createClient } from '@supabase/supabase-js';
import { UserProfile as AuthUserProfile } from '../types/auth';

export const SUPABASE_URL      = 'https://ifctmlafvrhbshdfrjxz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_GlOZZ9Bmg45GXDdmKM_58w_7k0HI3O4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── users 테이블 (친구 검색용) ────────────────────────────────────────────────

/** FriendScreen이 사용하는 users 테이블 프로필 */
export interface UserProfile {
  unique_id:     string;
  nickname:      string;
  char_id:       string;
  profile_emoji: string;
  status_msg:    string;
}

export interface MoodLog {
  id?: string;
  user_name:  string;
  mood_id:    string;
  mood_label: string;
  memo:       string;
  logged_at?: string;
}

/** 감정 기록 1건 저장 */
export async function saveMoodLog(log: Omit<MoodLog, 'id'>): Promise<void> {
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

/** 내 프로필 등록/업데이트 (users 테이블, 친구 검색용) */
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
  return (SUPABASE_URL as string) !== 'https://YOUR_PROJECT_ID.supabase.co';
}

// ── user_profiles 테이블 (회원가입/로그인) ────────────────────────────────────

export interface UserGameData {
  sweatPoints:        number;
  statusMsg:          string;
  statusMsgUpdatedAt: string;
  pinUpdatedAt:       string;
  friendCode:         string;
}

/** 2일 쿨다운 경과 여부 (true = 변경 가능) */
export function canChangeNow(updatedAt: string): boolean {
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() >= 2 * 24 * 3600 * 1000;
}

/** 변경 가능까지 남은 일수 */
export function daysUntilCanChange(updatedAt: string): number {
  if (!updatedAt) return 0;
  const ms = 2 * 24 * 3600 * 1000 - (Date.now() - new Date(updatedAt).getTime());
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 3600 * 1000));
}

function toRow(p: AuthUserProfile) {
  return {
    username:              p.username,
    pin:                   p.pin,
    emoji:                 p.emoji,
    real_name:             p.realName,
    student_id:            p.studentId,
    phone:                 p.phone,
    consent_date:          p.consentDate,
    created_at:            p.createdAt,
    friend_code:           p.friendCode ?? null,
    sweat_points:          0,
    status_msg:            '',
    status_msg_updated_at: '',
    pin_updated_at:        '',
  };
}

function fromRow(row: any): AuthUserProfile {
  return {
    username:    row.username,
    pin:         row.pin,
    emoji:       row.emoji,
    realName:    row.real_name    ?? '',
    studentId:   row.student_id   ?? '',
    phone:       row.phone        ?? '',
    consentDate: row.consent_date ?? '',
    createdAt:   row.created_at   ?? '',
    friendCode:  row.friend_code  ?? '',
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
export async function registerUserProfile(profile: AuthUserProfile): Promise<void> {
  const { error } = await supabase.from('user_profiles').insert([toRow(profile)]);
  if (error) throw error;
}

/** 로그인: username + pin 일치 여부 확인 후 프로필 반환 */
export async function loginUserProfile(
  username: string,
  pin: string,
): Promise<AuthUserProfile | null> {
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
export async function fetchAllUserProfiles(): Promise<AuthUserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

/** 로그인 후 게임 데이터 불러오기 */
export async function loadUserGameData(username: string): Promise<UserGameData | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('sweat_points, status_msg, status_msg_updated_at, pin_updated_at, friend_code')
    .eq('username', username)
    .maybeSingle();
  if (error || !data) return null;
  return {
    sweatPoints:        data.sweat_points          ?? 0,
    statusMsg:          data.status_msg             ?? '',
    statusMsgUpdatedAt: data.status_msg_updated_at  ?? '',
    pinUpdatedAt:       data.pin_updated_at          ?? '',
    friendCode:         data.friend_code             ?? '',
  };
}

/** 스웨트포인트 저장 */
export async function saveSweatPoints(username: string, points: number): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ sweat_points: points })
    .eq('username', username);
  if (error) throw error;
}

/** 상태메시지 저장 (쿨다운 타임스탬프 포함) */
export async function updateStatusMsg(username: string, msg: string): Promise<void> {
  const now = new Date(Date.now() + 9 * 3600 * 1000).toISOString();
  const { error } = await supabase
    .from('user_profiles')
    .update({ status_msg: msg, status_msg_updated_at: now })
    .eq('username', username);
  if (error) throw error;
}

/** PIN 변경 (쿨다운 타임스탬프 포함) */
export async function updateUserPin(username: string, newPin: string): Promise<void> {
  const now = new Date(Date.now() + 9 * 3600 * 1000).toISOString();
  const { error } = await supabase
    .from('user_profiles')
    .update({ pin: newPin, pin_updated_at: now })
    .eq('username', username);
  if (error) throw error;
}
