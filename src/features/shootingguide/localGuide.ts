// 서버(Gemini shooting-guide) 없이도 "따라 찍기" 가이드를 만드는 온디바이스 폴백.
// 브라우저 세그멘테이션(SegFormer/ADE20K)으로 레퍼런스의 구도·주요 요소를 파악하고,
// 레퍼런스 메타데이터(EXIF·시간·방향·초점거리·태그·작성자 팁)와 합쳐 가이드 텍스트를 생성한다.
// 무거운 모델은 segmentImage 내부에서 동적 import 되므로 이 기능에 들어올 때만 로드된다.
import type { AiShootingGuide, Reference } from '@/types'
import { segmentImage, type Segment } from '@/features/segment/segmentImage'
import { formatDirection } from '@/utils/direction'
import { formatDaypart, formatFocalLength, formatTimeOfDay } from '@/utils/format'

// ADE20K 영어 라벨 → 한국어 (자주 나오는 것만; 없으면 라벨 그대로)
const LABEL_KO: Record<string, string> = {
  sky: '하늘',
  building: '건물',
  house: '집',
  tree: '나무',
  grass: '잔디',
  plant: '식물',
  person: '인물',
  water: '물',
  sea: '바다',
  river: '강',
  lake: '호수',
  mountain: '산',
  hill: '언덕',
  rock: '바위',
  sand: '모래',
  earth: '땅',
  field: '들판',
  road: '길',
  sidewalk: '인도',
  path: '길',
  floor: '바닥',
  wall: '벽',
  car: '자동차',
  flower: '꽃',
  bridge: '다리',
}
// 주요 피사체를 고를 때 배경으로 취급해 제외할 요소
const BACKGROUND_LABELS = new Set(['sky', 'floor', 'ceiling', 'wall', 'earth', 'road', 'sidewalk', 'path'])

function ko(label: string): string {
  return LABEL_KO[label] ?? label
}

// 마스크(on=255)의 무게중심을 정규화 좌표(0~1)로
function centroid(mask: Uint8Array, w: number, h: number): { cx: number; cy: number } | null {
  let sx = 0
  let sy = 0
  let n = 0
  for (let p = 0; p < mask.length; p++) {
    if (mask[p] > 127) {
      sx += p % w
      sy += Math.floor(p / w)
      n++
    }
  }
  if (n === 0) return null
  return { cx: sx / n / w, cy: sy / n / h }
}

function horizontal(cx: number): string {
  return cx < 0.38 ? '왼쪽' : cx > 0.62 ? '오른쪽' : '가운데'
}
function vertical(cy: number): string {
  return cy < 0.38 ? '위쪽' : cy > 0.62 ? '아래쪽' : '중앙'
}

/** 레퍼런스를 온디바이스로 분석해 따라 찍기 가이드를 생성한다. */
export async function generateLocalGuide(reference: Reference): Promise<AiShootingGuide> {
  let segments: Segment[] = []
  try {
    const res = await segmentImage(reference.imageUrl)
    segments = res.segments
  } catch {
    // 분할 실패(CORS·모델 등) — 메타데이터만으로 가이드를 만든다
    segments = []
  }

  // 커버리지 순 정렬, 상위 요소 파악
  const sorted = [...segments].sort((a, b) => b.coverage - a.coverage)
  const top = sorted.filter((s) => s.coverage >= 0.05).slice(0, 3)
  const skyPct = Math.round((sorted.find((s) => s.label === 'sky')?.coverage ?? 0) * 100)

  // 주요 피사체 = 배경 아닌 가장 큰 영역
  const subjectSeg = sorted.find((s) => !BACKGROUND_LABELS.has(s.label) && s.coverage >= 0.04)
  const subjectPos = subjectSeg ? centroid(subjectSeg.mask, subjectSeg.width, subjectSeg.height) : null

  // ── 메타데이터 ──
  const daypart = reference.shooting.shotAt ? formatDaypart(reference.shooting.shotAt) : ''
  const timeOfDay = reference.shooting.shotAt ? formatTimeOfDay(reference.shooting.shotAt) : ''
  const directionLabel =
    reference.shooting.direction !== undefined ? formatDirection(reference.shooting.direction) : ''
  const focalLength = reference.exif?.focalLength ?? reference.shooting.focalLength
  const focalLabel = focalLength ? formatFocalLength(focalLength) : ''
  const spotName = reference.spot?.name ?? ''

  // ── 각 가이드 필드 ──
  const topKo = top.map((s) => ko(s.label))
  const summary =
    topKo.length > 0
      ? `${topKo.slice(0, 2).join('과(와) ')}이(가) 어우러진${daypart ? ` ${daypart}` : ''} 사진이에요.`
      : `${spotName ? `${spotName}에서 담은 ` : ''}${daypart ? `${daypart} ` : ''}장면이에요.`

  const positionGuide = spotName
    ? `${spotName} 부근에서 촬영됐어요. 같은 위치에서 시작해 보세요.`
    : '레퍼런스와 비슷한 위치를 찾아 같은 구도를 잡아 보세요.'

  const directionGuide = directionLabel
    ? `${directionLabel} 방향을 바라보고 촬영됐어요.`
    : '레퍼런스와 같은 방향을 향하도록 서 보세요.'

  const cameraGuide = focalLabel
    ? `${focalLabel} 화각으로 촬영됐어요. 비슷한 화각으로 맞춰 보세요.`
    : '스마트폰 기본 카메라로도 충분해요. 화면을 보며 화각을 맞춰 보세요.'

  let compositionGuide: string
  if (top.length > 0) {
    const mainKo = topKo[0]
    const mainPct = Math.round(top[0].coverage * 100)
    compositionGuide = `${mainKo}이(가) 화면의 약 ${mainPct}%를 차지하는 구도예요.`
    if (subjectSeg && subjectPos) {
      compositionGuide += ` 주요 피사체(${ko(subjectSeg.label)})는 화면 ${vertical(subjectPos.cy)} ${horizontal(subjectPos.cx)}에 두면 비슷해져요.`
    }
  } else {
    compositionGuide = '레퍼런스의 주요 피사체 위치를 화면에서 같은 자리에 맞춰 보세요.'
  }

  const heightGuide =
    skyPct >= 45
      ? '하늘 비중이 큰 사진이라, 카메라를 살짝 아래에서 위로 향하면 하늘을 넓게 담을 수 있어요.'
      : subjectPos && subjectPos.cy > 0.6
        ? '피사체가 아래쪽에 있어, 카메라를 조금 낮춰 눈높이보다 아래에서 담아 보세요.'
        : '눈높이 부근에서 화면을 보며 높이를 조정해 보세요.'

  const timeGuide = daypart
    ? `${timeOfDay ? `${timeOfDay}, ` : ''}${daypart}에 촬영됐어요. 비슷한 시간대에 방문하면 빛이 비슷해져요.`
    : '비슷한 빛을 얻으려면 촬영 시간대를 맞춰 보세요.'

  const lightGuide =
    skyPct >= 45
      ? '하늘이 밝을 수 있으니 노출을 조금 낮춰 하늘 디테일을 살려 보세요.'
      : '빛의 방향(순광/역광)을 확인하며 밝기를 조정해 보세요.'

  const editingGuide = reference.adjustment
    ? '이 사진에는 저장된 색감 보정이 있어요. 촬영 후 아래 색감 보정으로 톤을 맞춰 마무리해 보세요.'
    : '촬영 후 색감 보정으로 톤을 맞추면 분위기가 더 비슷해져요.'

  // ── 팁 (있는 정보 위주로 2~4개) ──
  const tips: string[] = []
  if (reference.shooting.creatorTip) tips.push(reference.shooting.creatorTip)
  if (subjectSeg && subjectPos)
    tips.push(`주요 피사체를 화면 ${vertical(subjectPos.cy)} ${horizontal(subjectPos.cx)}에 배치해 보세요.`)
  if (directionLabel) tips.push(`${directionLabel} 방향을 향해 서면 방향감이 비슷해져요.`)
  if (skyPct >= 45) tips.push('하늘과 지상의 경계선(수평선)을 수평으로 맞추면 안정적이에요.')
  if (reference.tags.length > 0) tips.push(`분위기 키워드: ${reference.tags.slice(0, 3).join(', ')}`)
  if (tips.length === 0) tips.push('레퍼런스와 같은 구도·방향·시간대를 맞추는 것이 가장 중요해요.')

  return {
    summary,
    positionGuide,
    directionGuide,
    cameraGuide,
    compositionGuide,
    heightGuide,
    timeGuide,
    lightGuide,
    editingGuide,
    tips: tips.slice(0, 4),
  }
}
