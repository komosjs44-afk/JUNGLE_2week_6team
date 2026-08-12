// 나뭇잎(RE:FRAME 내부 마일리지) 도메인 타입.
// 단순 잔액 숫자가 아니라 "왜 받았는지"를 남기는 원장(transaction) 구조를 사용한다.

// 나뭇잎 지급 사유. 좋아요/단순 투표에는 지급하지 않는다.
export type LeafReason =
  | 'EVENT_PARTICIPATE' // 이벤트 정상 참여 +1
  | 'WEEKLY_CHALLENGE_WINNER' // 주간 챌린지 수상 (순위별 금액)
  | 'FIRST_PHOTO_UPLOAD' // 첫 사진 업로드 +3
  | 'FIRST_SPOT_REGISTER' // 촬영 스팟 최초 등록 +3

export type LeafSourceType = 'event' | 'reference' | 'spot'

export interface LeafTransaction {
  id: string
  userId: string
  /** 부호 있는 정수(적립 +, 향후 차감 -). 원장은 append-only. */
  amount: number
  reason: LeafReason
  sourceType: LeafSourceType
  /** 중복 지급 방지 키의 일부. 특정 소스가 없으면 null(예: 첫 업로드). */
  sourceId: string | null
  /** 내역 화면 표시용 라벨 (예: "서울의 노을") */
  label: string
  createdAt: string
}

// 나뭇잎 적립 요청. 중복 지급 방지는 (userId, reason, sourceType, sourceId)로 판단한다.
export interface LeafAwardInput {
  userId: string
  amount: number
  reason: LeafReason
  sourceType: LeafSourceType
  sourceId: string | null
  label: string
}

// 나뭇잎 성장 등급. 기준은 config에서 관리한다(getGrade).
export interface LeafGrade {
  name: string
  min: number
  /** 상한(포함). 최상위 등급은 null(상한 없음). */
  max: number | null
}
