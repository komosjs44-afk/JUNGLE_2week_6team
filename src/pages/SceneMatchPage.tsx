import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, ImagePlus, RefreshCw, Download, X, Check, Wand2, Compass } from 'lucide-react'
import {
  detectMainSubject,
  loadDetector,
  bitmapFromSource,
  type SubjectBox,
} from '@/features/scenematch/detectSubject'
import { computeMatch, type MatchResult } from '@/features/scenematch/sceneMatch'

interface SceneMatchNavState {
  targetUrl?: string
  targetName?: string
}

const DETECT_INTERVAL_MS = 800 // 라이브 프레임을 이 간격으로 분석 (워커라 UI는 안 막힘)
const DETECT_DIM = 320 // 분석용 축소 크기 (작을수록 빠름)

function loadImageEl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('레퍼런스 이미지를 불러오지 못했어요.'))
    img.src = url
  })
}
const SMOOTH = 0.45 // 탐지 결과 EMA 계수 (낮을수록 더 부드럽지만 반응 느림)

// 탐지 상자를 프레임마다 튀지 않게 EMA로 섞는다 (일치도·화살표가 매끄럽게 변하도록)
function smoothBox(prev: SubjectBox | null, next: SubjectBox): SubjectBox {
  if (!prev) return next
  return {
    cx: prev.cx + (next.cx - prev.cx) * SMOOTH,
    cy: prev.cy + (next.cy - prev.cy) * SMOOTH,
    w: prev.w + (next.w - prev.w) * SMOOTH,
    h: prev.h + (next.h - prev.h) * SMOOTH,
    label: next.label,
    score: next.score,
  }
}

export function SceneMatchPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navState = (location.state as SceneMatchNavState | null) ?? null

  const [refUrl, setRefUrl] = useState<string | null>(navState?.targetUrl ?? null)
  const [status, setStatus] = useState('AI 모델 준비 중…')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [match, setMatch] = useState<MatchResult | null>(null)
  const [refReady, setRefReady] = useState(false)
  const [opacity, setOpacity] = useState(40) // 고스트 오버레이 투명도 %
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [levelOn, setLevelOn] = useState(false) // 수평계(자이로) 사용 여부
  const [roll, setRoll] = useState<number | null>(null) // 좌우 기울기(도)
  const orientHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const refBoxRef = useRef<SubjectBox | null>(null)
  const loopRef = useRef<number | null>(null)
  const busyRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ownRefUrlRef = useRef<string | null>(null) // 파일로 고른 레퍼런스는 언마운트 시 revoke
  const smoothRef = useRef<SubjectBox | null>(null) // 라이브 상자 EMA 상태
  const readyRef = useRef(false) // 추천 판정 히스테리시스용
  const capturedBlobRef = useRef<Blob | null>(null) // 촬영 결과 원본 (AI 보정으로 넘길 때 사용)
  const handedOffRef = useRef(false) // AI 보정으로 넘겼으면 레퍼런스 URL을 revoke하지 않음

  // 레퍼런스가 정해지면: 모델 로드 + 레퍼런스 피사체 1회 탐지
  useEffect(() => {
    if (!refUrl) return
    let cancelled = false
    setRefReady(false)
    setStatus('AI 모델 준비 중… (처음 한 번만 다운로드)')
    ;(async () => {
      try {
        await loadDetector((p) => {
          if (cancelled) return
          if (p.status === 'progress' && p.progress != null) setStatus(`모델 다운로드 ${Math.round(p.progress)}%`)
        })
        setStatus('레퍼런스 사진 분석 중…')
        const img = await loadImageEl(refUrl)
        const bmp = await bitmapFromSource(img, img.naturalWidth, img.naturalHeight, DETECT_DIM)
        const box = await detectMainSubject(bmp)
        if (cancelled) return
        refBoxRef.current = box
        setRefReady(true)
        setStatus(box ? '' : '레퍼런스에서 주요 피사체를 찾지 못했어요. 위치만 눈으로 맞춰 주세요.')
      } catch (e) {
        if (!cancelled) setStatus(e instanceof Error ? e.message : 'AI 준비에 실패했어요.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refUrl])

  // 카메라 시작 (레퍼런스 유무와 무관하게 미리 켜 둠)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('이 브라우저에서 카메라를 쓸 수 없어요. (https 또는 localhost 필요)')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        setCameraError('카메라 접근이 거부됐어요. 권한을 허용하거나 https 환경에서 열어 주세요.')
      }
    })()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  // 캡처 결과에서 "다시 찍기"로 돌아오면 video 가 재마운트되므로 스트림을 다시 연결
  useEffect(() => {
    if (capturedUrl) return
    const v = videoRef.current
    if (v && streamRef.current && v.srcObject !== streamRef.current) {
      v.srcObject = streamRef.current
      v.play().catch(() => {})
    }
  }, [capturedUrl, refUrl])

  // 탐지 루프 — 카메라가 돌고 레퍼런스 피사체가 준비되면 주기적으로 비교
  useEffect(() => {
    if (capturedUrl) return // 캡처 결과를 보는 중엔 멈춤
    if (cameraError) return

    async function tick() {
      const v = videoRef.current
      const refBox = refBoxRef.current
      if (busyRef.current || !v || v.videoWidth === 0 || !refBox) return
      busyRef.current = true
      try {
        const bmp = await bitmapFromSource(v, v.videoWidth, v.videoHeight, DETECT_DIM)
        const live = await detectMainSubject(bmp)
        if (live) {
          const sm = smoothBox(smoothRef.current, live)
          smoothRef.current = sm
          const m = computeMatch(refBox, sm)
          // 히스테리시스: 88%↑에서 추천 진입, 80% 밑으로 떨어질 때까지 유지 → 경계에서 깜빡임 방지
          const ready = m.hints.length === 0 && m.overall >= (readyRef.current ? 80 : 88)
          readyRef.current = ready
          setMatch({ ...m, ready })
        }
      } catch {
        // 일시적 실패는 무시하고 다음 틱에 재시도
      } finally {
        busyRef.current = false
      }
    }

    loopRef.current = window.setInterval(tick, DETECT_INTERVAL_MS)
    return () => {
      if (loopRef.current != null) window.clearInterval(loopRef.current)
      loopRef.current = null
    }
  }, [capturedUrl, cameraError, refReady])

  useEffect(() => {
    return () => {
      // AI 보정으로 넘긴 경우 레퍼런스 blob URL은 다음 화면에서 써야 하므로 revoke하지 않음
      if (ownRefUrlRef.current && !handedOffRef.current) URL.revokeObjectURL(ownRefUrlRef.current)
      if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 수평계 토글 — iOS는 사용자 제스처에서 권한 요청이 필요해 버튼 클릭 시점에 요청한다
  async function toggleLevel() {
    if (levelOn) {
      if (orientHandlerRef.current) window.removeEventListener('deviceorientation', orientHandlerRef.current)
      orientHandlerRef.current = null
      setLevelOn(false)
      setRoll(null)
      return
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const DOE = window.DeviceOrientationEvent as any
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission()
        if (res !== 'granted') return
      }
    } catch {
      // 권한 API가 없거나 실패 — 그냥 리스너를 붙여본다
    }
    const handler = (e: DeviceOrientationEvent) => {
      if (e.gamma != null) setRoll(e.gamma) // gamma = 좌우(roll) 기울기
    }
    orientHandlerRef.current = handler
    window.addEventListener('deviceorientation', handler)
    setLevelOn(true)
  }

  useEffect(() => {
    return () => {
      if (orientHandlerRef.current) window.removeEventListener('deviceorientation', orientHandlerRef.current)
    }
  }, [])

  function pickReference(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (ownRefUrlRef.current) URL.revokeObjectURL(ownRefUrlRef.current)
    const url = URL.createObjectURL(file)
    ownRefUrlRef.current = url
    setRefUrl(url)
    setMatch(null)
  }

  function capture() {
    const v = videoRef.current
    if (!v || v.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(v, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        if (capturedUrl) URL.revokeObjectURL(capturedUrl)
        capturedBlobRef.current = blob
        setCapturedUrl(URL.createObjectURL(blob))
      },
      'image/jpeg',
      0.95,
    )
  }

  // 촬영 결과를 그대로 AI 색감 보정으로 — 발견→찍기→보정 완전 연결.
  // 캡처 원본은 Blob으로, 목표 색감은 이 레퍼런스로 넘긴다. (SPA 내 이동이라 blob URL 유지)
  function goToAdjust() {
    if (!capturedBlobRef.current) return
    handedOffRef.current = true // 레퍼런스가 로컬 blob이어도 언마운트에서 revoke 안 하도록
    navigate('/ai-adjust', {
      state: {
        myPhotoBlob: capturedBlobRef.current,
        myPhotoName: `reshot-${Date.now()}.jpg`,
        targetUrl: refUrl,
        targetName: navState?.targetName,
      },
    })
  }

  function retake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedUrl(null)
  }

  function downloadCaptured() {
    if (!capturedUrl) return
    const a = document.createElement('a')
    a.href = capturedUrl
    a.download = `reshot-${Date.now()}.jpg`
    a.click()
  }

  // ── 레퍼런스가 없으면: 앱 사진 피드로 보내서 고르게 한다 ─────────────────────────────
  // (피드 → 사진 상세 → "이 사진처럼 찍기" 로 들어오면 그 사진이 목표로 지정돼 이 화면을 건너뜀)
  if (!refUrl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <Camera size={40} className="text-primary-600" />
        <div>
          <h1 className="text-lg font-bold text-neutral-900">이 사진처럼 찍기</h1>
          <p className="mt-1 text-sm text-neutral-500">
            피드에서 따라 찍고 싶은 사진을 고른 뒤 <b>이 사진처럼 찍기</b>로 들어오면, 카메라 위에
            반투명으로 겹쳐 보여주고 구도 일치도를 실시간으로 안내해요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-medium text-white"
        >
          <Compass size={18} /> 사진 피드에서 고르기
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400"
        >
          <ImagePlus size={16} /> 또는 내 기기에서 고르기
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={pickReference} />
      </div>
    )
  }

  // ── 캡처 결과 보기 ─────────────────────────────
  if (capturedUrl) {
    return (
      <div className="relative flex flex-1 flex-col bg-black">
        <img src={capturedUrl} alt="촬영 결과" className="min-h-0 flex-1 object-contain" />
        <div className="flex flex-col gap-2 p-4">
          <button
            type="button"
            onClick={goToAdjust}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 font-semibold text-white"
          >
            <Wand2 size={16} /> 이 레퍼런스 색감으로 AI 보정
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={retake}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/30 py-3 font-medium text-white"
            >
              <RefreshCw size={16} /> 다시 찍기
            </button>
            <button
              type="button"
              onClick={downloadCaptured}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/30 py-3 font-medium text-white"
            >
              <Download size={16} /> 저장
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 카메라 + 고스트 오버레이 + 일치도 HUD ─────────────────────────────
  const ready = match?.ready ?? false
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-black">
      {/* 카메라 */}
      <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />

      {/* 반투명 레퍼런스 고스트 오버레이 */}
      <img
        src={refUrl}
        alt="레퍼런스"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ opacity: opacity / 100 }}
      />

      {/* 수평계 — 자이로 기준 인공 수평선. 수평(±3°)이면 초록 */}
      {levelOn && roll != null && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div
            className="relative h-0.5 w-60 rounded transition-transform"
            style={{ transform: `rotate(${-roll}deg)` }}
          >
            <div className={Math.abs(roll) < 3 ? 'h-full w-full rounded bg-primary-400' : 'h-full w-full rounded bg-white/70'} />
          </div>
          {Math.abs(roll) < 3 && (
            <span className="absolute top-[54%] left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-bold text-white">
              수평
            </span>
          )}
        </div>
      )}

      {/* 상단 HUD: 일치도 / 방향 안내 */}
      <div className="relative z-10 flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full bg-black/40 p-2 text-white backdrop-blur"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={toggleLevel}
            className={`rounded-full px-3 py-2 text-xs font-medium backdrop-blur ${
              levelOn ? 'bg-primary-600 text-white' : 'bg-black/40 text-white'
            }`}
          >
            수평계 {levelOn ? 'ON' : 'OFF'}
          </button>
        </div>

        {cameraError ? (
          <p className="rounded-xl bg-danger/90 px-3 py-2 text-sm font-medium text-white">{cameraError}</p>
        ) : status ? (
          <p className="self-center rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
            {status}
          </p>
        ) : match ? (
          <div className="self-center flex flex-col items-center gap-1">
            <div
              className={`rounded-full px-4 py-1.5 text-sm font-bold backdrop-blur ${
                ready ? 'bg-primary-600 text-white' : 'bg-black/55 text-white'
              }`}
            >
              구도 일치도 {match.overall}%
            </div>
            <div className="flex gap-1.5">
              {match.hints.map((h, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur"
                >
                  <span className="text-sm">{h.arrow}</span> {h.text}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1" />

      {/* 촬영 추천 배너 */}
      {ready && (
        <div className="relative z-10 mx-4 mb-2 flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2 text-sm font-bold text-white">
          <Check size={16} /> 지금이에요 — 촬영 추천!
        </div>
      )}

      {/* 하단 컨트롤: 오버레이 투명도 + 셔터 */}
      <div className="relative z-10 flex flex-col gap-3 p-4">
        <label className="flex items-center gap-3 text-white">
          <span className="whitespace-nowrap text-xs font-medium">겹쳐보기</span>
          <input
            type="range"
            min={0}
            max={80}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-9 text-right text-xs">{opacity}%</span>
        </label>

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={capture}
            disabled={!!cameraError}
            className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-white ${
              ready ? 'bg-primary-500' : 'bg-white/30'
            } disabled:opacity-40`}
            aria-label="촬영"
          >
            <Camera size={26} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
