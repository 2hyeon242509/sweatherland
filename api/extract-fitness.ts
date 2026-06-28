/**
 * Vercel 서버리스 함수 — Gemini Vision으로 피트니스 스크린샷 분석
 * 환경변수: GEMINI_API_KEY (Vercel 대시보드 → Settings → Environment Variables)
 */
export default async function handler(req: any, res: any) {
  // CORS (같은 도메인에서만 쓰므로 최소 설정)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: '이미지가 없어요.' });
  const imageMime = mimeType || 'image/jpeg';

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았어요.' });

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `이 이미지는 스마트폰 피트니스/건강 앱 스크린샷입니다.
이미지에서 운동 데이터를 추출하여 JSON만 반환하세요 (설명 없이, 코드블록 없이).

반환 형식:
{"steps": <걸음수 정수 또는 null>, "exerciseMinutes": <운동시간 분 정수 또는 null>, "distance": <거리 km 소수 또는 null>, "calories": <칼로리 정수 또는 null>}

규칙:
- 천 단위 구분자 제거: "8,432" → 8432
- 없는 항목은 null
- 숫자만, 단위 제외`
              },
              {
                inlineData: {
                  mimeType: imageMime,
                  data: imageBase64,
                }
              }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ error: 'Gemini API 오류', detail: errText });
    }

    const data    = await geminiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match   = rawText.match(/\{[\s\S]*?\}/);

    if (!match) {
      return res.status(422).json({ error: '운동 데이터를 찾지 못했어요.', raw: rawText });
    }

    const result = JSON.parse(match[0]);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
