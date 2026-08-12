// 서버(Gemini shooting-guide) 없이도 "따라 찍기" 가이드를 만드는 온디바이스 폴백.
// 무거운 세그멘테이션 대신, Scene Match와 같은 경량 객체탐지(YOLOS-tiny, Web Worker)로
// 주요 피사체의 위치·크기만 빠르게 파악하고, 레퍼런스 메타데이터(EXIF·시간·방향·초점거리·
// 태그·작성자 팁)와 합쳐 가이드를 생성한다. 탐지는 워커에서 돌아 UI를 막지 않는다.
import type { AiShootingGuide, Reference } from '@/types'
import {
  detectMainSubject,
  bitmapFromSource,
  type SubjectBox,
} from '@/features/scenematch/detectSubject'
import { formatDirection } from '@/utils/direction'
import { formatDaypart, formatFocalLength, formatTimeOfDay } from '@/utils/format'

const DETECT_DIM = 384

// COCO 영어 라벨 → 한국어 (자주 나오는 것만; 없으면 라벨 그대로)
const LABEL_KO: Record<string, string> = {
  person: '인물',
  dog: '강아지',
  cat: '고양이',
  bird: '새',
  car: '자동차',
  bicycle: '자전거',
  motorcycle: '오토바이',
  bus: '버스',
  boat: '배',
  'potted plant': '화분',
  chair: '의자',
  bench: '벤치',
  'dining table': '테이블',
  cup: '컵',
  bottle: '병',
  'wine glass': '와인잔',
  bowl: '그릇',
  cake: '케이크',
  pizza: '피자',
  sandwich: '샌드위치',
  donut: '도넛',
  umbrella: '우산',
  book: '책',
}

function ko(label: string): string {
  return LABEL_KO[label] ?? label
}
function horizontal(cx: number): string {
  return cx < 0.38 ? '왼쪽' : cx > 0.62 ? '오른쪽' : '가운데'
}
function vertical(cy: number): string {
  return cy < 0.38 ? '위쪽' : cy > 0.62 ? '아래쪽' : '중앙'
}

function loadImageEl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('레퍼런스 이미지를 불러오지 못했어요.'))
    img.src = url
  })
}

/** 레퍼런스를 온디바이스로 빠르게 분석해 따라 찍기 가이드를 생성한다. */
export async function generateLocalGuide(reference: Reference): Promise<AiShootingGuide> {
  // 주요 피사체 탐지 (워커). 실패(CORS·미검출)해도 메타데이터로 가이드를 만든다.
  let subject: SubjectBox | null = null
  try {
    const img = await loadImageEl(reference.imageUrl)
    const bmp = await bitmapFromSource(img, img.naturalWidth, img.naturalHeight, DETECT_DIM)
    subject = await detectMainSubject(bmp)
  } catch {
    subject = null
  }

  const subjectKo = subject ? ko(subject.label) : ''
  const areaPct = subject ? Math.round(subject.w * subject.h * 100) : 0
  const posH = subject ? horizontal(subject.cx) : ''
  const posV = subject ? vertical(subject.cy) : ''

  // ── 메타데이터 ──
  const daypart = reference.shooting.shotAt ? formatDaypart(reference.shooting.shotAt) : ''
  const timeOfDay = reference.shooting.shotAt ? formatTimeOfDay(reference.shooting.shotAt) : ''
  const directionLabel =
    reference.shooting.direction !== undefined ? formatDirection(reference.shooting.direction) : ''
  const focalLength = reference.exif?.focalLength ?? reference.shooting.focalLength
  const focalLabel = focalLength ? formatFocalLength(focalLength) : ''
  const spotName = reference.spot?.name ?? ''

  // ── 가이드 필드 ──
  const summary = subject
    ? `${subjectKo}이(가) 중심이 되는${daypart ? ` ${daypart}` : ''} 사진이에요.`
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

  const compositionGuide = subject
    ? `주요 피사체(${subjectKo})를 화면 ${posV} ${posH}에, 약 ${areaPct}% 크기로 담으면 비슷해져요.`
    : '레퍼런스의 주요 피사체를 화면에서 같은 자리에 맞춰 보세요.'

  const heightGuide =
    subject && subject.cy > 0.6
      ? '피사체가 아래쪽에 있어, 카메라를 조금 낮춰 담아 보세요.'
      : subject && subject.cy < 0.4
        ? '피사체가 위쪽에 있어, 카메라를 살짝 위로 향해 보세요.'
        : '눈높이 부근에서 화면을 보며 높이를 조정해 보세요.'

  const timeGuide = daypart
    ? `${timeOfDay ? `${timeOfDay}, ` : ''}${daypart}에 촬영됐어요. 비슷한 시간대에 방문하면 빛이 비슷해져요.`
    : '비슷한 빛을 얻으려면 촬영 시간대를 맞춰 보세요.'

  const lightGuide = '빛의 방향(순광/역광)을 확인하며 밝기를 조정해 보세요.'

  const editingGuide = reference.adjustment
    ? '이 사진에는 저장된 색감 보정이 있어요. 촬영 후 아래 색감 보정으로 톤을 맞춰 마무리해 보세요.'
    : '촬영 후 색감 보정으로 톤을 맞추면 분위기가 더 비슷해져요.'

  // ── 팁 (있는 정보 위주로 2~4개) ──
  const tips: string[] = []
  if (reference.shooting.creatorTip) tips.push(reference.shooting.creatorTip)
  if (subject) tips.push(`주요 피사체를 화면 ${posV} ${posH}에 배치해 보세요.`)
  if (directionLabel) tips.push(`${directionLabel} 방향을 향해 서면 방향감이 비슷해져요.`)
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
