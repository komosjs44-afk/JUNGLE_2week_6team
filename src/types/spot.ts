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
