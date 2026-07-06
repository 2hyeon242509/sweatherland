/**
 * Vercel 서버리스 함수 — Gemini Vision으로 피트니스 스크린샷 분석
 * 환경변수: GEMINI_API_KEY (Vercel 대시보드 → Settings → Environment Variables)
 */

const MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
];

const PROMPT = `You are a fitness data extractor. Analyze this smartphone fitness/health app screenshot and extract numeric data.

Return ONLY a valid JSON object — no markdown, no code blocks, no explanations.

JSON format:
{"steps": <integer or null>, "exerciseMinutes": <integer or null>, "distance": <float km or null>, "calories": <integer or null>}

Rules:
- "steps": total step count today (e.g. 8432, not 8,432). Look for "걸음", "steps", "歩数" etc.
- "distance": running/walking distance in km (convert miles to km if needed). Look for "km", "mi", "킬로", "거리" etc.
- "exerciseMinutes": total active/exercise minutes. Look for "분", "min", "minutes" etc.
- "calories": calories burned (kcal). Look for "kcal", "cal", "칼로리" etc.
- Remove thousand separators: "8,432" → 8432
- If a field is not visible, use null
- Never guess — only extract numbers clearly shown in the image`;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: '이미지가 없어요.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY 환경변수가 설정되지 않았어요.',
      detail: 'Vercel 대시보드 → Settings → Environment Variables에서 GEMINI_API_KEY를 추가해주세요.',
    });
  }

  const imageMime = mimeType || 'image/jpeg';

  let lastError = '';
  for (const model of MODELS) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: PROMPT },
                { inlineData: { mimeType: imageMime, data: imageBase64 } },
              ],
            }],
            generationConfig: {
              temperature:     0,
              maxOutputTokens: 256,
              responseMimeType: 'application/json',
            },
          }),
        },
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        lastError = `${model}: ${geminiRes.status} ${errText.slice(0, 200)}`;
        console.error('[Gemini]', lastError);
        continue; // 다음 모델 시도
      }

      const data    = await geminiRes.json();
      const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      // JSON 파싱 — 코드블록, 앞뒤 텍스트 모두 제거
      const cleaned = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // { ... } 블록 추출 (가장 바깥 JSON)
      const start = cleaned.indexOf('{');
      const end   = cleaned.lastIndexOf('}');
      if (start === -1 || end === -1) {
        lastError = `${model}: JSON 없음 — "${rawText.slice(0, 100)}"`;
        continue;
      }

      const jsonStr = cleaned.slice(start, end + 1);
      let result: any;
      try {
        result = JSON.parse(jsonStr);
      } catch {
        lastError = `${model}: JSON 파싱 실패 — "${jsonStr.slice(0, 100)}"`;
        continue;
      }

      // 숫자 타입 보정
      const steps    = typeof result.steps           === 'number' ? Math.round(result.steps)           : null;
      const distance = typeof result.distance        === 'number' ? Math.round(result.distance * 10) / 10 : null;
      const minutes  = typeof result.exerciseMinutes === 'number' ? Math.round(result.exerciseMinutes) : null;
      const calories = typeof result.calories        === 'number' ? Math.round(result.calories)        : null;

      return res.json({ steps, distance, exerciseMinutes: minutes, calories });

    } catch (e: any) {
      lastError = `${model}: ${e.message}`;
      console.error('[Gemini fetch error]', lastError);
    }
  }

  return res.status(502).json({
    error: '이미지에서 운동 데이터를 읽지 못했어요.',
    detail: lastError,
  });
}
