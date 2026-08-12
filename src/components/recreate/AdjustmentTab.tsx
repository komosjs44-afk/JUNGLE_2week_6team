import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { RotateCcw, Wand2, Upload, Download } from 'lucide-react'
import type { AdjustmentRecipe, Reference } from '@/types'
import { ADJUSTMENT_RANGES, DEFAULT_ADJUSTMENT_RECIPE } from '@/types'
import { useAdjustmentStore } from '@/stores'
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

export function AdjustmentTab({ reference }: { reference: Reference }) {
  const { recipe, setValue, reset } = useAdjustmentStore()
  const [showBefore, setShowBefore] = useState(false)
  const [myPhotoUrl, setMyPhotoUrl] = useState<string | null>(null)
  const [matching, setMatching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 내 사진이 없으면 레퍼런스에, 있으면 내 사진에 보정을 적용
  const targetUrl = myPhotoUrl ?? reference.imageUrl

  useEffect(() => {
    reset(reference.adjustment ?? DEFAULT_ADJUSTMENT_RECIPE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference.id])

  // object URL 정리
  useEffect(() => {
    return () => {
      if (myPhotoUrl) URL.revokeObjectURL(myPhotoUrl)
    }
  }, [myPhotoUrl])

  function onPickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (myPhotoUrl) URL.revokeObjectURL(myPhotoUrl)
    setMyPhotoUrl(URL.createObjectURL(file))
    setError(null)
    reset(DEFAULT_ADJUSTMENT_RECIPE)
  }

  async function handleAutoMatch() {
    if (!myPhotoUrl) return
    setMatching(true)
    setError(null)
    try {
      const matched = await autoMatchRecipe(myPhotoUrl, reference.imageUrl)
      reset(matched)
    } catch (err) {
      setError(err instanceof Error ? err.message : '자동 보정에 실패했어요.')
    } finally {
      setMatching(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const blob = await renderAdjustedBlob(targetUrl, recipe)
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

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* 레퍼런스(목표 색감) */}
      <div className="flex items-center gap-3 rounded-[12px] border border-neutral-100 p-3">
        <img
          src={reference.imageUrl}
          alt={reference.title}
          className="h-14 w-14 rounded-xl object-cover"
        />
        <div className="min-w-0">
          <p className="text-xs text-neutral-400">목표 색감 (레퍼런스)</p>
          <p className="truncate text-sm font-semibold text-neutral-900">{reference.title}</p>
        </div>
      </div>

      {/* 내 사진 미리보기 (없으면 레퍼런스 미리보기) */}
      <AdjustmentPreview imageUrl={targetUrl} recipe={recipe} showBefore={showBefore} />

      {!myPhotoUrl && (
        <p className="text-center text-xs text-neutral-400">
          내 사진을 올리면 레퍼런스 색감에 맞춰 자동 보정할 수 있어요.
        </p>
      )}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickPhoto} />

      {/* 내 사진 올리기 / 자동 보정 */}
      <div className="flex flex-col gap-2">
        <Button variant="secondary" fullWidth icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>
          {myPhotoUrl ? '다른 사진 선택' : '내 사진 올리기'}
        </Button>
        <Button
          fullWidth
          icon={<Wand2 size={16} />}
          loading={matching}
          disabled={!myPhotoUrl}
          onClick={handleAutoMatch}
        >
          레퍼런스 색감으로 자동 보정
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

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

      <div className="flex flex-col gap-2">
        <Button fullWidth icon={<Download size={16} />} loading={saving} onClick={handleSave}>
          보정 사진 저장
        </Button>
        <Button
          variant="secondary"
          fullWidth
          icon={<RotateCcw size={16} />}
          onClick={() => reset(myPhotoUrl ? DEFAULT_ADJUSTMENT_RECIPE : reference.adjustment ?? DEFAULT_ADJUSTMENT_RECIPE)}
        >
          초기화
        </Button>
      </div>
    </div>
  )
}
