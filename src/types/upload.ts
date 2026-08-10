import type { ExifData } from './exif'
import type { PhotoLocation } from './location'

export interface NewReferenceInput {
  userId: string
  /** An existing Spot to attach to. Mutually exclusive with photoLocation. */
  spotId: string | null
  /** Where to create a new Spot from, when spotId is null. */
  photoLocation?: PhotoLocation
  newSpotName?: string
  // 새 장소를 만들 때의 좌표·주소 (지도 선택/장소 검색 결과)
  newSpotLat?: number
  newSpotLng?: number
  newSpotAddress?: string
  title: string
  imageUrl: string
  tags: string[]
  direction?: number
  creatorTip?: string
  exif?: ExifData
}
