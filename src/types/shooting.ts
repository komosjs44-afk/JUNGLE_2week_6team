export interface ShootingGuide {
  distanceMeters: number
  direction: number
  directionLabel: string
  recommendedTimeRange: string
  recommendedFocalLength: string
  compositionTip: string
  cameraSetting: {
    focalLength: number
    aperture: number
    iso: number
    shutterSpeed: string
  }
}

export type ShootingModeId = 'normal' | 'portrait' | 'night' | 'cinematic' | 'panorama'

export interface ShootingMode {
  id: ShootingModeId
  name: string
  description: string
  recommendedFor: string[]
  tip: string
}
