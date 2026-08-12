// 레퍼런스 피사체 vs 현재 화면 피사체를 비교해 "일치도 %"와 "어디로 움직일지"를 계산한다.
import type { SubjectBox } from './detectSubject'

const POS_TOL = 0.06 // 중심 위치 허용 오차 (0~1). 이보다 벗어나면 방향 화살표 표시
const SIZE_TOL = 0.18 // 크기 허용 오차 (비율). 이보다 크게 차이 나면 앞뒤 이동 안내
const READY_SCORE = 88 // 이 점수 이상 + 방향 안내 없음 = 촬영 추천

export interface MatchHint {
  arrow: string // ← ↑ → ↓ · 📷
  text: string
}

export interface MatchResult {
  overall: number // 종합 일치도 0~100
  position: number // 위치 일치도 0~100
  size: number // 크기 일치도 0~100
  hints: MatchHint[]
  ready: boolean // 촬영 추천 여부
}

export function computeMatch(ref: SubjectBox, live: SubjectBox): MatchResult {
  // 위치: 중심 간 거리 (화면 대각선 기준으로 정규화)
  const dx = ref.cx - live.cx // >0 : 현재 피사체가 목표보다 왼쪽 → 오른쪽으로 옮겨야
  const dy = ref.cy - live.cy // >0 : 현재 피사체가 목표보다 위 → 아래로 옮겨야
  const dist = Math.hypot(dx, dy)
  const position = Math.max(0, Math.min(1, 1 - dist / 0.5)) // 대각선 절반 벗어나면 0

  // 크기: 면적 비율 (작은쪽/큰쪽)
  const refArea = ref.w * ref.h
  const liveArea = live.w * live.h
  const size = liveArea > 0 && refArea > 0 ? Math.min(refArea, liveArea) / Math.max(refArea, liveArea) : 0

  const overall = Math.round((position * 0.6 + size * 0.4) * 100)

  const hints: MatchHint[] = []
  if (dx > POS_TOL) hints.push({ arrow: '→', text: '오른쪽으로' })
  else if (dx < -POS_TOL) hints.push({ arrow: '←', text: '왼쪽으로' })
  if (dy > POS_TOL) hints.push({ arrow: '↓', text: '아래로' })
  else if (dy < -POS_TOL) hints.push({ arrow: '↑', text: '위로' })
  if (liveArea < refArea * (1 - SIZE_TOL)) hints.push({ arrow: '📷', text: '조금 가까이' })
  else if (liveArea > refArea * (1 + SIZE_TOL)) hints.push({ arrow: '📷', text: '조금 뒤로' })

  const ready = overall >= READY_SCORE && hints.length === 0

  return {
    overall,
    position: Math.round(position * 100),
    size: Math.round(size * 100),
    hints,
    ready,
  }
}
