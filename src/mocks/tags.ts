import type { Tag } from '@/types'

export const MOCK_TAGS: Tag[] = [
  { id: 'tag-1', name: '노을' },
  { id: 'tag-2', name: '야경' },
  { id: 'tag-3', name: '인물' },
  { id: 'tag-4', name: '레트로' },
  { id: 'tag-5', name: '한옥' },
  { id: 'tag-6', name: '도시' },
  { id: 'tag-7', name: '자연' },
  { id: 'tag-8', name: '골목' },
]

export const RECOMMENDED_TAGS = MOCK_TAGS.map((t) => t.name)
