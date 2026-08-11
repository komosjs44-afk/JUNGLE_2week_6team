import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { CheckCircle2 } from 'lucide-react'
import { DEFAULT_ADJUSTMENT_RECIPE } from '@/types'
import { useUploadWizardStore, useAuthStore } from '@/stores'
import { useCreateReference } from '@/hooks'
import { compressImage } from '@/features/upload/compressImage'
import { uploadReferenceImage } from '@/features/upload/uploadImage'
import { renderAdjustedBlob } from '@/utils/colorMatch'
import { RECOMMENDED_TAGS } from '@/mocks'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'
import { Input, Textarea } from '@/components/common/Input'
import { Tag } from '@/components/common/Tag'
import { Switch } from '@/components/common/Switch'
import { UploadPhotoPreview } from '@/components/upload/UploadPhotoPreview'
import { AdjustmentPreview } from '@/components/adjustment/AdjustmentPreview'
import { AdjustmentSliders } from '@/components/adjustment/AdjustmentSliders'

const DIRECTIONS: { label: string; degrees: number }[] = [
  { label: '북', degrees: 0 },
  { label: '북동', degrees: 45 },
  { label: '동', degrees: 90 },
  { label: '남동', degrees: 135 },
  { label: '남', degrees: 180 },
  { label: '남서', degrees: 225 },
  { label: '서', degrees: 270 },
  { label: '북서', degrees: 315 },
]

export function UploadInfoPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const {
    file,
    previewUrl,
    adjustedFile,
    exif,
    spotId,
    photoLocation,
    newSpotName,
    direction,
    creatorTip,
    tags,
    title,
    adjustmentRecipe,
    adjustmentSource,
    adjustmentPublic,
    sourceReferenceId,
    setDirection,
    setCreatorTip,
    toggleTag,
    setTitle,
    setNewSpotName,
    setAdjustment,
    setAdjustmentValue,
    setAdjustmentPublic,
  } = useUploadWizardStore()
  const { mutateAsync, isPending, error } = useCreateReference()
  const [isCompressing, setIsCompressing] = useState(false)

  useEffect(() => {
    if (!file || (!spotId && !photoLocation)) navigate('/upload', { replace: true })
  }, [file, spotId, photoLocation, navigate])

  // 새 스팟(기존 spotId 없음) 생성 시 이름이 필요 — 확인된 장소명/주소로 기본값 채움
  useEffect(() => {
    if (spotId || !photoLocation || newSpotName) return
    setNewSpotName(photoLocation.placeName ?? photoLocation.address ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotId, photoLocation])

  function handlePickManualAdjust() {
    if (!adjustmentRecipe) setAdjustment({ ...DEFAULT_ADJUSTMENT_RECIPE }, 'manual')
  }
  function handlePickOriginal() {
    setAdjustment(null, null)
    setAdjustmentPublic(false)
  }

  async function handleSubmit() {
    if (!user || !file || !previewUrl || (!spotId && !photoLocation)) return

    setIsCompressing(true)
    // 업로드할 실제 이미지: AI 흐름에서 이미 만들어진 adjustedFile이 있으면 그걸 그대로 쓰고,
    // 없고 보정값만 있으면(B 수동보정) 지금 렌더링해서 만든다. 원본 File(EXIF)은 건드리지 않는다.
    let sourceFile = adjustedFile ?? file
    if (!adjustedFile && adjustmentRecipe) {
      sourceFile = new File([await renderAdjustedBlob(previewUrl, adjustmentRecipe)], file.name || 'photo.jpg', {
        type: 'image/jpeg',
      })
    }
    const compressed = await compressImage(sourceFile)
    // 임시 blob URL 대신 Storage에 업로드해서 영구 public URL 사용
    const imageUrl = await uploadReferenceImage(compressed, user.id)
    setIsCompressing(false)

    await mutateAsync({
      userId: user.id,
      spotId,
      // 기존 스팟이 없으면 촬영 위치(photoLocation)로 새 장소 생성
      photoLocation: spotId ? undefined : (photoLocation ?? undefined),
      newSpotName: spotId ? undefined : newSpotName.trim() || undefined,
      title: title.trim() || '제목 없는 참고 사진',
      imageUrl,
      tags,
      direction: direction ?? undefined,
      creatorTip: creatorTip.trim() || undefined,
      exif: exif ?? undefined,
      // 공개하지 않기로 했으면 보정값 자체를 아예 보내지 않는다 (opt-in)
      adjustment: adjustmentPublic ? (adjustmentRecipe ?? undefined) : undefined,
      sourceReferenceId: sourceReferenceId ?? undefined,
    })

    navigate('/upload/complete')
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="추가 정보 입력" />
      <ProgressBar step={4} total={5} />
      <UploadPhotoPreview />

      <div className="flex flex-1 flex-col gap-5 px-4 py-4">
        <Input label="제목" placeholder="예) 성수 연무장길 노을" value={title} onChange={(e) => setTitle(e.target.value)} />

        {!spotId && photoLocation && (
          <Input
            label="새 스팟 이름"
            placeholder="예) 크래프톤 정글 캠퍼스"
            value={newSpotName}
            onChange={(e) => setNewSpotName(e.target.value)}
          />
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-700">촬영 방향</span>
          <div className="grid grid-cols-4 gap-2">
            {DIRECTIONS.map((d) => (
              <button
                key={d.degrees}
                type="button"
                onClick={() => setDirection(d.degrees)}
                className={clsx(
                  'min-h-[44px] rounded-xl border text-sm font-medium transition-colors',
                  direction === d.degrees
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-neutral-200 text-neutral-600',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="기고자 팁"
          placeholder="어떻게 촬영했는지 알려주세요 (최대 200자)"
          maxLength={200}
          value={creatorTip}
          onChange={(e) => setCreatorTip(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-700">태그 (최대 5개)</span>
          <div className="flex flex-wrap gap-2">
            {RECOMMENDED_TAGS.map((t) => (
              <Tag key={t} as="button" selected={tags.includes(t)} onClick={() => toggleTag(t)}>
                {t}
              </Tag>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-neutral-700">사진 보정</span>

          {adjustmentSource === 'ai' ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">
              <CheckCircle2 size={15} />
              AI 보정이 적용되었습니다
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePickOriginal}
                className={clsx(
                  'min-h-[44px] flex-1 rounded-xl border text-sm font-medium transition-colors',
                  !adjustmentRecipe
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-neutral-200 text-neutral-600',
                )}
              >
                원본 그대로
              </button>
              <button
                type="button"
                onClick={handlePickManualAdjust}
                className={clsx(
                  'min-h-[44px] flex-1 rounded-xl border text-sm font-medium transition-colors',
                  adjustmentRecipe
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-neutral-200 text-neutral-600',
                )}
              >
                직접 보정
              </button>
            </div>
          )}

          {adjustmentRecipe && (
            <div className="flex flex-col gap-3">
              {/* AI 흐름은 상단 UploadPhotoPreview가 이미 보정된 사진을 보여주므로 여기서 다시 그리지 않는다 */}
              {adjustmentSource === 'manual' && previewUrl && (
                <AdjustmentPreview imageUrl={previewUrl} recipe={adjustmentRecipe} />
              )}
              {adjustmentSource === 'manual' && (
                <AdjustmentSliders recipe={adjustmentRecipe} onChange={setAdjustmentValue} />
              )}

              <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">내 보정값을 다른 사용자에게 공개</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    공개하면 다른 사용자가 이 사진의 색감을 재현할 때 참고할 수 있어요.
                  </p>
                </div>
                <Switch checked={adjustmentPublic} onChange={setAdjustmentPublic} aria-label="보정값 공개" />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error instanceof Error ? error.message : '등록에 실패했어요.'}</p>}
      </div>

      <StickyActionBar>
        <Button fullWidth loading={isPending || isCompressing} onClick={handleSubmit}>
          다음
        </Button>
      </StickyActionBar>
    </div>
  )
}
