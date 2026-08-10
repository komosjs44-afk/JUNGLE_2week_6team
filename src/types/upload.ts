import type { ExifData } from './exif'

export interface NewReferenceInput {
  userId: string
  spotId: string | null
  newSpotName?: string
  title: string
  imageUrl: string
  tags: string[]
  direction?: number
  creatorTip?: string
  exif?: ExifData
}
