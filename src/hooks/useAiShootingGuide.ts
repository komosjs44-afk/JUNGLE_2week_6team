import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { referenceService } from '@/services'
import type { AiShootingGuide, Reference } from '@/types'
import { formatDirection } from '@/utils/direction'
import { formatDaypart, formatFocalLength, formatTimeOfDay } from '@/utils/format'

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
      const { data, error } = await supabase.functions.invoke('shooting-guide', {
        body: { imageUrl: reference.imageUrl, context: buildContext(reference) },
      })
      if (error) throw error
      if (!data || typeof data !== 'object' || 'error' in (data as Record<string, unknown>)) {
        throw new Error((data as { error?: string } | undefined)?.error ?? 'AI 촬영 가이드를 생성하지 못했어요.')
      }
      const guide = data as AiShootingGuide

      // 캐시 저장은 실패해도 무시 — 이미 생성된 가이드는 화면에 그대로 보여줄 수 있음
      void referenceService.saveShootingGuide(reference.id, guide).catch(() => {})

      return guide
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference', reference.id] })
    },
  })
}
