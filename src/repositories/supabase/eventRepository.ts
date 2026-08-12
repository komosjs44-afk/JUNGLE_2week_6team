import type { EventRepository } from '../types'
import type {
  ChallengeTop3,
  EventEntry,
  EventResultEntry,
  EventReward,
  EventType,
  MyEventParticipation,
  PhotoEvent,
  User,
} from '@/types'
import { getEventStatus } from '@/types'
import { rewardForRank } from '@/config/rewards'
import { supabase } from '@/lib/supabase'
import { supabaseLeafRepository } from './leafRepository'

// ============================================================
// 이벤트/챌린지 Supabase 구현 (docs/supabase-events.sql 실행 후 활성화).
// 참여작은 event_entries + references + profiles 를 조립해 EventEntry 로 만든다.
// 서비스 전환: src/services/events.ts 의 import 를 이 구현으로 교체.
// ============================================================

interface EventRow {
  id: string
  type: string
  label: string
  title: string
  description: string
  submission_start_at: string
  submission_end_at: string
  voting_start_at: string
  voting_end_at: string
  result_at: string
  rewards: EventReward[]
  votes_per_user: number
  created_at: string
}

interface EntryRow {
  id: string
  event_id: string
  user_id: string
  reference_id: string
  vote_count: number
  created_at: string
}

interface RefRow {
  id: string
  image_url: string
  title: string
  user_id: string
}

interface ProfileRow {
  id: string
  nickname: string
  email: string
  avatar_url: string | null
  bio: string | null
  website: string | null
  created_at: string | null
}

const DUPLICATE = '23505'

function toEvent(row: EventRow): PhotoEvent {
  return {
    id: row.id,
    type: row.type as EventType,
    label: row.label,
    title: row.title,
    description: row.description,
    submissionStartAt: row.submission_start_at,
    submissionEndAt: row.submission_end_at,
    votingStartAt: row.voting_start_at,
    votingEndAt: row.voting_end_at,
    resultAt: row.result_at,
    rewards: row.rewards ?? [],
    votesPerUser: row.votes_per_user,
    createdAt: row.created_at,
  }
}

function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    nickname: row.nickname,
    email: row.email,
    avatarUrl: row.avatar_url,
    bio: row.bio ?? undefined,
    website: row.website ?? undefined,
    createdAt: row.created_at ?? undefined,
  }
}

// event_entries 행들에 references(사진)·profiles(작성자)를 조립.
async function assembleEntries(rows: EntryRow[]): Promise<EventEntry[]> {
  if (rows.length === 0) return []
  const refIds = [...new Set(rows.map((r) => r.reference_id))]
  const { data: refData, error: refErr } = await supabase
    .from('references')
    .select('id, image_url, title, user_id')
    .in('id', refIds)
  if (refErr) throw refErr
  const refs = (refData as RefRow[]) ?? []
  const userIds = [...new Set(refs.map((r) => r.user_id))]
  const { data: profData, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)
  if (profErr) throw profErr
  const refMap = new Map(refs.map((r) => [r.id, r]))
  const userMap = new Map((profData as ProfileRow[] | null ?? []).map((p) => [p.id, toUser(p)]))

  return rows.flatMap((row) => {
    const ref = refMap.get(row.reference_id)
    const creator = ref ? userMap.get(ref.user_id) : undefined
    if (!ref || !creator) return [] // 사진/작성자 유실 시 제외
    return [
      {
        id: row.id,
        eventId: row.event_id,
        userId: row.user_id,
        photoId: row.reference_id,
        imageUrl: ref.image_url,
        title: ref.title,
        voteCount: row.vote_count,
        createdAt: row.created_at,
        creator,
      },
    ]
  })
}

async function fetchEvent(eventId: string): Promise<PhotoEvent | null> {
  const { data, error } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle()
  if (error) throw error
  return data ? toEvent(data as EventRow) : null
}

export const supabaseEventRepository: EventRepository = {
  async list() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as EventRow[]).map(toEvent)
  },

  async getCurrent() {
    const events = await this.list()
    const now = new Date()
    return (
      events.find((e) => getEventStatus(e, now) === 'SUBMISSION') ??
      events.find((e) => getEventStatus(e, now) === 'VOTING') ??
      null
    )
  },

  async getById(id) {
    return fetchEvent(id)
  },

  async listEntries(eventId) {
    const { data, error } = await supabase
      .from('event_entries')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return assembleEntries(data as EntryRow[])
  },

  async getMyEntry(eventId, userId) {
    const { data, error } = await supabase
      .from('event_entries')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const [entry] = await assembleEntries([data as EntryRow])
    return entry ?? null
  },

  async submitEntry(input) {
    const event = await fetchEvent(input.eventId)
    if (!event) throw new Error('이벤트를 찾을 수 없어요.')
    if (getEventStatus(event) !== 'SUBMISSION') throw new Error('지금은 참여 기간이 아니에요.')

    const { data, error } = await supabase
      .from('event_entries')
      .insert({ event_id: input.eventId, user_id: input.userId, reference_id: input.photoId })
      .select('*')
      .single()
    if (error) {
      if (error.code === DUPLICATE) throw new Error('이미 이 이벤트에 참여했어요.')
      throw error
    }

    await supabaseLeafRepository.award({
      userId: input.userId,
      amount: 1,
      reason: 'EVENT_PARTICIPATE',
      sourceType: 'event',
      sourceId: input.eventId,
      label: `${event.title} · 이벤트 참여`,
    })

    const [entry] = await assembleEntries([data as EntryRow])
    return entry
  },

  async listMyVoteEntryIds(eventId, userId) {
    const { data, error } = await supabase
      .from('event_votes')
      .select('entry_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
    if (error) throw error
    return (data as { entry_id: string }[]).map((r) => r.entry_id)
  },

  async vote(eventId, entryId, userId) {
    const event = await fetchEvent(eventId)
    if (!event) throw new Error('이벤트를 찾을 수 없어요.')
    if (getEventStatus(event) !== 'VOTING') throw new Error('지금은 투표 기간이 아니에요.')

    const existing = await this.listMyVoteEntryIds(eventId, userId)
    if (existing.includes(entryId)) throw new Error('이미 이 작품에 투표했어요.')
    if (existing.length >= event.votesPerUser) {
      throw new Error(`이 이벤트는 최대 ${event.votesPerUser}표까지 투표할 수 있어요.`)
    }

    const { error } = await supabase
      .from('event_votes')
      .insert({ event_id: eventId, entry_id: entryId, user_id: userId })
    if (error) {
      if (error.code === DUPLICATE) throw new Error('이미 이 작품에 투표했어요.')
      throw error // 자기작품 투표는 DB 트리거가 막고 에러를 던짐
    }
  },

  async getResult(eventId) {
    const event = await fetchEvent(eventId)
    const entries = await this.listEntries(eventId)
    const rewardTable = Object.fromEntries((event?.rewards ?? []).map((r) => [r.rank, r.leaves]))
    const sorted = [...entries].sort(
      (a, b) =>
        b.voteCount - a.voteCount ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    const result: EventResultEntry[] = sorted.map((e, i) => ({
      ...e,
      rank: i + 1,
      awardedLeaves: rewardForRank(i + 1, rewardTable),
    }))

    if (event && getEventStatus(event) === 'FINISHED') {
      for (const r of result) {
        if (r.awardedLeaves > 0) {
          await supabaseLeafRepository.award({
            userId: r.userId,
            amount: r.awardedLeaves,
            reason: 'WEEKLY_CHALLENGE_WINNER',
            sourceType: 'event',
            sourceId: eventId,
            label: `${event.title} · 주간 챌린지 ${r.rank}위`,
          })
        }
      }
    }
    return result
  },

  async listMyParticipations(userId) {
    const { data, error } = await supabase
      .from('event_entries')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error
    const rows = data as EntryRow[]
    if (rows.length === 0) return []

    const myEntries = await assembleEntries(rows)
    const eventIds = [...new Set(rows.map((r) => r.event_id))]
    const { data: evData, error: evErr } = await supabase
      .from('events')
      .select('*')
      .in('id', eventIds)
    if (evErr) throw evErr
    const eventMap = new Map((evData as EventRow[]).map((e) => [e.id, toEvent(e)]))

    const resultCache = new Map<string, EventResultEntry[]>()
    const out: MyEventParticipation[] = []
    for (const entry of myEntries) {
      const event = eventMap.get(entry.eventId)
      if (!event) continue
      const status = getEventStatus(event)
      let rank: number | null = null
      let awardedLeaves = 0
      if (status === 'FINISHED') {
        if (!resultCache.has(event.id)) resultCache.set(event.id, await this.getResult(event.id))
        const ranked = resultCache.get(event.id)!.find((r) => r.id === entry.id)
        rank = ranked?.rank ?? null
        awardedLeaves = ranked?.awardedLeaves ?? 0
      }
      out.push({ event, entry, status, rank, awardedLeaves })
    }
    out.sort((a, b) => new Date(b.event.createdAt).getTime() - new Date(a.event.createdAt).getTime())
    return out
  },

  async getLatestChallengeTop3() {
    const events = await this.list()
    const finished = events
      .filter((e) => getEventStatus(e) === 'FINISHED')
      .sort((a, b) => new Date(b.resultAt).getTime() - new Date(a.resultAt).getTime())
    if (finished.length === 0) return null
    const event = finished[0]
    const entries = (await this.getResult(event.id)).slice(0, 3)
    return { event, entries } satisfies ChallengeTop3
  },
}
