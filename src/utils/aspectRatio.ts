// 피드 그리드(2열)에서 카드 하나가 너무 길거나 납작해서 레이아웃이 깨지는 걸 막기 위한 clamp.
// 원본 비율을 최대한 살리되, 극단적인 파노라마·롱샷만 적당히 눌러준다.
const MIN_RATIO = 3 / 5 // 세로로 아주 긴 사진 (예: 인물 세로샷)
const MAX_RATIO = 4 / 3 // 가로로 아주 넓은 사진 (예: 풍경 파노라마)
const FALLBACK_RATIO = 3 / 4 // 비율 정보가 없는 레거시 데이터

export function clampFeedAspectRatio(ratio: number | null | undefined): number {
  if (!ratio || Number.isNaN(ratio) || ratio <= 0) return FALLBACK_RATIO
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio))
}
