const DIRECTION_LABELS = ['북쪽', '북동쪽', '동쪽', '남동쪽', '남쪽', '남서쪽', '서쪽', '북서쪽']

export function degreesToLabel(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360
  const index = Math.round(normalized / 45) % 8
  return DIRECTION_LABELS[index]
}

export function formatDirection(degrees: number | undefined): string {
  if (degrees === undefined) return '정보 없음'
  return `${degreesToLabel(degrees)} 약 ${Math.round(degrees)}°`
}
