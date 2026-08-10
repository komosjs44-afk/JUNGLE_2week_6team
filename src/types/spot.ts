export interface Spot {
  id: string
  name: string
  address: string
  description?: string
  imageUrl: string
  latitude: number
  longitude: number
  tags: string[]
  recommendedTime?: string
  referenceCount: number
  createdAt: string
}

/** Fields needed to register a brand-new Spot, e.g. from an uploaded photo's location. */
export interface NewSpotInput {
  name: string
  address?: string
  latitude: number
  longitude: number
  imageUrl: string
  tags?: string[]
}
