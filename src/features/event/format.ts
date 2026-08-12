import type { EventStatus, PhotoEvent } from '@/types'
import { getEventStatus } from '@/types'

// "2026.08.12"
export function formatEventDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

// 오늘 기준 남은 일수(올림). 이미 지난 경우 0.
export function daysUntil(iso: string, now: Date = new Date()): number {
  const diff = new Date(iso).getTime() - now.getTime()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function statusLabel(status: EventStatus): string {
  switch (status) {
    case 'UPCOMING':
      return '예정'
    case 'SUBMISSION':
      return '참여 접수 중'
    case 'VOTING':
      return '투표 중'
    case 'FINISHED':
      return '결과 발표'
  }
}

// 카드/상세의 보조 라벨 — 현재 상태에 따라 다음 마감까지 D-day를 만든다.
export function statusDLabel(event: PhotoEvent, now: Date = new Date()): string {
  const status = getEventStatus(event, now)
  switch (status) {
    case 'UPCOMING':
      return `참여 시작 D-${daysUntil(event.submissionStartAt, now)}`
    case 'SUBMISSION':
      return `투표 D-${daysUntil(event.votingStartAt, now)}`
    case 'VOTING':
      return `결과 D-${daysUntil(event.resultAt, now)}`
    case 'FINISHED':
      return '결과 발표됨'
  }
}
