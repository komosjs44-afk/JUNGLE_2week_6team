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
  PhotoEvent,
  EventEntry,
  EventResultEntry,
  NewEventEntryInput,
  MyEventParticipation,
  ChallengeTop3,
  LeafTransaction,
  LeafAwardInput,
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

export interface EventRepository {
  list(): Promise<PhotoEvent[]>
  /** 발견 페이지에 노출할 현재 진행 이벤트(SUBMISSION 우선, 없으면 VOTING). 없으면 null. */
  getCurrent(): Promise<PhotoEvent | null>
  getById(id: string): Promise<PhotoEvent | null>
  listEntries(eventId: string): Promise<EventEntry[]>
  /** 이벤트당 1회 참여 — 이미 참여했으면 그 참여작, 아니면 null. */
  getMyEntry(eventId: string, userId: string): Promise<EventEntry | null>
  submitEntry(input: NewEventEntryInput): Promise<EventEntry>
  /** 이 사용자가 이 이벤트에서 투표한 entryId 목록. */
  listMyVoteEntryIds(eventId: string, userId: string): Promise<string[]>
  vote(eventId: string, entryId: string, userId: string): Promise<void>
  /** 투표 수 기준 순위 + 순위별 수상 나뭇잎. FINISHED에서만 의미 있음. */
  getResult(eventId: string): Promise<EventResultEntry[]>
  /** MY '나의 활동' — 내가 참여한 이벤트(최신순) + 종료 시 순위/수상. */
  listMyParticipations(userId: string): Promise<MyEventParticipation[]>
  /** 랭킹용 — 가장 최근 확정(FINISHED) 이벤트의 TOP 3. 확정된 이벤트 없으면 null. */
  getLatestChallengeTop3(): Promise<ChallengeTop3 | null>
}

export interface LeafRepository {
  getBalance(userId: string): Promise<number>
  listTransactions(userId: string): Promise<LeafTransaction[]>
  /** 중복 지급 방지: 같은 (userId, reason, sourceType, sourceId) 기록이 있으면 no-op. */
  award(input: LeafAwardInput): Promise<void>
}
