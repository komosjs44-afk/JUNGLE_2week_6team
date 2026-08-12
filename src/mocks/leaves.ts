import type { LeafTransaction } from '@/types'

// ============================================================
// 나뭇잎 원장(transaction) mock 시드.
// MY 페이지는 "현재 로그인한 실제 사용자"의 원장만 보여주므로, 실제 사용자는
// 처음엔 잔액 0에서 시작하고 참여/수상으로 적립된다(정직하게, 가짜 잔액을 넣지 않음).
// 아래 시드는 FINISHED 이벤트 수상자(mock 유저)에 대한 기록으로, 데이터 일관성용이다.
// 런타임 적립분은 mock leafRepository의 mutable 배열에 append된다.
// ============================================================

export const MOCK_LEAF_TRANSACTIONS: LeafTransaction[] = [
  {
    id: 'leaf-seed-1',
    userId: 'user-6', // '여름밤 골목' 1위 (entry-alley-1)
    amount: 20,
    reason: 'WEEKLY_CHALLENGE_WINNER',
    sourceType: 'event',
    sourceId: 'event-weekly-alley',
    label: '여름밤 골목 · 주간 챌린지 1위',
    createdAt: '2026-07-30T12:00:00+09:00',
  },
  {
    id: 'leaf-seed-2',
    userId: 'user-2', // '여름밤 골목' 2위 (entry-alley-2)
    amount: 10,
    reason: 'WEEKLY_CHALLENGE_WINNER',
    sourceType: 'event',
    sourceId: 'event-weekly-alley',
    label: '여름밤 골목 · 주간 챌린지 2위',
    createdAt: '2026-07-30T12:00:00+09:00',
  },
  {
    id: 'leaf-seed-3',
    userId: 'user-3', // '여름밤 골목' 3위 (entry-alley-3)
    amount: 5,
    reason: 'WEEKLY_CHALLENGE_WINNER',
    sourceType: 'event',
    sourceId: 'event-weekly-alley',
    label: '여름밤 골목 · 주간 챌린지 3위',
    createdAt: '2026-07-30T12:00:00+09:00',
  },
]
