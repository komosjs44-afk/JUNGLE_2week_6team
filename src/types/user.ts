export interface User {
  id: string
  nickname: string
  email: string
  avatarUrl: string | null
  bio?: string
  website?: string
  createdAt?: string
}

export interface FollowCounts {
  followers: number
  following: number
}
