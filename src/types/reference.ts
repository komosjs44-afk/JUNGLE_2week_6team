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
