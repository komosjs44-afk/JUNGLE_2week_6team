import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Wand2, Download, ImagePlus, ArrowRight } from 'lucide-react'
import type { AdjustmentRecipe } from '@/types'
import { ADJUSTMENT_RANGES, DEFAULT_ADJUSTMENT_RECIPE } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdjustmentPreview } from '@/components/adjustment/AdjustmentPreview'
import { Slider } from '@/components/common/Slider'
import { Button } from '@/components/common/Button'
import { autoMatchRecipe, renderAdjustedBlob } from '@/utils/colorMatch'

const LABELS: Record<keyof AdjustmentRecipe, string> = {
  exposure: 'Exposure',
  contrast: 'Contrast',
  highlights: 'Highlights',
  shadows: 'Shadows',
  saturation: 'Saturation',
  temperature: 'Temperature',
}

export function AiAdjustPage() {
  const location = useLocation()
  // 피드(레퍼런스 상세)에서 "이 색감으로 보정"으로 넘어온 경우, 그 사진을 목표 색감으로 사용
  const initialTarget = (location.state as { targetUrl?: string } | null)?.targetUrl ?? null
  const [myUrl, setMyUrl] = useState<string | null>(null)
  const [targetUrl, setTargetUrl] = useState<string | null>(initialTarget)
  const [recipe, setRecipe] = useState<AdjustmentRecipe>({ ...DEFAULT_ADJUSTMENT_RECIPE })
  const [showBefore, setShowBefore] = useState(false)
  const [matching, setMatching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const myInputRef = useRef<HTMLInputElement>(null)
  const targetInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (myUrl) URL.revokeObjectURL(myUrl)
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
    setMyUrl(URL.createObjectURL(file))
    setRecipe({ ...DEFAULT_ADJUSTMENT_RECIPE })
    setError(null)
  }
  function pickTarget(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (targetUrl) URL.revokeObjectURL(targetUrl)
    setTargetUrl(URL.createObjectURL(file))
    setError(null)
  }

  async function handleAutoMatch() {
    if (!myUrl || !targetUrl) return
    setMatching(true)
    setError(null)
    try {
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

  function setValue(key: keyof AdjustmentRecipe, value: number) {
    setRecipe((r) => ({ ...r, [key]: value }))
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="AI 색감 보정" />

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* 두 사진 업로드: 목표 색감 → 내 사진 (목표 색을 내 사진에 적용) */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <PhotoSlot
              label="목표 색감"
              url={targetUrl}
              onClick={() => targetInputRef.current?.click()}
            />
          </div>
          <ArrowRight size={22} className="shrink-0 text-neutral-400" />
          <div className="flex-1">
            <PhotoSlot label="내 사진" url={myUrl} onClick={() => myInputRef.current?.click()} />
          </div>
        </div>
        <input ref={myInputRef} type="file" accept="image/*" hidden onChange={pickMy} />
        <input ref={targetInputRef} type="file" accept="image/*" hidden onChange={pickTarget} />

        {/* 결과 미리보기 (내 사진에 보정 적용) */}
        {myUrl && <AdjustmentPreview imageUrl={myUrl} recipe={recipe} showBefore={showBefore} />}

        <Button
          fullWidth
          icon={<Wand2 size={16} />}
          loading={matching}
          disabled={!myUrl || !targetUrl}
          onClick={handleAutoMatch}
        >
          목표 색감으로 자동 보정
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

            <div className="flex flex-col gap-4">
              {(Object.keys(LABELS) as (keyof AdjustmentRecipe)[]).map((key) => (
                <Slider
                  key={key}
                  label={LABELS[key]}
                  value={recipe[key]}
                  min={ADJUSTMENT_RANGES[key].min}
                  max={ADJUSTMENT_RANGES[key].max}
                  step={ADJUSTMENT_RANGES[key].step}
                  onChange={(v) => setValue(key, v)}
                />
              ))}
            </div>

            <Button fullWidth icon={<Download size={16} />} loading={saving} onClick={handleSave}>
              보정 사진 저장
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function PhotoSlot({ label, url, onClick }: { label: string; url: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-neutral-50"
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
