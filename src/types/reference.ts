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
  /** 이미지 가로/세로 비율(width/height). 피드·상세에서 이 비율대로 보여준다. 없으면 3/4로 대체. */
  aspectRatio?: number

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
