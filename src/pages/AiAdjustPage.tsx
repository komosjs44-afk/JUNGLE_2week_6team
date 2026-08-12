import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Wand2, Download, ImagePlus, ArrowRight, Upload, Layers, X } from 'lucide-react'
import type { AdjustmentRecipe } from '@/types'
import { DEFAULT_ADJUSTMENT_RECIPE } from '@/types'
import { useAuthStore, useUploadWizardStore } from '@/stores'
import { supabase } from '@/lib/supabase'
import { uploadUserPhoto } from '@/features/upload/uploadImage'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdjustmentPreview } from '@/components/adjustment/AdjustmentPreview'
import { AdjustmentSliders } from '@/components/adjustment/AdjustmentSliders'
import { Button } from '@/components/common/Button'
import { autoMatchRecipe, renderAdjustedBlob } from '@/utils/colorMatch'
import { runRegionalAdjust, blendToUrl, blendToBlob } from '@/features/segment/regionalAdjust'

// 영역별 보정은 결과가 이미지에 반영되어 나오므로, Upload Wizard 에는 "추가 보정 없음"으로 넘긴다
const NEUTRAL_RECIPE: AdjustmentRecipe = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  saturation: 0,
  temperature: 0,
}

interface AiAdjustNavState {
  referenceId?: string
  targetUrl?: string
  targetName?: string
  creatorId?: string
  creatorName?: string
}

export function AiAdjustPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setWizardFile = useUploadWizardStore((s) => s.setFile)
  const setWizardAdjustedResult = useUploadWizardStore((s) => s.setAdjustedResult)
  const setWizardSourceReferenceId = useUploadWizardStore((s) => s.setSourceReferenceId)
  const resetWizard = useUploadWizardStore((s) => s.reset)

  // 피드(레퍼런스 상세)에서 "이 색감으로 보정"으로 넘어온 경우, 그 레퍼런스가 목표 색감으로 고정된다
  const navState = (location.state as AiAdjustNavState | null) ?? null
  const isReferenceMode = !!navState?.targetUrl

  const [myFile, setMyFile] = useState<File | null>(null)
  const [myUrl, setMyUrl] = useState<string | null>(null)
  const [myRemoteUrl, setMyRemoteUrl] = useState<string | null>(null) // AI 분석용으로 업로드된 public URL (캐시)
  const [targetUrl, setTargetUrl] = useState<string | null>(navState?.targetUrl ?? null)
  const [recipe, setRecipe] = useState<AdjustmentRecipe>({ ...DEFAULT_ADJUSTMENT_RECIPE })
  // 어떤 엔진이 이번 보정값을 냈는지 — 사용자가 "왜 매번 다르지"를 이해하도록 화면에 표시한다.
  // 'ai' = Gemini 분석, 'local' = 기기에서 통계 계산(빠른 자동 보정)
  const [engine, setEngine] = useState<'ai' | 'local' | null>(null)
  const [showBefore, setShowBefore] = useState(false)
  const [matching, setMatching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preparingUpload, setPreparingUpload] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 영역별(의미 분할 기반) 정밀 보정 — 하늘/건물/나무/인물 등을 나눠 각각 색을 맞춘다.
  const [regionalActive, setRegionalActive] = useState(false)
  const [regionalBusy, setRegionalBusy] = useState(false)
  const [regionalStatus, setRegionalStatus] = useState('')
  const [regionalStrength, setRegionalStrength] = useState(100) // 0=원본, 100=보정 전부
  const [regionalUrl, setRegionalUrl] = useState<string | null>(null) // 강도 블렌드 미리보기
  const regionalOrigRef = useRef<ImageData | null>(null)
  const regionalOutRef = useRef<ImageData | null>(null)

  const myInputRef = useRef<HTMLInputElement>(null)
  const targetInputRef = useRef<HTMLInputElement>(null)

  function resetRegional() {
    setRegionalActive(false)
    setRegionalUrl(null)
    setRegionalStrength(100)
    regionalOrigRef.current = null
    regionalOutRef.current = null
  }

  // 강도가 바뀌면 재분할 없이 원본↔보정본만 다시 섞어 미리보기 갱신
  useEffect(() => {
    if (!regionalActive || !regionalOrigRef.current || !regionalOutRef.current) return
    setRegionalUrl(blendToUrl(regionalOrigRef.current, regionalOutRef.current, regionalStrength))
  }, [regionalActive, regionalStrength])
  // Upload Wizard로 넘긴 myUrl은 store가 계속 참조하므로, 언마운트 시 여기서 revoke하면 안 됨
  const handedOffUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (myUrl && myUrl !== handedOffUrlRef.current) URL.revokeObjectURL(myUrl)
    }
  }, [myUrl])
  useEffect(() => {
    return () => {
      if (targetUrl) URL.revokeObjectURL(targetUrl)
    }
  }, [targetUrl])

  function pickMy(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (myUrl) URL.revokeObjectURL(myUrl)
    setMyFile(file)
    setMyUrl(URL.createObjectURL(file))
    setMyRemoteUrl(null)
    setRecipe({ ...DEFAULT_ADJUSTMENT_RECIPE })
    setEngine(null)
    setError(null)
    resetRegional()
  }
  function pickTarget(e: ChangeEvent<HTMLInputElement>) {
    if (isReferenceMode) return // 레퍼런스 모드에서는 목표 사진이 고정, 다시 선택할 필요 없음
    const file = e.target.files?.[0]
    if (!file) return
    if (targetUrl) URL.revokeObjectURL(targetUrl)
    setTargetUrl(URL.createObjectURL(file))
    setEngine(null)
    setError(null)
    resetRegional()
  }

  async function handleAutoMatch() {
    if (!myFile || !myUrl || !targetUrl) return
    setMatching(true)
    setError(null)
    try {
      // 통계 계산으로 "측정 기반 초안"을 항상 먼저 만든다. 이 값은 (1) AI에게 넘길 근거이자
      // (2) AI가 실패하면 그대로 쓸 폴백이다 — 두 번 계산하지 않는다.
      const baseline = await autoMatchRecipe(myUrl, targetUrl)

      // 레퍼런스 모드에서만 AI(Gemini) 분석을 시도. baseline 을 근거로 넘겨 맨땅 추측을 막는다(하이브리드).
      if (isReferenceMode && user) {
        try {
          let remoteUrl = myRemoteUrl
          if (!remoteUrl) {
            remoteUrl = await uploadUserPhoto(myFile, user.id)
            setMyRemoteUrl(remoteUrl)
          }
          const { data, error: fnError } = await supabase.functions.invoke('analyze-photo', {
            body: { myPhotoUrl: remoteUrl, referenceUrl: targetUrl, baseline },
          })
          if (fnError) throw fnError
          if (!data || typeof data !== 'object' || 'error' in (data as Record<string, unknown>)) {
            throw new Error((data as { error?: string } | undefined)?.error ?? 'AI 분석 결과가 올바르지 않아요.')
          }
          setRecipe(data as AdjustmentRecipe)
          setEngine('ai')
          return
        } catch {
          // 백엔드 함수가 아직 배포되지 않았거나 일시적으로 실패 — 조용히 측정 기반 초안으로 대체
        }
      }
      setRecipe(baseline)
      setEngine('local')
    } catch (err) {
      setError(err instanceof Error ? err.message : '자동 보정에 실패했어요.')
    } finally {
      setMatching(false)
    }
  }

  async function handleRegional() {
    if (!myUrl || !targetUrl) return
    setRegionalBusy(true)
    setError(null)
    setRegionalStatus('준비 중…')
    try {
      const res = await runRegionalAdjust(myUrl, targetUrl, { onStatus: setRegionalStatus })
      regionalOrigRef.current = res.orig
      regionalOutRef.current = res.output
      setRegionalStrength(100)
      setRegionalActive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '영역별 보정에 실패했어요.')
    } finally {
      setRegionalBusy(false)
      setRegionalStatus('')
    }
  }

  // 저장·업로드에 쓸 보정 결과 Blob — 영역별 모드면 강도 블렌드 결과, 아니면 recipe 적용 결과
  async function buildResultBlob(): Promise<Blob> {
    if (regionalActive && regionalOrigRef.current && regionalOutRef.current) {
      return blendToBlob(regionalOrigRef.current, regionalOutRef.current, regionalStrength)
    }
    return renderAdjustedBlob(myUrl!, recipe)
  }

  async function handleSave() {
    if (!myUrl) return
    setSaving(true)
    setError(null)
    try {
      const blob = await buildResultBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reshot-${Date.now()}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUseForUpload() {
    if (!myFile || !myUrl) return
    setPreparingUpload(true)
    setError(null)
    try {
      // 보정 결과를 실제 File로 만들어 둔다 — Upload Wizard 전 구간의 Preview·최종 업로드가 이 File을 쓴다.
      // 원본 myFile/myUrl은 그대로 둬서 EXIF/GPS 분석은 항상 원본 기준으로 동작한다.
      const blob = await buildResultBlob()
      const adjustedFile = new File([blob], myFile.name || 'adjusted.jpg', { type: 'image/jpeg' })
      const adjustedUrl = URL.createObjectURL(blob)

      handedOffUrlRef.current = myUrl // 언마운트 cleanup이 이 URL을 revoke하지 않도록 표시
      resetWizard()
      setWizardFile(myFile, myUrl)
      // 영역별 결과는 이미 픽셀에 반영돼 있으므로 recipe 는 "추가 보정 없음"으로 넘긴다
      setWizardAdjustedResult(adjustedFile, adjustedUrl, regionalActive ? NEUTRAL_RECIPE : recipe, 'ai')
      // ReferenceDetailPage가 여기로 넘길 때 referenceId를 항상 "실제 색감 기준(root) Reference"의 id로 채워준다
      setWizardSourceReferenceId(navState?.referenceId ?? null)
      navigate('/upload/exif')
    } catch (err) {
      setError(err instanceof Error ? err.message : '보정 이미지를 준비하지 못했어요.')
    } finally {
      setPreparingUpload(false)
    }
  }

  function setValue(key: keyof AdjustmentRecipe, value: number) {
    setRecipe((r) => ({ ...r, [key]: value }))
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="AI 색감 보정" />

      <div className="flex flex-col gap-4 px-4 py-4">
        {isReferenceMode && (
          <p className="text-sm text-neutral-600">
            {navState?.creatorName ? `${navState.creatorName}님의 ` : ''}
            사진 색감을 기준으로 AI가 내 사진을 보정해요.
            {navState?.targetName ? ` (${navState.targetName})` : ''}
          </p>
        )}

        {/* 두 사진: 목표 색감 → 내 사진 (목표 색을 내 사진에 적용) */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <PhotoSlot
              label="목표 색감"
              url={targetUrl}
              locked={isReferenceMode}
              onClick={() => targetInputRef.current?.click()}
            />
          </div>
          <ArrowRight size={22} className="shrink-0 text-neutral-400" />
          <div className="flex-1">
            <PhotoSlot label="내 사진" url={myUrl} onClick={() => myInputRef.current?.click()} />
          </div>
        </div>
        <input ref={myInputRef} type="file" accept="image/*" hidden onChange={pickMy} />
        {!isReferenceMode && (
          <input ref={targetInputRef} type="file" accept="image/*" hidden onChange={pickTarget} />
        )}

        {/* 결과 미리보기 — 영역별 모드면 블렌드 이미지, 아니면 recipe 실시간 적용 */}
        {myUrl && regionalActive && regionalUrl && (
          <div className="overflow-hidden rounded-2xl border border-neutral-100">
            <img src={regionalUrl} alt="영역별 보정 결과" className="w-full" />
          </div>
        )}
        {myUrl && !regionalActive && (
          <AdjustmentPreview imageUrl={myUrl} recipe={recipe} showBefore={showBefore} />
        )}

        {!regionalActive && (
          <Button
            fullWidth
            icon={<Wand2 size={16} />}
            loading={matching}
            disabled={!myUrl || !targetUrl}
            onClick={handleAutoMatch}
          >
            {isReferenceMode ? 'AI 색감 보정' : '목표 색감으로 자동 보정'}
          </Button>
        )}

        {/* 영역별(하늘·건물·나무·인물 분리) 정밀 보정 — 무거운 AI라 누를 때만 로드 */}
        {myUrl && targetUrl && !regionalActive && (
          <Button
            variant="secondary"
            fullWidth
            icon={<Layers size={16} />}
            loading={regionalBusy}
            onClick={handleRegional}
          >
            영역별 정밀 보정 (베타)
          </Button>
        )}
        {regionalBusy && regionalStatus && (
          <p className="text-center text-xs text-neutral-500">{regionalStatus}</p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        {/* 어느 엔진이 이번 보정을 냈는지 표시 — 실패를 숨기지 않고, "왜 매번 다르지"를 이해하게 함 */}
        {engine && !regionalActive && (
          <p
            className={
              engine === 'ai'
                ? 'flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700'
                : 'flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-500'
            }
          >
            {engine === 'ai' ? (
              <>
                <Wand2 size={13} /> AI가 두 사진을 분석해 맞춘 색감이에요.
              </>
            ) : (
              <>
                <Wand2 size={13} /> 기기에서 빠르게 계산한 자동 보정이에요. 슬라이더로 더 다듬어 보세요.
              </>
            )}
          </p>
        )}

        {myUrl && (
          <>
            {regionalActive ? (
              <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-primary-700">
                    <Layers size={15} /> 영역별 정밀 보정 적용됨
                  </span>
                  <button
                    type="button"
                    onClick={resetRegional}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-400"
                  >
                    <X size={13} /> 해제
                  </button>
                </div>
                <label className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-sm font-medium text-neutral-600">보정 강도</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={regionalStrength}
                    onChange={(e) => setRegionalStrength(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-10 text-right text-sm text-neutral-500">{regionalStrength}%</span>
                </label>
                <p className="text-xs text-neutral-400">
                  하늘·건물·나무·인물 등을 나눠 각각 색을 맞췄어요. 과하면 강도를 낮춰보세요.
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onTouchStart={() => setShowBefore(true)}
                  onTouchEnd={() => setShowBefore(false)}
                  onMouseDown={() => setShowBefore(true)}
                  onMouseUp={() => setShowBefore(false)}
                  onMouseLeave={() => setShowBefore(false)}
                  className="min-h-[44px] rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 active:bg-neutral-50"
                >
                  누르고 있으면 원본과 비교돼요
                </button>

                <AdjustmentSliders recipe={recipe} onChange={setValue} />
              </>
            )}

            <div className="flex flex-col gap-2">
              <Button
                fullWidth
                icon={<Upload size={16} />}
                loading={preparingUpload}
                onClick={handleUseForUpload}
              >
                이 사진으로 업로드
              </Button>
              <Button
                variant="secondary"
                fullWidth
                icon={<Download size={16} />}
                loading={saving}
                onClick={handleSave}
              >
                보정 사진 저장
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PhotoSlot({
  label,
  url,
  locked,
  onClick,
}: {
  label: string
  url: string | null
  locked?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 disabled:cursor-default"
    >
      {url ? (
        <img src={url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 text-neutral-400">
          <ImagePlus size={22} />
          <span className="text-xs font-medium">{label}</span>
        </span>
      )}
      <span className="absolute top-2 left-2 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
        {label}
      </span>
    </button>
  )
}
