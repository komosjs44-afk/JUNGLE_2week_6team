import type { EventEntry, PhotoEvent } from '@/types'
import { getReferenceById } from './references'

// ============================================================
// 촬영 이벤트/챌린지 mock 시드.
// 상태(UPCOMING/SUBMISSION/VOTING/FINISHED)는 기간+현재시각으로 계산되므로,
// 데모가 세 상태를 모두 보여줄 수 있도록 현재 날짜(2026-08 기준) 부근에
// 서로 다른 기간의 WEEKLY 이벤트 3개를 둔다.
// 참여작(EventEntry)은 기존 MOCK_REFERENCES를 재사용해 사진/작성자를 조립한다.
// ============================================================

const WEEKLY_REWARDS = [
  { rank: 1, leaves: 20 },
  { rank: 2, leaves: 10 },
  { rank: 3, leaves: 5 },
]

export const MOCK_EVENTS: PhotoEvent[] = [
  // 현재 SUBMISSION — 발견 페이지에 노출될 메인 챌린지
  {
    id: 'event-weekly-sunset',
    type: 'WEEKLY',
    label: '이번 주 챌린지',
    title: '서울의 노을',
    description: '이번 주 가장 멋진 노을 사진을 보여주세요.',
    submissionStartAt: '2026-08-10T00:00:00+09:00',
    submissionEndAt: '2026-08-16T23:59:59+09:00',
    votingStartAt: '2026-08-17T00:00:00+09:00',
    votingEndAt: '2026-08-17T23:59:59+09:00',
    resultAt: '2026-08-18T12:00:00+09:00',
    rewards: WEEKLY_REWARDS,
    votesPerUser: 1,
    createdAt: '2026-08-09T09:00:00+09:00',
  },
  // 현재 VOTING — 투표/블라인드 데모용
  {
    id: 'event-weekly-morning',
    type: 'WEEKLY',
    label: '지난 주 챌린지',
    title: '성수동의 아침',
    description: '성수동의 조용한 아침 풍경을 담아주세요.',
    submissionStartAt: '2026-08-01T00:00:00+09:00',
    submissionEndAt: '2026-08-10T23:59:59+09:00',
    votingStartAt: '2026-08-11T00:00:00+09:00',
    votingEndAt: '2026-08-14T23:59:59+09:00',
    resultAt: '2026-08-15T12:00:00+09:00',
    rewards: WEEKLY_REWARDS,
    votesPerUser: 1,
    createdAt: '2026-07-31T09:00:00+09:00',
  },
  // 이미 FINISHED — 결과/순위/나뭇잎 지급 데모용
  {
    id: 'event-weekly-alley',
    type: 'WEEKLY',
    label: '지난 챌린지',
    title: '여름밤 골목',
    description: '여름밤 골목의 불빛과 공기를 담은 사진.',
    submissionStartAt: '2026-07-20T00:00:00+09:00',
    submissionEndAt: '2026-07-26T23:59:59+09:00',
    votingStartAt: '2026-07-27T00:00:00+09:00',
    votingEndAt: '2026-07-29T23:59:59+09:00',
    resultAt: '2026-07-30T12:00:00+09:00',
    rewards: WEEKLY_REWARDS,
    votesPerUser: 1,
    createdAt: '2026-07-19T09:00:00+09:00',
  },
]

export function getEventById(id: string): PhotoEvent | undefined {
  return MOCK_EVENTS.find((e) => e.id === id)
}

// 참여작: 기존 참고 사진 id로 사진/제목/작성자를 조립한다.
function entry(e: {
  id: string
  eventId: string
  photoId: string
  voteCount: number
  createdAt: string
}): EventEntry {
  const r = getReferenceById(e.photoId)
  if (!r) throw new Error(`mock event entry ${e.id}: missing reference ${e.photoId}`)
  return {
    id: e.id,
    eventId: e.eventId,
    userId: r.userId,
    photoId: r.id,
    imageUrl: r.imageUrl,
    title: r.title,
    voteCount: e.voteCount,
    createdAt: e.createdAt,
    creator: r.creator,
  }
}

export const MOCK_EVENT_ENTRIES: EventEntry[] = [
  // SUBMISSION 이벤트 — 접수 중(투표 전이라 voteCount 0)
  entry({ id: 'entry-sunset-1', eventId: 'event-weekly-sunset', photoId: 'ref-5', voteCount: 0, createdAt: '2026-08-11T18:00:00+09:00' }),
  entry({ id: 'entry-sunset-2', eventId: 'event-weekly-sunset', photoId: 'ref-14', voteCount: 0, createdAt: '2026-08-12T09:20:00+09:00' }),

  // VOTING 이벤트 — 접수 마감, 현재 투표 중(블라인드)
  entry({ id: 'entry-morning-1', eventId: 'event-weekly-morning', photoId: 'ref-8', voteCount: 5, createdAt: '2026-08-05T08:10:00+09:00' }),
  entry({ id: 'entry-morning-2', eventId: 'event-weekly-morning', photoId: 'ref-4', voteCount: 3, createdAt: '2026-08-06T08:40:00+09:00' }),
  entry({ id: 'entry-morning-3', eventId: 'event-weekly-morning', photoId: 'ref-10', voteCount: 2, createdAt: '2026-08-07T07:55:00+09:00' }),
  entry({ id: 'entry-morning-4', eventId: 'event-weekly-morning', photoId: 'ref-2', voteCount: 1, createdAt: '2026-08-08T09:05:00+09:00' }),

  // FINISHED 이벤트 — 결과 확정(voteCount로 순위 결정)
  entry({ id: 'entry-alley-1', eventId: 'event-weekly-alley', photoId: 'ref-6', voteCount: 128, createdAt: '2026-07-22T19:30:00+09:00' }),
  entry({ id: 'entry-alley-2', eventId: 'event-weekly-alley', photoId: 'ref-13', voteCount: 86, createdAt: '2026-07-23T18:45:00+09:00' }),
  entry({ id: 'entry-alley-3', eventId: 'event-weekly-alley', photoId: 'ref-3', voteCount: 61, createdAt: '2026-07-24T20:40:00+09:00' }),
  entry({ id: 'entry-alley-4', eventId: 'event-weekly-alley', photoId: 'ref-9', voteCount: 40, createdAt: '2026-07-25T19:20:00+09:00' }),
]
