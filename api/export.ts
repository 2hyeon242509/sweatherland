/**
 * Vercel 서버리스 함수 — Supabase 데이터를 CSV로 반환
 * Google Sheets에서 =IMPORTDATA("https://도메인/api/export?table=members&key=비밀키") 로 사용
 * 환경변수: EXPORT_SECRET (없으면 인증 없이 공개)
 */

const TABLE_QUERIES: Record<string, string> = {
  members:  'user_profiles?select=username,real_name,student_id,phone,emoji,created_at,friend_code,sweat_points&order=created_at.desc',
  moods:    'mood_logs?select=user_name,mood_id,mood_label,memo,logged_at&order=logged_at.desc',
  missions: 'mission_logs?select=username,mission_label,mission_type,points,stat,logged_at&order=logged_at.desc',
  daily:    'daily_records?select=username,record_date,all_missions_done,energy_100,missions_completed&order=record_date.desc',
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).send('Method not allowed');

  // EXPORT_SECRET 이 설정된 경우에만 key 검증
  const exportSecret = process.env.EXPORT_SECRET;
  if (exportSecret && req.query.key !== exportSecret) {
    return res.status(401).send('Unauthorized: ?key= 파라미터가 올바르지 않아요.');
  }

  const table = req.query.table as string;
  if (!TABLE_QUERIES[table]) {
    return res.status(400).send('table 파라미터는 members, moods, missions, daily 중 하나여야 해요.');
  }

  const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://ifctmlafvrhbshdfrjxz.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? 'sb_publishable_GlOZZ9Bmg45GXDdmKM_58w_7k0HI3O4';

  try {
    const url = `${SUPABASE_URL}/rest/v1/${TABLE_QUERIES[table]}`;
    const sbRes = await fetch(url, {
      headers: {
        apikey:          SUPABASE_KEY,
        Authorization:   `Bearer ${SUPABASE_KEY}`,
        Accept:          'text/csv',
      },
    });

    if (!sbRes.ok) {
      const errText = await sbRes.text();
      return res.status(502).send(`Supabase 오류: ${sbRes.status} ${errText.slice(0, 200)}`);
    }

    const csv = await sbRes.text();
    const BOM = '﻿'; // Excel 한글 깨짐 방지

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sweatherland_${table}.csv"`);
    return res.send(BOM + csv);
  } catch (e: any) {
    return res.status(500).send(e.message);
  }
}
