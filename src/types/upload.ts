import type { AdjustmentRecipe } from './adjustment'
import type { ExifData } from './exif'
import type { PhotoLocation } from './location'

export interface NewReferenceInput {
  userId: string
  /** An existing Spot to attach to. Mutually exclusive with photoLocation. */
  spotId: string | null
  /** Where to create a new Spot from, when spotId is null. */
  photoLocation?: PhotoLocation
  newSpotName?: string
  title: string
  imageUrl: string
  /** 이미지 가로/세로 비율(width/height). 업로드 시 사용자가 고른 비율(또는 원본 비율)이 그대로 저장된다. */
  aspectRatio?: number
  tags: string[]
  direction?: number
  creatorTip?: string
  exif?: ExifData
  /** 업로더가 공개하기로 한 보정값만 여기 담긴다 — 비공개면 아예 전달하지 않는다. */
  adjustment?: AdjustmentRecipe
  /** AI 색감 재현으로 만들어진 경우, 참고한 원본 Reference id (일반 업로드는 항상 undefined) */
  sourceReferenceId?: string
}
