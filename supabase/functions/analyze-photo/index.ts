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
사용자의 사진을 reference의 색감/분위기에 가깝게 만드는 전역 보정값을 판단하라.
반드시 아래 JSON 스키마로만, 설명 없이 답한다. 값은 지정 범위 안에서만.
{
  "exposure": number,     // -2 ~ 2   (밝기)
  "contrast": number,     // -50 ~ 50 (대비)
  "highlights": number,   // -100 ~ 100
  "shadows": number,      // -100 ~ 100
  "saturation": number,   // -50 ~ 50 (채도)
  "temperature": number   // -1000 ~ 1000 (색온도, +따뜻 / -차가움)
}`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS })
  }

  try {
    const { myPhotoUrl, referenceUrl } = await req.json()
    if (!myPhotoUrl || !referenceUrl) {
      return new Response(JSON.stringify({ error: 'myPhotoUrl, referenceUrl 필요' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY 시크릿이 설정되지 않았어요.')
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash'

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
                { text: PROMPT },
                { inline_data: { mime_type: 'image/jpeg', data: refB64 } },
                { inline_data: { mime_type: 'image/jpeg', data: myB64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      },
    )

    if (!geminiRes.ok) {
      const detail = await geminiRes.text()
      throw new Error(`Gemini 오류 ${geminiRes.status}: ${detail.slice(0, 200)}`)
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
