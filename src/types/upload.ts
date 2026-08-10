import type { ExifData } from './exif'

export interface NewReferenceInput {
  userId: string
  spotId: string | null
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
