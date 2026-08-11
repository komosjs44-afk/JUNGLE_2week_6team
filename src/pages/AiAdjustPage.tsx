import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Wand2, Download, ImagePlus, ArrowRight, Upload } from 'lucide-react'
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
  const [showBefore, setShowBefore] = useState(false)
  const [matching, setMatching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preparingUpload, setPreparingUpload] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const myInputRef = useRef<HTMLInputElement>(null)
  const targetInputRef = useRef<HTMLInputElement>(null)
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
    setError(null)
  }
  function pickTarget(e: ChangeEvent<HTMLInputElement>) {
    if (isReferenceMode) return // 레퍼런스 모드에서는 목표 사진이 고정, 다시 선택할 필요 없음
    const file = e.target.files?.[0]
    if (!file) return
    if (targetUrl) URL.revokeObjectURL(targetUrl)
    setTargetUrl(URL.createObjectURL(file))
    setError(null)
  }

  async function handleAutoMatch() {
    if (!myFile || !myUrl || !targetUrl) return
    setMatching(true)
    setError(null)
    try {
      // 레퍼런스 모드: 백엔드 AI(Gemini) 분석을 먼저 시도하고, 실패하면 클라이언트 근사치로 대체
      if (isReferenceMode && user) {
        try {
          let remoteUrl = myRemoteUrl
          if (!remoteUrl) {
            remoteUrl = await uploadUserPhoto(myFile, user.id)
            setMyRemoteUrl(remoteUrl)
          }
          const { data, error: fnError } = await supabase.functions.invoke('analyze-photo', {
            body: { myPhotoUrl: remoteUrl, referenceUrl: targetUrl },
          })
          if (fnError) throw fnError
          if (!data || typeof data !== 'object' || 'error' in (data as Record<string, unknown>)) {
            throw new Error((data as { error?: string } | undefined)?.error ?? 'AI 분석 결과가 올바르지 않아요.')
          }
          setRecipe(data as AdjustmentRecipe)
          return
        } catch {
          // 백엔드 함수가 아직 배포되지 않았거나 일시적으로 실패 — 조용히 로컬 근사치로 대체
        }
      }
      setRecipe(await autoMatchRecipe(myUrl, targetUrl))
    } catch (err) {
      setError(err instanceof Error ? err.message : '자동 보정에 실패했어요.')
    } finally {
      setMatching(false)
    }
  }

  async function handleSave() {
    if (!myUrl) return
    setSaving(true)
    setError(null)
    try {
      const blob = await renderAdjustedBlob(myUrl, recipe)
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
      const blob = await renderAdjustedBlob(myUrl, recipe)
      const adjustedFile = new File([blob], myFile.name || 'adjusted.jpg', { type: 'image/jpeg' })
      const adjustedUrl = URL.createObjectURL(blob)

      handedOffUrlRef.current = myUrl // 언마운트 cleanup이 이 URL을 revoke하지 않도록 표시
      resetWizard()
      setWizardFile(myFile, myUrl)
      setWizardAdjustedResult(adjustedFile, adjustedUrl, recipe, 'ai')
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

        {/* 결과 미리보기 (내 사진에 보정 적용) */}
        {myUrl && <AdjustmentPreview imageUrl={myUrl} recipe={recipe} showBefore={showBefore} />}

        <Button
          fullWidth
          icon={<Wand2 size={16} />}
          loading={matching}
          disabled={!myUrl || !targetUrl}
          onClick={handleAutoMatch}
        >
          {isReferenceMode ? 'AI 색감 보정' : '목표 색감으로 자동 보정'}
        </Button>

        {error && <p className="text-sm text-danger">{error}</p>}

        {myUrl && (
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
