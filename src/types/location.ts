export interface DeviceLocation {
  latitude: number
  longitude: number
  accuracy?: number
}

/**
 * A photo's shooting location — from EXIF GPS, a place search result, or a manual map pick.
 * Never device geolocation (that's DeviceLocation). Uploading a photo creates a new Spot from
 * this; it is not required to match an existing one.
 */
export interface PhotoLocation {
  latitude: number
  longitude: number
  address?: string
  placeName?: string
  source: 'exif' | 'search' | 'map'
}

/** A registered Spot found within the matching distance of a PhotoLocation — advisory only. */
export interface MatchedSpot {
  spotId: string
  distanceMeters: number
}
