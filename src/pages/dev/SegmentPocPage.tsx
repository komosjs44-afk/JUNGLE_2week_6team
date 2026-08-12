import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import type { AdjustmentRecipe } from '@/types'
import { autoMatchRecipe, analyzeStats } from '@/utils/colorMatch'
import { applyAdjustment } from '@/utils/imageAdjustment'
import { segmentImage, SEG_MODELS, DEFAULT_SEG_MODEL } from '@/features/segment/segmentImage'
import {
  regionalMatch,
  renderOverlay,
  statsForMask,
  labelColor,
  type RegionPlan,
} from '@/features/segment/regionalMatch'

// 분할 입력 크기 — 마스크가 입력 크기로 나오므로 작게 넣어 분할·통계를 가볍게 (품질과 무관)
const SEG_DIM = 640
// 출력(보정 적용) 크기 상한 — recipe 장을 여기 해상도로 업샘플해 적용하므로 화질을 좌우한다
const OUTPUT_MAX_DIM = 1600

function downscale(url: string, maxDim: number): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('canvas 없음'))
      ctx.drawImage(img, 0, 0, w, h)
      resolve({ dataUrl: c.toDataURL('image/jpeg', 0.92), width: w, height: h })
    }
    img.onerror = () => reject(new Error('이미지 로드 실패'))
    img.src = url
  })
}

// 원본을 maxDim 이내로만 줄여 ImageData 로 (JPEG 재인코딩 없이 → 화질 유지)
function loadCapped(url: string, maxDim: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('canvas 없음'))
      ctx.drawImage(img, 0, 0, w, h)
      resolve(ctx.getImageData(0, 0, w, h))
    }
    img.onerror = () => reject(new Error('이미지 로드 실패'))
    img.src = url
  })
}

function toImageData(url: string, w: number, h: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('canvas 없음'))
      ctx.drawImage(img, 0, 0, w, h)
      resolve(ctx.getImageData(0, 0, w, h))
    }
    img.onerror = () => reject(new Error('이미지 로드 실패'))
    img.src = url
  })
}

function dataUrlOf(img: ImageData): string {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  c.getContext('2d')!.putImageData(img, 0, 0)
  return c.toDataURL('image/jpeg', 0.92)
}

// 원본 ↔ 보정본을 강도(pct)로 섞는다 — 사용자가 보정 세기를 직접 조절
function blendToUrl(orig: ImageData, corrected: ImageData, pct: number): string {
  const a = pct / 100
  const o = orig.data
  const c = corrected.data
  const out = new Uint8ClampedArray(o.length)
  for (let i = 0; i < o.length; i++) out[i] = o[i] + (c[i] - o[i]) * a
  return dataUrlOf(new ImageData(out, orig.width, orig.height))
}

interface Result {
  msLoad: number
  msInferMy: number
  msInferRef: number
  msRegional: number
  regions: RegionPlan[]
  globalOnly: boolean
  sharedCoverage: number
  images: { origMy: string; overlayMy: string; overlayRef: string; globalMy: string; regionalMy: string }
}

const BASIS_LABEL: Record<RegionPlan['basis'], string> = {
  region: '영역별',
  'ref-global': '레퍼런스 전체톤',
  global: '전역',
}

export function SegmentPocPage() {
  const [myUrl, setMyUrl] = useState<string | null>(null)
  const [refUrl, setRefUrl] = useState<string | null>(null)
  const [modelId, setModelId] = useState<string>(DEFAULT_SEG_MODEL)
  const [status, setStatus] = useState<string>('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  // 보정 강도(0~100%) — 원본↔영역별보정 블렌드. 슬라이더로 실시간 조절 (재분할 없이 픽셀만 다시 섞음)
  const [strength, setStrength] = useState(100)
  const [regionalUrl, setRegionalUrl] = useState<string | null>(null)
  const origFullRef = useRef<ImageData | null>(null)
  const regionalFullRef = useRef<ImageData | null>(null)

  // 강도가 바뀌거나 새 결과가 나오면 블렌드만 다시 계산 (세그멘테이션은 재실행 안 함)
  useEffect(() => {
    if (!origFullRef.current || !regionalFullRef.current) return
    setRegionalUrl(blendToUrl(origFullRef.current, regionalFullRef.current, strength))
  }, [strength, result])

  function pick(setter: (u: string) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) {
        setter(URL.createObjectURL(f))
        setResult(null)
        setError(null)
      }
    }
  }

  async function run() {
    if (!myUrl || !refUrl) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      setStatus('이미지 준비 중…')
      const [myD, refD] = await Promise.all([downscale(myUrl, SEG_DIM), downscale(refUrl, SEG_DIM)])

      setStatus('모델 로드 + 내 사진 분할 중… (최초 1회 모델 다운로드가 큽니다)')
      const mySeg = await segmentImage(myD.dataUrl, modelId, (p) => {
        if (p.status === 'progress' && p.progress != null) {
          setStatus(`모델 다운로드 ${Math.round(p.progress)}% (${p.file ?? ''})`)
        } else if (p.status) {
          setStatus(`모델 ${p.status}…`)
        }
      })

      setStatus('레퍼런스 분할 중…')
      const refSeg = await segmentImage(refD.dataUrl, modelId)

      setStatus('색 통계 · 영역별 보정 계산 중…')
      // 분할 해상도(마스크와 정렬)
      const mySegImg = await toImageData(myD.dataUrl, myD.width, myD.height)
      const refImg = await toImageData(refD.dataUrl, refD.width, refD.height)
      // 출력(원본급) 해상도 — 실제 보정은 여기에 적용해 화질을 유지
      const myFullImg = await loadCapped(myUrl, OUTPUT_MAX_DIM)

      // 레퍼런스: 클래스별 통계
      const refStatsByLabel = new Map<string, ReturnType<typeof statsForMask>>()
      for (const seg of refSeg.segments) {
        const s = statsForMask(refImg, seg.mask)
        if (s) refStatsByLabel.set(seg.label, s)
      }
      // TS: Map value 는 ImageStats | null 이지만 null 은 넣지 않았으므로 아래에서 좁혀서 사용
      const refStats = new Map(
        [...refStatsByLabel.entries()].filter(([, v]) => v != null) as [string, NonNullable<ReturnType<typeof statsForMask>>][],
      )

      const refGlobalStats = analyzeStats(refImg)
      const globalRecipe: AdjustmentRecipe = await autoMatchRecipe(myD.dataUrl, refD.dataUrl)

      const t0 = performance.now()
      const { output, regions, globalOnly, sharedCoverage } = regionalMatch(
        mySegImg,
        myFullImg,
        mySeg.segments,
        refStats,
        refGlobalStats,
        globalRecipe,
      )
      const msRegional = performance.now() - t0

      // 전역 보정 결과 (비교용) — 동일하게 출력 해상도에 적용해 공정 비교
      const globalOut = applyAdjustment(
        new ImageData(new Uint8ClampedArray(myFullImg.data), myFullImg.width, myFullImg.height),
        globalRecipe,
      )

      // 강도 슬라이더가 원본↔영역별보정을 실시간으로 섞을 수 있게 원본/보정본을 보관
      origFullRef.current = myFullImg
      regionalFullRef.current = output

      setResult({
        msLoad: mySeg.msLoad,
        msInferMy: mySeg.msInfer,
        msInferRef: refSeg.msInfer,
        msRegional,
        regions,
        globalOnly,
        sharedCoverage,
        images: {
          origMy: dataUrlOf(myFullImg),
          overlayMy: dataUrlOf(renderOverlay(mySeg.segments, mySegImg.width, mySegImg.height)),
          overlayRef: dataUrlOf(renderOverlay(refSeg.segments, refImg.width, refImg.height)),
          globalMy: dataUrlOf(globalOut),
          regionalMy: dataUrlOf(output),
        },
      })
      setStatus('완료')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>영역별 색 보정 POC (SegFormer)</h1>
      <p style={{ color: '#555', fontSize: '.9rem' }}>
        하늘·건물·나무·인물 등을 브라우저에서 분할해 영역별로 색을 맞춥니다. 최초 1회 모델(수십 MB) 다운로드가
        있고, 모바일은 느릴 수 있어요. 속도·품질을 실측하는 용도입니다.
      </p>

      <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '.85rem' }}>
          내 사진{' '}
          <input type="file" accept="image/*" onChange={pick(setMyUrl)} />
        </label>
        <label style={{ fontSize: '.85rem' }}>
          레퍼런스(목표 색감){' '}
          <input type="file" accept="image/*" onChange={pick(setRefUrl)} />
        </label>
        <label style={{ fontSize: '.85rem' }}>
          분할 모델{' '}
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={running}>
            {SEG_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p style={{ fontSize: '.78rem', color: '#838da0', margin: '.2rem 0 0' }}>
        모델이 클수록(b0→b5) 분할이 정확하지만 다운로드·추론이 느려집니다. 처음엔 b0로 확인 후 b2/b3로 비교해 보세요.
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        {myUrl && <img src={myUrl} alt="my" style={{ height: 120, borderRadius: 8 }} />}
        {refUrl && <img src={refUrl} alt="ref" style={{ height: 120, borderRadius: 8 }} />}
      </div>

      <button
        type="button"
        onClick={run}
        disabled={!myUrl || !refUrl || running}
        style={{
          marginTop: '1rem',
          padding: '.6rem 1.2rem',
          borderRadius: 8,
          border: 'none',
          background: running ? '#999' : '#007a5e',
          color: '#fff',
          fontWeight: 700,
          cursor: running ? 'default' : 'pointer',
        }}
      >
        {running ? '처리 중…' : '분할 + 영역별 보정 실행'}
      </button>

      {status && <p style={{ fontSize: '.85rem', color: '#0b6b6e', marginTop: '.6rem' }}>{status}</p>}
      {error && <p style={{ fontSize: '.85rem', color: '#c4432f', marginTop: '.6rem' }}>오류: {error}</p>}

      {result && (
        <div style={{ marginTop: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              fontSize: '.85rem',
              background: '#f3f5f8',
              borderRadius: 10,
              padding: '.8rem 1rem',
            }}
          >
            <b>실측:</b>
            <span>모델 로드 {(result.msLoad / 1000).toFixed(1)}s</span>
            <span>내 사진 추론 {(result.msInferMy / 1000).toFixed(2)}s</span>
            <span>레퍼런스 추론 {(result.msInferRef / 1000).toFixed(2)}s</span>
            <span>영역별 적용 {result.msRegional.toFixed(0)}ms</span>
            <span>대응 영역 {(result.sharedCoverage * 100).toFixed(0)}%</span>
          </div>

          {result.globalOnly && (
            <p
              style={{
                marginTop: '.8rem',
                background: '#fbead9',
                color: '#a85416',
                borderRadius: 8,
                padding: '.6rem .9rem',
                fontSize: '.85rem',
              }}
            >
              두 사진의 장면이 많이 달라(대응 영역 {(result.sharedCoverage * 100).toFixed(0)}%) 영역별 대신
              <b> 전체 톤 이식</b>으로 처리했어요.
            </p>
          )}

          <h2 style={{ fontSize: '1.05rem', marginTop: '1.2rem' }}>결과 비교 (내 사진)</h2>

          {/* 보정 강도 — 원본(0) ↔ 영역별 보정(100) 사이를 사용자가 직접 맞춤 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', margin: '.2rem 0 1rem' }}>
            <span style={{ fontSize: '.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>보정 강도</span>
            <input
              type="range"
              min={0}
              max={100}
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '.85rem', width: 44, textAlign: 'right' }}>{strength}%</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '.8rem' }}>
            <Figure title="원본" src={result.images.origMy} />
            <Figure title="전역 보정 (기존)" src={result.images.globalMy} />
            <Figure title={`영역별 보정 (강도 ${strength}%)`} src={regionalUrl ?? result.images.regionalMy} />
          </div>

          <h2 style={{ fontSize: '1.05rem', marginTop: '1.2rem' }}>분할 오버레이</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '.8rem' }}>
            <Figure title="내 사진 분할" src={result.images.overlayMy} />
            <Figure title="레퍼런스 분할" src={result.images.overlayRef} />
          </div>

          <h2 style={{ fontSize: '1.05rem', marginTop: '1.2rem' }}>영역별 보정값</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '.8rem' }}>
              <thead>
                <tr style={{ background: '#eaedf2', textAlign: 'left' }}>
                  <th style={cell}>영역</th>
                  <th style={cell}>비중</th>
                  <th style={cell}>기준</th>
                  <th style={cell}>노출</th>
                  <th style={cell}>대비</th>
                  <th style={cell}>하이라이트</th>
                  <th style={cell}>섀도우</th>
                  <th style={cell}>채도</th>
                  <th style={cell}>색온도</th>
                </tr>
              </thead>
              <tbody>
                {result.regions.map((r, i) => (
                  <tr key={i}>
                    <td style={cell}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          marginRight: 6,
                          background: `rgb(${labelColor(r.label).join(',')})`,
                        }}
                      />
                      {r.label}
                    </td>
                    <td style={cell}>{(r.coverage * 100).toFixed(0)}%</td>
                    <td style={cell}>{BASIS_LABEL[r.basis]}</td>
                    <td style={cell}>{r.recipe.exposure}</td>
                    <td style={cell}>{r.recipe.contrast}</td>
                    <td style={cell}>{r.recipe.highlights}</td>
                    <td style={cell}>{r.recipe.shadows}</td>
                    <td style={cell}>{r.recipe.saturation}</td>
                    <td style={cell}>{r.recipe.temperature}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const cell: React.CSSProperties = { padding: '.4rem .6rem', borderBottom: '1px solid #dde2e9', whiteSpace: 'nowrap' }

function Figure({ title, src }: { title: string; src: string }) {
  return (
    <figure style={{ margin: 0 }}>
      <img src={src} alt={title} style={{ width: '100%', borderRadius: 8, border: '1px solid #dde2e9' }} />
      <figcaption style={{ fontSize: '.8rem', color: '#555', marginTop: '.3rem', textAlign: 'center' }}>{title}</figcaption>
    </figure>
  )
}
