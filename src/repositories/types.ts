import type {
  Reference,
  Spot,
  Route,
  RankingEntry,
  RankingTab,
  User,
  FollowCounts,
  NewReferenceInput,
  NewSpotInput,
  Comment,
  NewCommentInput,
  AiShootingGuide,
} from '@/types'

export type DiscoverTab = 'recommended' | 'popular' | 'nearby' | 'new'

export interface ReferenceRepository {
  list(tab?: DiscoverTab): Promise<Reference[]>
  getById(id: string): Promise<Reference | null>
  getBySpotId(spotId: string): Promise<Reference[]>
  create(input: NewReferenceInput): Promise<Reference>
  remove(id: string): Promise<void>
  /** AI 촬영 가이드를 캐싱한다 — 컬럼이 아직 없어도 조용히 실패할 뿐 절대 throw하지 않는다. */
  saveShootingGuide(id: string, guide: AiShootingGuide): Promise<void>
}

export interface ProfileUpdate {
  nickname?: string
  bio?: string
  website?: string
}

export interface SpotRepository {
  list(query?: string): Promise<Spot[]>
  getById(id: string): Promise<Spot | null>
  create(input: NewSpotInput): Promise<Spot>
}

export interface RouteRepository {
  getRecommended(): Promise<Route>
}

export interface RankingRepository {
  getEntries(tab: RankingTab): Promise<RankingEntry[]>
}

export interface AuthRepository {
  login(email: string, password: string): Promise<User>
  signup(nickname: string, email: string, password: string): Promise<User>
  logout(): Promise<void>
  updateProfile(userId: string, patch: ProfileUpdate): Promise<User>
  getById(userId: string): Promise<User | null>
}

export interface FollowRepository {
  listFollowingIds(userId: string): Promise<string[]>
  listFollowers(userId: string): Promise<User[]>
  listFollowing(userId: string): Promise<User[]>
  follow(followerId: string, targetId: string): Promise<void>
  unfollow(followerId: string, targetId: string): Promise<void>
  getCounts(userId: string): Promise<FollowCounts>
}

export interface CommentRepository {
  list(referenceId: string): Promise<Comment[]>
  create(input: NewCommentInput): Promise<Comment>
}

export interface SaveRepository {
  listSpotIds(userId: string): Promise<string[]>
  listReferenceIds(userId: string): Promise<string[]>
  addSpot(userId: string, spotId: string): Promise<void>
  removeSpot(userId: string, spotId: string): Promise<void>
  addReference(userId: string, referenceId: string): Promise<void>
  removeReference(userId: string, referenceId: string): Promise<void>
}
