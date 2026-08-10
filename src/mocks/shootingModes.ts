import type { ShootingMode } from '@/types'

export const MOCK_SHOOTING_MODES: ShootingMode[] = [
  {
    id: 'normal',
    name: '일반',
    description: '가장 기본적인 촬영 모드로 밝고 선명한 결과물을 얻기 좋아요.',
    recommendedFor: ['풍경', '기록', '일상'],
    tip: '수평을 맞추고 격자선을 활용해 구도를 잡으세요.',
  },
  {
    id: 'portrait',
    name: '인물',
    description: '피사체와 배경을 자연스럽게 분리하기 적합해요.',
    recommendedFor: ['인물', '스냅', '배경 흐림'],
    tip: '피사체와 1~2m 거리를 유지하세요.',
  },
  {
    id: 'night',
    name: '야간',
    description: '어두운 환경에서 노이즈를 줄이고 밝기를 보정해줘요.',
    recommendedFor: ['야경', '골목 조명', '실내'],
    tip: '손떨림을 줄이기 위해 벽이나 난간에 기대어 고정하세요.',
  },
  {
    id: 'cinematic',
    name: '시네마틱',
    description: '영화 같은 색감과 와이드한 비율로 분위기를 살려줘요.',
    recommendedFor: ['골목', '분위기 있는 장면'],
    tip: '피사체를 프레임 가장자리에 배치해 여백을 살려보세요.',
  },
  {
    id: 'panorama',
    name: '파노라마',
    description: '좌우로 넓은 화각을 이어 붙여 광활한 풍경을 담아요.',
    recommendedFor: ['한강', '스카이라인', '탁 트인 풍경'],
    tip: '천천히 일정한 속도로 카메라를 수평 이동하세요.',
  },
]
