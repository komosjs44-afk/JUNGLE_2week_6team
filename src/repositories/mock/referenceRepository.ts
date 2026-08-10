import type { ReferenceRepository, DiscoverTab } from '../types'
import type { Reference } from '@/types'
import { MOCK_REFERENCES, getUserById } from '@/mocks'
import { mockDelay } from './delay'
import { mockSpotRepository } from './spotRepository'

const store: Reference[] = [...MOCK_REFERENCES]

function pseudoDistanceRank(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 997
  return hash
}

function sortForTab(list: Reference[], tab?: DiscoverTab): Reference[] {
  const copy = [...list]
  switch (tab) {
    case 'popular':
      return copy.sort((a, b) => b.likeCount - a.likeCount)
    case 'new':
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    case 'nearby':
      return copy.sort((a, b) => pseudoDistanceRank(a.id) - pseudoDistanceRank(b.id))
    case 'recommended':
    default:
      return copy.sort((a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount))
  }
}

export const mockReferenceRepository: ReferenceRepository = {
  async list(tab) {
    return mockDelay(sortForTab(store, tab))
  },

  async getById(id) {
    return mockDelay(store.find((r) => r.id === id) ?? null)
  },

  async getBySpotId(spotId) {
    return mockDelay(store.filter((r) => r.spotId === spotId))
  },

  async create(input) {
    const creator = getUserById(input.userId)
    if (!creator) throw new Error('알 수 없는 사용자예요.')

    let spot = input.spotId ? await mockSpotRepository.getById(input.spotId) : null

    // No existing Spot chosen — uploading a photo with a location creates a brand-new Spot,
    // it's never required to match one that's already registered.
    if (!spot && input.photoLocation) {
      spot = await mockSpotRepository.create({
        name:
          input.newSpotName?.trim() ||
          input.photoLocation.placeName ||
          input.photoLocation.address ||
          '새로운 촬영 스팟',
        address: input.photoLocation.address,
        latitude: input.photoLocation.latitude,
        longitude: input.photoLocation.longitude,
        imageUrl: input.imageUrl,
        tags: input.tags,
      })
    }

    if (!spot) throw new Error('촬영 위치 정보가 없어요.')

    const newReference: Reference = {
      id: `ref-new-${Date.now()}`,
      userId: input.userId,
      spotId: spot.id,
      title: input.title,
      imageUrl: input.imageUrl,
      creator,
      spot,
      tags: input.tags,
      shooting: {
        shotAt: input.exif?.shotAt,
        direction: input.direction,
        focalLength: input.exif?.focalLength,
        creatorTip: input.creatorTip,
      },
      exif: input.exif,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    }

    store.unshift(newReference)
    return mockDelay(newReference, 500)
  },
}
