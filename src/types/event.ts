import type { User } from './user'

// 촬영 이벤트/챌린지 도메인 타입.
// MVP는 WEEKLY를 메인으로 구현하되, 타입은 DAILY/SPECIAL까지 확장 가능하게 둔다.
export type EventType = 'DAILY' | 'WEEKLY' | 'SPECIAL'

// 상태는 별도 컬럼이 아니라 기간(타임스탬프) + 현재 시각으로 계산한다(getEventStatus).
export type EventStatus = 'UPCOMING' | 'SUBMISSION' | 'VOTING' | 'FINISHED'

export interface EventReward {
  rank: number
  leaves: number
}

export interface PhotoEvent {
  id: string
  type: EventType
  /** 상단 카테고리 라벨 (예: "이번 주 챌린지") */
  label: string
  /** 이벤트 제목 (예: "서울의 노을") */
  title: string
  description: string
  submissionStartAt: string
  submissionEndAt: string
  votingStartAt: string
  votingEndAt: string
  resultAt: string
  /** 순위별 나뭇잎 보상 (1위부터). config가 아니라 이벤트별로 가질 수 있게 데이터에 둔다. */
  rewards: EventReward[]
  /** 사용자당 투표 가능 수 (MVP 기본 1) */
  votesPerUser: number
  createdAt: string
}

export interface EventEntry {
  id: string
  eventId: string
  userId: string
  /** 연결된 참고 사진(references) id */
  photoId: string
  /** 표시용 비정규화 필드 */
  imageUrl: string
  title: string
  voteCount: number
  createdAt: string
  /**
   * 작성자 정보. VOTING 중에는 UI에서 숨기고(블라인드), FINISHED에서만 공개한다.
   * 데이터에는 항상 담아두되 노출 여부는 화면에서 상태로 판단한다.
   */
  creator: User
}

export interface EventResultEntry extends EventEntry {
  rank: number
  /** 이 순위로 획득한 나뭇잎 (수상권 밖이면 0) */
  awardedLeaves: number
}

// 사진으로 참여할 때의 입력 — 기존 참고 사진(references)을 이벤트에 연결한다.
export interface NewEventEntryInput {
  eventId: string
  userId: string
  photoId: string
  imageUrl: string
  title: string
  creator: User
}

/**
 * 이벤트 상태를 현재 시각 기준으로 계산한다.
 * UPCOMING → SUBMISSION → VOTING → FINISHED 순서.
 * 경계는 [start, end) 반열림으로 처리한다.
 */
export function getEventStatus(event: PhotoEvent, now: Date = new Date()): EventStatus {
  const t = now.getTime()
  if (t < new Date(event.submissionStartAt).getTime()) return 'UPCOMING'
  if (t < new Date(event.submissionEndAt).getTime()) return 'SUBMISSION'
  if (t < new Date(event.votingEndAt).getTime()) return 'VOTING'
  return 'FINISHED'
}
