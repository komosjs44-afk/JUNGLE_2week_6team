import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Heart, MapPin, X } from 'lucide-react'
import { clsx } from 'clsx'
import type { Reference } from '@/types'
import { useSaveStore, useMemberGateStore } from '@/stores'
import { Button } from '@/components/common/Button'
import { IconButton } from '@/components/common/IconButton'
import { Avatar } from '@/components/common/Avatar'
import { InfoRow } from '@/components/common/InfoRow'
import { AiShootingGuide } from '@/components/reference/AiShootingGuide'
import { formatTimeOfDay } from '@/utils/format'
import { formatDirection } from '@/utils/direction'

function formatShotDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{children}</h3>
  )
}

// 갤러리 아이템이 자기 자리에서 그대로 확장된 상세 상태. 모달/라우팅이 아니라 인라인.
// 정보 우선순위: 사진 → 장소 → 촬영정보(EXIF) → AI 촬영 가이드 → 촬영자 TIP → 태그 → 작성자 → 액션.
// 데이터가 없는 항목은 row/섹션 자체를 숨긴다(빈 값 반복 표시 안 함).
export function ExpandedGalleryItem({
  reference,
  onClose,
}: {
  reference: Reference
  onClose: () => void
}) {
  const navigate = useNavigate()
  const isSaved = useSaveStore((s) => s.isReferenceSaved(reference.id))
  const toggleSave = useSaveStore((s) => s.toggleReferenceSave)
  const requireMember = useMemberGateStore((s) => s.requireMember)
  const rootRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  // 펼쳐진 아이템을 화면에 들여오고, 짧은 페이드로 "같은 게시물이 펼쳐졌다"는 걸 알려준다(과한 애니메이션 없음).
  useEffect(() => {
    setShown(true)
    const raf = requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  const exif = reference.exif
  const shotAt = exif?.shotAt ?? reference.shooting.shotAt
  const camera = [exif?.cameraMake, exif?.cameraModel].filter(Boolean).join(' ')
  const focal = exif?.focalLength ?? reference.shooting.focalLength

  const metaRows: { label: string; value: string }[] = []
  if (camera) metaRows.push({ label: 'Camera', value: camera })
  if (exif?.lensModel) metaRows.push({ label: 'Lens', value: exif.lensModel })
  if (focal) metaRows.push({ label: 'Focal Length', value: `${focal}mm` })
  if (exif?.aperture) metaRows.push({ label: 'Aperture', value: `F${exif.aperture}` })
  if (exif?.shutterSpeed) metaRows.push({ label: 'Shutter', value: String(exif.shutterSpeed) })
  if (exif?.iso) metaRows.push({ label: 'ISO', value: String(exif.iso) })
  if (shotAt) {
    metaRows.push({ label: '촬영 날짜', value: formatShotDate(shotAt) })
    metaRows.push({ label: '촬영 시간', value: formatTimeOfDay(shotAt) })
  }
  if (reference.shooting.direction !== undefined) {
    metaRows.push({ label: '촬영 방향', value: formatDirection(reference.shooting.direction) })
  }

  return (
    <div ref={rootRef} className="flex flex-col scroll-mt-2 bg-white">
      {/* 확대 이미지 — 거의 전체 폭, 원본 비율 유지, 직각 모서리 */}
      <div
        style={{ aspectRatio: reference.aspectRatio ?? 3 / 4 }}
        className="relative max-h-[82vh] w-full overflow-hidden bg-neutral-100"
      >
        <img src={reference.imageUrl} alt={reference.title} className="h-full w-full object-cover" />
        <IconButton
          variant="filled"
          aria-label="상세 닫기"
          onClick={onClose}
          className="absolute top-2 right-2"
        >
          <X size={18} />
        </IconButton>
      </div>

      <div
        className={clsx(
          'flex flex-col gap-5 px-3 pt-4 pb-6 transition-opacity duration-200',
          shown ? 'opacity-100' : 'opacity-0',
        )}
      >
        {/* 장소 — 작성자보다 우선. 사진 재현 서비스라 촬영 위치를 강조 */}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-bold text-neutral-900">{reference.spot.name}</h2>
          {reference.spot.address && <p className="text-sm text-neutral-400">{reference.spot.address}</p>}
        </div>

        {/* 촬영 정보 (EXIF) — 카드 남발 없이 metadata 리스트 하나로 */}
        {metaRows.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionTitle>촬영 정보</SectionTitle>
            <div className="divide-y divide-neutral-100 border-t border-neutral-100">
              {metaRows.map((r) => (
                <InfoRow
                  key={r.label}
                  label={r.label}
                  value={r.value}
                  icon={r.label === 'Camera' ? <Camera size={12} /> : undefined}
                />
              ))}
            </div>
          </section>
        )}

        {/* AI 촬영 가이드 — 기존 Gemini 기반 컴포넌트 재사용 (하드코딩 아님) */}
        <section className="border-t border-neutral-100 pt-4">
          <AiShootingGuide reference={reference} />
        </section>

        {/* 촬영자 TIP — AI 가이드와 출처를 구분 */}
        {reference.shooting.creatorTip && (
          <section className="flex flex-col gap-1.5 border-t border-neutral-100 pt-4">
            <SectionTitle>촬영자 TIP</SectionTitle>
            <p className="text-sm leading-relaxed text-neutral-700">{reference.shooting.creatorTip}</p>
          </section>
        )}

        {/* 태그 — 사진보다 강조하지 않음 */}
        {reference.tags.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {reference.tags.map((tag) => (
              <span key={tag} className="text-xs text-neutral-400">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 작성자 — 작게 */}
        <button
          type="button"
          onClick={() => navigate(`/users/${reference.creator.id}`)}
          className="flex items-center gap-2 self-start"
        >
          <Avatar nickname={reference.creator.nickname} avatarUrl={reference.creator.avatarUrl} size={20} />
          <span className="text-xs text-neutral-400">Photo by {reference.creator.nickname}</span>
        </button>

        {/* 액션 — 저장 / 지도에서 보기 (기존 기능·state 그대로), 그리고 핵심 CTA */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => requireMember() && toggleSave(reference.id)}
            >
              <Heart size={16} className={clsx(isSaved && 'fill-primary-600 text-primary-600')} />
              {isSaved ? '저장됨' : '저장'}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigate(`/spots/${reference.spot.id}`)}
            >
              <MapPin size={16} />
              지도에서 보기
            </Button>
          </div>
          <Button size="lg" fullWidth onClick={() => navigate(`/references/${reference.id}/recreate`)}>
            이 사진처럼 찍기
          </Button>
        </div>
      </div>
    </div>
  )
}
