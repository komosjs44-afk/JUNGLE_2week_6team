import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { referenceService } from '@/services'
import type { AiShootingGuide, Reference } from '@/types'
import { formatDirection } from '@/utils/direction'
import { formatDaypart, formatFocalLength, formatTimeOfDay } from '@/utils/format'
import { generateLocalGuide } from '@/features/shootingguide/localGuide'

// Gemini에 보낼 정보는 실제로 값이 있는 필드만 담는다 — 없는 항목을 억지로 채우거나
// 기본값을 지어내지 않는다(값이 없으면 키 자체를 안 넣음).
function buildContext(reference: Reference): Record<string, unknown> {
  const context: Record<string, unknown> = {}

  if (reference.spot.name) context.spotName = reference.spot.name
  if (reference.spot.address) context.spotAddress = reference.spot.address

  if (reference.shooting.shotAt) {
    context.timeOfDay = formatTimeOfDay(reference.shooting.shotAt)
    context.daypart = formatDaypart(reference.shooting.shotAt)
  }

  if (reference.shooting.direction !== undefined) {
    context.directionLabel = formatDirection(reference.shooting.direction)
  }

  const focalLength = reference.exif?.focalLength ?? reference.shooting.focalLength
  if (focalLength) context.focalLengthLabel = formatFocalLength(focalLength)

  if (reference.exif?.iso) context.iso = reference.exif.iso
  if (reference.exif?.shutterSpeed) context.shutterSpeed = reference.exif.shutterSpeed
  if (reference.exif?.aperture) context.aperture = reference.exif.aperture
  if (reference.exif?.cameraMake || reference.exif?.cameraModel) {
    context.camera = [reference.exif.cameraMake, reference.exif.cameraModel].filter(Boolean).join(' ')
  }

  if (reference.shooting.creatorTip) context.creatorTip = reference.shooting.creatorTip
  if (reference.tags.length > 0) context.tags = reference.tags
  if (reference.adjustment) context.hasSavedColorAdjustment = true

  return context
}

export function useAiShootingGuide(reference: Reference) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<AiShootingGuide> => {
      // 1) Gemini(shooting-guide) 우선 시도 — 배포돼 있으면 가장 풍부한 문장 가이드
      try {
        const { data, error } = await supabase.functions.invoke('shooting-guide', {
          body: { imageUrl: reference.imageUrl, context: buildContext(reference) },
        })
        if (error) throw error
        if (!data || typeof data !== 'object' || 'error' in (data as Record<string, unknown>)) {
          throw new Error((data as { error?: string } | undefined)?.error ?? 'AI 촬영 가이드를 생성하지 못했어요.')
        }
        const guide = data as AiShootingGuide
        // Gemini 결과만 캐시한다 — 온디바이스 폴백은 저장하지 않아, 함수 배포 후 Gemini가 다시 쓰이게 함
        void referenceService.saveShootingGuide(reference.id, guide).catch(() => {})
        queryClient.invalidateQueries({ queryKey: ['reference', reference.id] })
        return guide
      } catch {
        // 2) 함수 미배포/실패 → 온디바이스(세그멘테이션+메타데이터)로 폴백해 항상 가이드를 제공
        return generateLocalGuide(reference)
      }
    },
  })
}
