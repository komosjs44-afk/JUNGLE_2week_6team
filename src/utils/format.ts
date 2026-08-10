export function formatTimeOfDay(isoString: string | undefined): string {
  if (!isoString) return '정보 없음'
  const date = new Date(isoString)
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours.toString().padStart(2, '0')}:${minutes}`
}

export function formatDaypart(isoString: string | undefined): string {
  if (!isoString) return ''
  const hour = new Date(isoString).getHours()
  if (hour >= 5 && hour < 11) return '아침'
  if (hour >= 11 && hour < 15) return '낮'
  if (hour >= 15 && hour < 18) return '오후'
  if (hour >= 18 && hour < 20) return '해질녘'
  if (hour >= 20 || hour < 2) return '밤'
  return '새벽'
}

export function formatFocalLength(focalLength: number | undefined): string {
  if (!focalLength) return '정보 없음'
  const zoomFactor = (focalLength / 24).toFixed(1).replace(/\.0$/, '')
  return `${focalLength}mm / 스마트폰 약 ${zoomFactor}x`
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`
  return `${Math.round(meters)}m`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간${m}분`
}

export function formatRelativeDate(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
  return `${Math.floor(diffDays / 30)}개월 전`
}

export function formatLikeCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}만`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}천`
  return `${count}`
}
