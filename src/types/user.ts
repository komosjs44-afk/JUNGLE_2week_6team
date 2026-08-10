export interface User {
  id: string
  nickname: string
  email: string
  avatarUrl: string | null
  bio?: string
  website?: string
  createdAt?: string
}
