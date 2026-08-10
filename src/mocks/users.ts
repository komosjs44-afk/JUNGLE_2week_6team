import type { User } from '@/types'

export const CURRENT_USER: User = {
  id: 'user-1',
  nickname: 'hyun_photo',
  email: 'test@example.com',
  avatarUrl: null,
  bio: '필름 느낌 좋아하는 서울 산책러',
  createdAt: '2025-11-02T09:00:00Z',
}

export const MOCK_USERS: User[] = [
  CURRENT_USER,
  {
    id: 'user-2',
    nickname: 'minji.log',
    email: 'minji@example.com',
    avatarUrl: null,
    bio: '노을과 골목을 기록합니다',
    createdAt: '2025-08-14T09:00:00Z',
  },
  {
    id: 'user-3',
    nickname: 'seoul_night',
    email: 'night@example.com',
    avatarUrl: null,
    bio: '야경 전문',
    createdAt: '2025-06-21T09:00:00Z',
  },
  {
    id: 'user-4',
    nickname: 'film.grain',
    email: 'film@example.com',
    avatarUrl: null,
    bio: '필름 카메라 + 디지털 보정',
    createdAt: '2025-09-30T09:00:00Z',
  },
  {
    id: 'user-5',
    nickname: 'urban.eye',
    email: 'urban@example.com',
    avatarUrl: null,
    bio: '도시 건축 사진',
    createdAt: '2025-05-11T09:00:00Z',
  },
  {
    id: 'user-6',
    nickname: 'golmok_walker',
    email: 'golmok@example.com',
    avatarUrl: null,
    bio: '동네 골목 산책 기록',
    createdAt: '2025-07-19T09:00:00Z',
  },
]

export function getUserById(id: string): User | undefined {
  return MOCK_USERS.find((u) => u.id === id)
}
