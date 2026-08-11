import type { User } from './user'
import type { Spot } from './spot'
import type { ExifData } from './exif'
import type { AdjustmentRecipe } from './adjustment'

export interface Reference {
  id: string
  userId: string
  spotId: string

  title: string
  imageUrl: string

  /** 이 Reference가 참고해서 AI로 재현된 원본 Reference의 id (없으면 Original Reference) */
  sourceReferenceId?: string

  creator: User
  spot: Spot

  tags: string[]

  shooting: {
    shotAt?: string
    direction?: number
    focalLength?: number
    creatorTip?: string
  }

  exif?: ExifData

  adjustment?: AdjustmentRecipe

  likeCount: number
  commentCount: number

  createdAt: string
}
