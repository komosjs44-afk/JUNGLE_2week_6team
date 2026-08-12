// ============================================================
// RE:FRAME — Gemini 색감 분석 Edge Function
// 내 사진 + 레퍼런스 사진을 받아, 레퍼런스 톤에 맞추는 "보정값 JSON"을 반환한다.
// 키(GEMINI_API_KEY)는 서버 시크릿이라 브라우저에 절대 노출되지 않는다.
// 실제 픽셀 보정(Canvas)은 프론트가 이 값으로 수행한다.
//
// 배포:  supabase functions deploy analyze-photo
// 시크릿: supabase secrets set GEMINI_API_KEY=발급받은_키
// (모델명은 Google 최신 문서 기준으로 확인 후 GEMINI_MODEL 로 교체 가능)
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 프론트의 AdjustmentRecipe 와 동일한 범위 (src/types/adjustment.ts)
const RANGES: Record<string, [number, number]> = {
  exposure: [-2, 2],
  contrast: [-50, 50],
  highlights: [-100, 100],
  shadows: [-100, 100],
  saturation: [-50, 50],
  temperature: [-1000, 1000],
}

function clamp(v: number, min: number, max: number) {
  if (typeof v !== 'number' || Number.isNaN(v)) return 0
  return Math.max(min, Math.min(max, v))
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

const PROMPT = `너는 사진 색보정 전문가다.
두 이미지가 주어진다: 첫 번째는 목표 톤(reference), 두 번째는 사용자의 원본(my photo).

먼저 analysis 필드에 두 사진을 실제로 비교 관찰한 내용을 적어라 (짐작 금지, 본 대로 적을 것):
- brightness: reference가 my photo보다 밝은지/어두운지, 체감 차이 정도
- contrast: 명암 대비가 reference쪽이 센지/약한지
- highlightsShadows: 밝은 영역과 어두운 영역의 디테일/톤 차이
- saturation: reference의 채도가 더 높은지/낮은지
- colorTemperature: reference가 my photo보다 따뜻한(노랑/주황) 톤인지 차가운(파랑) 톤인지

그다음, 그 analysis 내용을 근거로만 숫자를 정한다 (analysis와 모순되는 숫자 금지):
exposure -2~2(밝기), contrast -50~50(대비), highlights/shadows -100~100,
saturation -50~50(채도), temperature -1000~1000(색온도, +따뜻/-차가움).
0에 가까운 값은 "그 항목은 이미 비슷하다"는 뜻이니, analysis에서 차이가 없다고 판단했다면 실제로 0에 가깝게 써라.
같은 두 사진 쌍이 다시 주어지면 항상 같은 analysis와 같은 숫자를 내야 한다.`

// Gemini 구조화 출력 — analysis를 숫자보다 먼저 채우게 해서(스키마 순서) 모델이
// 근거 없이 바로 숫자부터 찍는 걸 막는다. 키 누락·타입 오류·JSON 파싱 실패도 API 레벨에서 차단.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    analysis: {
      type: 'OBJECT',
      properties: {
        brightness: { type: 'STRING' },
        contrast: { type: 'STRING' },
        highlightsShadows: { type: 'STRING' },
        saturation: { type: 'STRING' },
        colorTemperature: { type: 'STRING' },
      },
      required: ['brightness', 'contrast', 'highlightsShadows', 'saturation', 'colorTemperature'],
    },
    exposure: { type: 'NUMBER' },
    contrast: { type: 'NUMBER' },
    highlights: { type: 'NUMBER' },
    shadows: { type: 'NUMBER' },
    saturation: { type: 'NUMBER' },
    temperature: { type: 'NUMBER' },
  },
  required: ['analysis', 'exposure', 'contrast', 'highlights', 'shadows', 'saturation', 'temperature'],
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS })
  }

  try {
    const { myPhotoUrl, referenceUrl, baseline } = await req.json()
    if (!myPhotoUrl || !referenceUrl) {
      return new Response(JSON.stringify({ error: 'myPhotoUrl, referenceUrl 필요' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // 하이브리드: 프론트가 픽셀 통계로 계산한 "측정 기반 초안"을 근거로 넘겨, 모델이 맨땅에서
    // 추측하지 않고 이 값을 기준으로 미세조정하게 한다. (없어도 동작 — 하위 호환)
    const baselineText =
      baseline && typeof baseline === 'object'
        ? `\n\n참고로, 픽셀 통계로 계산한 측정 기반 초안값이다 (완벽하진 않지만 방향과 크기의 근거로 삼아라):
exposure=${Number(baseline.exposure) || 0}, contrast=${Number(baseline.contrast) || 0}, highlights=${Number(baseline.highlights) || 0}, shadows=${Number(baseline.shadows) || 0}, saturation=${Number(baseline.saturation) || 0}, temperature=${Number(baseline.temperature) || 0}.
이 초안이 실제 두 사진의 차이와 맞으면 비슷하게 두고, 눈으로 본 analysis 와 어긋나는 항목만 바로잡아라.`
        : ''

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY 시크릿이 설정되지 않았어요.')
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash'

    const [refB64, myB64] = await Promise.all([toBase64(referenceUrl), toBase64(myPhotoUrl)])

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT + baselineText },
                { inline_data: { mime_type: 'image/jpeg', data: refB64 } },
                { inline_data: { mime_type: 'image/jpeg', data: myB64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            // 0 = 같은 입력이면 항상 같은 값 (랜덤성 최소화 — 색보정은 창작이 아니라 판단이라 결정론이 맞다)
            temperature: 0,
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

    // 프론트가 그대로 쓸 수 있게 범위 clamp
    const recipe = Object.fromEntries(
      Object.entries(RANGES).map(([k, [min, max]]) => [k, clamp(Number(parsed[k]), min, max)]),
    )

    return new Response(JSON.stringify(recipe), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
