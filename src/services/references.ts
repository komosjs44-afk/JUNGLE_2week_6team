import { mockReferenceRepository } from '@/repositories/mock'
import type { ReferenceRepository } from '@/repositories/types'

// Swap this line for an ApiRepository implementation once the backend is ready.
export const referenceService: ReferenceRepository = mockReferenceRepository
