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
  tags: string[]
  direction?: number
  creatorTip?: string
  exif?: ExifData
}
