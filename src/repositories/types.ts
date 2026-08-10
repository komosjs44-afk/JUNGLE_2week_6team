import type {
  Reference,
  Spot,
  Route,
  RankingEntry,
  RankingTab,
  User,
  NewReferenceInput,
  NewSpotInput,
} from '@/types'

export type DiscoverTab = 'recommended' | 'popular' | 'nearby' | 'new'

export interface ReferenceRepository {
  list(tab?: DiscoverTab): Promise<Reference[]>
  getById(id: string): Promise<Reference | null>
  getBySpotId(spotId: string): Promise<Reference[]>
  create(input: NewReferenceInput): Promise<Reference>
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
}
