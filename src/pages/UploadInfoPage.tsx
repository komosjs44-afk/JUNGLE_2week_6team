import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useUploadWizardStore, useAuthStore } from '@/stores'
import { useCreateReference } from '@/hooks'
import { compressImage } from '@/features/upload/compressImage'
import { RECOMMENDED_TAGS } from '@/mocks'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'
import { Input, Textarea } from '@/components/common/Input'
import { Tag } from '@/components/common/Tag'

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
    exif,
    spotId,
    direction,
    creatorTip,
    tags,
    title,
    setDirection,
    setCreatorTip,
    toggleTag,
    setTitle,
  } = useUploadWizardStore()
  const { mutateAsync, isPending, error } = useCreateReference()
  const [isCompressing, setIsCompressing] = useState(false)

  useEffect(() => {
    if (!file || !spotId) navigate('/upload', { replace: true })
  }, [file, spotId, navigate])

  async function handleSubmit() {
    if (!user || !file || !previewUrl || !spotId) return

    setIsCompressing(true)
    const compressed = await compressImage(file)
    const imageUrl = URL.createObjectURL(compressed)
    setIsCompressing(false)

    await mutateAsync({
      userId: user.id,
      spotId,
      title: title.trim() || '제목 없는 참고 사진',
      imageUrl,
      tags,
      direction: direction ?? undefined,
      creatorTip: creatorTip.trim() || undefined,
      exif: exif ?? undefined,
    })

    navigate('/upload/complete')
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="추가 정보 입력" />
      <ProgressBar step={4} total={5} />

      <div className="flex flex-1 flex-col gap-5 px-4 py-4">
        <Input label="제목" placeholder="예) 성수 연무장길 노을" value={title} onChange={(e) => setTitle(e.target.value)} />

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
