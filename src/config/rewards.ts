import type { LeafGrade } from '@/types'

// ============================================================
// 나뭇잎 리워드 정책 — 단일 관리 지점(Single Source of Truth).
// 보상 값을 코드 여러 곳에 하드코딩하지 말고 여기서만 관리한다.
// ============================================================

// 행동별 고정 지급량. 좋아요/단순 투표는 목록에 없음(=지급 안 함).
export const LEAF_REWARDS = {
  /** 이벤트 정상 참여 */
  EVENT_PARTICIPATE: 1,
  /** 첫 사진 업로드 (계정당 1회) */
  FIRST_PHOTO_UPLOAD: 3,
  /** 촬영 스팟 최초 등록 (계정당 1회) */
  FIRST_SPOT_REGISTER: 3,
} as const

// 주간 챌린지 순위별 보상. 이벤트 데이터(event.rewards)가 있으면 그쪽을 우선 사용하고,
// 없을 때의 기본 폴백으로 쓴다.
export const WEEKLY_CHALLENGE_REWARDS: Record<number, number> = {
  1: 20,
  2: 10,
  3: 5,
}

export function rewardForRank(rank: number, table = WEEKLY_CHALLENGE_REWARDS): number {
  return table[rank] ?? 0
}

// ============================================================
// 나뭇잎 성장 등급 — 기준도 config로 관리(P2 대비, MVP는 현재 등급만 표시).
// ============================================================
export const LEAF_GRADES: LeafGrade[] = [
  { name: '새싹 사진가', min: 0, max: 19 },
  { name: '산책 사진가', min: 20, max: 49 },
  { name: '프레임 헌터', min: 50, max: 99 },
  { name: 'RE:FRAMEER', min: 100, max: null },
]

export function getGrade(total: number): LeafGrade {
  // 위에서부터 min을 넘는 첫 등급을 찾되, 안전하게 마지막(최상위)로 폴백.
  const matched = [...LEAF_GRADES].reverse().find((g) => total >= g.min)
  return matched ?? LEAF_GRADES[0]
}
