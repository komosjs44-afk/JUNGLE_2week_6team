// ============================================================
// RE:FRAME — AI 촬영 가이드 Edge Function
// 사진 한 장 + 알려진 촬영 정보(있는 것만)를 받아, 일반 사용자가 바로 실행할 수 있는
// "따라 찍기" 가이드를 구조화된 JSON으로 반환한다.
// 키(GEMINI_API_KEY)는 서버 시크릿이라 브라우저에 절대 노출되지 않는다.
// analyze-photo/index.ts와 동일한 골격(CORS·시크릿·에러 처리)을 재사용한다.
//
// 배포:  supabase functions deploy shooting-guide
// 시크릿: GEMINI_API_KEY/GEMINI_MODEL — analyze-photo와 동일한 시크릿을 그대로 씀(새로 만들 필요 없음)
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 이미지 URL → base64 (Gemini inline_data 용)
async function toBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`이미지 로드 실패: ${res.status}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
  return btoa(bin)
}

const PROMPT = `너는 전문 카메라 데이터를 설명하는 AI가 아니라, 사진 촬영 경험이 많지 않은 일반 사용자가
레퍼런스 사진을 최대한 비슷하게 다시 촬영할 수 있도록 실행 가능한 방법을 알려주는 촬영 가이드다.

이미지 한 장과, 이 사진에 대해 실제로 알려진 정보(JSON)가 함께 주어진다.

규칙(반드시 지킬 것):
1. 전문 용어나 숫자를 그대로 반복하지 말고 일반적인 행동으로 바꿔서 설명해라.
   예) "방위각 270도" → "서쪽 방향으로 촬영된 사진이에요"
       "초점거리 6.76mm" → "초광각으로 촬영된 사진이에요. 스마트폰에서 가장 넓은 화각을 사용해보세요"
       "촬영 시각 19:44" → "해질녘에 촬영된 사진이에요. 일몰 전후 방문을 추천해요"
2. 정확한 수치(카메라 높이, 피사체와의 거리, 기울기 각도 등)는 이미지 한 장으로 알 수 없다.
   이런 값은 "조금 낮게", "약간 뒤로", "피사체 전체가 들어올 정도로", "눈높이 부근에서 시작해
   화면을 보면서 조정" 같은 범위형·행동형 표현만 사용해라. "1.23m", "8.4m", "17도" 같은
   정확한 수치를 절대 지어내지 마라.
3. 제공된 정보(JSON)에 실제로 있는 항목만 근거로 사용해라. 없는 항목(예: 위치 설명, 태그 등)은
   언급하지 말고, 없다고 해서 임의로 만들어내지도 마라.
4. EXIF 등 실제 수치 정보가 주어졌을 때만 그 값을 구체적으로 언급해라.
5. 각 필드는 1~2문장, 한국어 존댓말로 작성해라.

아래 JSON 스키마 그대로, 설명 없이 답한다:
{
  "summary": "사진을 한 줄로 요약",
  "positionGuide": "어디쯤에서 찍어야 하는지",
  "directionGuide": "어느 방향을 보고 찍어야 하는지",
  "cameraGuide": "카메라/화각 설정 방법",
  "compositionGuide": "구도를 어떻게 잡을지",
  "heightGuide": "카메라(휴대폰)를 얼마나 높게/낮게 들지",
  "timeGuide": "언제 촬영하면 비슷한 결과를 얻는지",
  "lightGuide": "빛/명암 조건에 대한 조언",
  "editingGuide": "촬영 후 보정에 대한 짧은 조언",
  "tips": ["실행 가능한 팁 2~4개"]
}`

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    positionGuide: { type: 'STRING' },
    directionGuide: { type: 'STRING' },
    cameraGuide: { type: 'STRING' },
    compositionGuide: { type: 'STRING' },
    heightGuide: { type: 'STRING' },
    timeGuide: { type: 'STRING' },
    lightGuide: { type: 'STRING' },
    editingGuide: { type: 'STRING' },
    tips: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'summary',
    'positionGuide',
    'directionGuide',
    'cameraGuide',
    'compositionGuide',
    'heightGuide',
    'timeGuide',
    'lightGuide',
    'editingGuide',
    'tips',
  ],
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS })
  }

  try {
    const { imageUrl, context } = await req.json()
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl 필요' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY 시크릿이 설정되지 않았어요.')
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash'

    const imageB64 = await toBase64(imageUrl)
    const promptText = `${PROMPT}\n\n제공된 정보(JSON, 없는 항목은 아예 안 들어있음):\n${JSON.stringify(context ?? {}, null, 2)}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }, { inline_data: { mime_type: 'image/jpeg', data: imageB64 } }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.3,
          },
        }),
      },
    )

    if (!geminiRes.ok) {
      const detail = await geminiRes.text()
      throw new Error(`Gemini 오류 ${geminiRes.status}: ${detail.slice(0, 500)}`)
    }

    const data = await geminiRes.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const parsed = JSON.parse(raw)

    // 최소 형태 검증 — 필드 누락 시 명확히 에러로 처리(프론트는 그대로 실패 표시)
    const requiredKeys = [
      'summary',
      'positionGuide',
      'directionGuide',
      'cameraGuide',
      'compositionGuide',
      'heightGuide',
      'timeGuide',
      'lightGuide',
      'editingGuide',
      'tips',
    ]
    for (const key of requiredKeys) {
      if (!(key in parsed)) throw new Error('AI 응답 형식이 올바르지 않아요.')
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: CORS,
    })
  }
})
