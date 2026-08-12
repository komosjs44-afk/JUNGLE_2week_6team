import type { ReferenceRepository, DiscoverTab, ReferenceListOptions } from '../types'
import type { Reference } from '@/types'
import { MOCK_REFERENCES, getUserById } from '@/mocks'
import { haversineMeters } from '@/utils/spotMatching'
import { mockDelay } from './delay'
import { mockSpotRepository } from './spotRepository'

const store: Reference[] = [...MOCK_REFERENCES]
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function sortForTab(list: Reference[], tab?: DiscoverTab, options?: ReferenceListOptions): Reference[] {
  const copy = [...list]
  const bySavesThenNew = (a: Reference, b: Reference) =>
    b.likeCount - a.likeCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  switch (tab) {
    case 'popular': {
      const weekAgo = Date.now() - WEEK_MS
      const recent = copy.filter((r) => new Date(r.createdAt).getTime() >= weekAgo)
      return (recent.length > 0 ? recent : copy).sort(bySavesThenNew)
    }
    case 'new':
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    case 'nearby': {
      const loc = options?.location
      if (!loc) return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return copy.sort(
        (a, b) =>
          haversineMeters({ lat: loc.latitude, lng: loc.longitude }, { lat: a.spot.latitude, lng: a.spot.longitude }) -
          haversineMeters({ lat: loc.latitude, lng: loc.longitude }, { lat: b.spot.latitude, lng: b.spot.longitude }),
      )
    }
    case 'recommended':
    default:
      return copy.sort(bySavesThenNew)
  }
}

export const mockReferenceRepository: ReferenceRepository = {
  async list(tab, options) {
    return mockDelay(sortForTab(store, tab, options))
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
      aspectRatio: input.aspectRatio,
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

  async remove(id) {
    const idx = store.findIndex((r) => r.id === id)
    if (idx >= 0) store.splice(idx, 1)
    return mockDelay(undefined, 200)
  },

  async saveShootingGuide(id, guide) {
    const reference = store.find((r) => r.id === id)
    if (reference) reference.aiShootingGuide = guide
    return mockDelay(undefined, 200)
  },
}
