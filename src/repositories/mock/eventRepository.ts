import type { EventRepository } from '../types'
import type { EventEntry, EventResultEntry, PhotoEvent } from '@/types'
import { getEventStatus } from '@/types'
import { MOCK_EVENTS, MOCK_EVENT_ENTRIES, getEventById } from '@/mocks'
import { rewardForRank } from '@/config/rewards'
import { mockLeafRepository } from './leafRepository'
import { mockDelay } from './delay'

// 인메모리 상태(런타임 참여/투표를 반영). 새로고침 시 초기화됨.
const entries: EventEntry[] = [...MOCK_EVENT_ENTRIES]
const votes: { eventId: string; entryId: string; userId: string }[] = []

let entryCounter = 0

function currentEvent(): PhotoEvent | null {
  const now = new Date()
  // 발견 노출 우선순위: 지금 참여 가능한(SUBMISSION) 이벤트 → 없으면 투표 중(VOTING)
  const submission = MOCK_EVENTS.find((e) => getEventStatus(e, now) === 'SUBMISSION')
  if (submission) return submission
  return MOCK_EVENTS.find((e) => getEventStatus(e, now) === 'VOTING') ?? null
}

function computeResult(eventId: string): EventResultEntry[] {
  const event = getEventById(eventId)
  const rewardTable = Object.fromEntries((event?.rewards ?? []).map((r) => [r.rank, r.leaves]))
  // 동점 처리(명시): 득표수 내림차순, 동점이면 먼저 참여한 작품(createdAt 오름차순)이 상위.
  const sorted = entries
    .filter((e) => e.eventId === eventId)
    .sort(
      (a, b) =>
        b.voteCount - a.voteCount ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  return sorted.map((e, i) => {
    const rank = i + 1
    return { ...e, rank, awardedLeaves: rewardForRank(rank, rewardTable) }
  })
}

export const mockEventRepository: EventRepository = {
  async list() {
    return mockDelay([...MOCK_EVENTS])
  },

  async getCurrent() {
    return mockDelay(currentEvent())
  },

  async getById(id) {
    return mockDelay(getEventById(id) ?? null)
  },

  async listEntries(eventId) {
    const list = entries
      .filter((e) => e.eventId === eventId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return mockDelay(list)
  },

  async getMyEntry(eventId, userId) {
    return mockDelay(entries.find((e) => e.eventId === eventId && e.userId === userId) ?? null)
  },

  async submitEntry(input) {
    const event = getEventById(input.eventId)
    if (!event) throw new Error('이벤트를 찾을 수 없어요.')
    if (getEventStatus(event) !== 'SUBMISSION') throw new Error('지금은 참여 기간이 아니에요.')
    if (entries.some((e) => e.eventId === input.eventId && e.userId === input.userId)) {
      throw new Error('이미 이 이벤트에 참여했어요.')
    }
    const created: EventEntry = {
      id: `entry-rt-${Date.now()}-${entryCounter++}`,
      eventId: input.eventId,
      userId: input.userId,
      photoId: input.photoId,
      imageUrl: input.imageUrl,
      title: input.title,
      voteCount: 0,
      createdAt: new Date().toISOString(),
      creator: input.creator,
    }
    entries.push(created)
    // 이벤트 참여 나뭇잎 +1 (이벤트당 1참여이므로 sourceId=eventId로 중복 지급 방지)
    await mockLeafRepository.award({
      userId: input.userId,
      amount: 1,
      reason: 'EVENT_PARTICIPATE',
      sourceType: 'event',
      sourceId: input.eventId,
      label: `${event.title} · 이벤트 참여`,
    })
    return mockDelay(created)
  },

  async listMyVoteEntryIds(eventId, userId) {
    return mockDelay(
      votes.filter((v) => v.eventId === eventId && v.userId === userId).map((v) => v.entryId),
    )
  },

  async vote(eventId, entryId, userId) {
    const event = getEventById(eventId)
    if (!event) throw new Error('이벤트를 찾을 수 없어요.')
    if (getEventStatus(event) !== 'VOTING') throw new Error('지금은 투표 기간이 아니에요.')
    const target = entries.find((e) => e.id === entryId && e.eventId === eventId)
    if (!target) throw new Error('참여작을 찾을 수 없어요.')
    if (target.userId === userId) throw new Error('자신의 작품에는 투표할 수 없어요.')
    const myVotes = votes.filter((v) => v.eventId === eventId && v.userId === userId)
    if (myVotes.some((v) => v.entryId === entryId)) throw new Error('이미 이 작품에 투표했어요.')
    if (myVotes.length >= event.votesPerUser) {
      throw new Error(`이 이벤트는 최대 ${event.votesPerUser}표까지 투표할 수 있어요.`)
    }
    votes.push({ eventId, entryId, userId })
    target.voteCount += 1
    return mockDelay(undefined)
  },

  async getResult(eventId) {
    const event = getEventById(eventId)
    const result = computeResult(eventId)
    // FINISHED면 수상자에게 나뭇잎 정산(idempotent). 한 사용자는 이벤트당 최대 1순위이므로
    // sourceId=eventId로 중복 지급을 막는다(시드 원장과도 키가 일치).
    if (event && getEventStatus(event) === 'FINISHED') {
      for (const r of result) {
        if (r.awardedLeaves > 0) {
          await mockLeafRepository.award({
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
    return mockDelay(result)
  },
}
