// ============================================================
// RE:FRAME 등급(RP 레벨) 시스템 — 단일 관리 지점.
// 등급명/필요 RP/대표 이미지를 여기서만 정의하고, 계산 로직도 여기 둔다.
// 이미지는 src/assets/photos/1~8.gif 를 import(빌드 시 번들·해시)해서 쓴다.
// ============================================================
import lv1 from '@/assets/photos/1.gif'
import lv2 from '@/assets/photos/2.gif'
import lv3 from '@/assets/photos/3.gif'
import lv4 from '@/assets/photos/4.gif'
import lv5 from '@/assets/photos/5.gif'
import lv6 from '@/assets/photos/6.gif'
import lv7 from '@/assets/photos/7.gif'
import lv8 from '@/assets/photos/8.gif'

export interface LevelInfo {
  level: number
  name: string
  /** 이 레벨에 도달하는 최소 누적 RP */
  minRp: number
  /** 대표 이미지 URL (import된 asset) */
  image: string
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: '새싹 프레임', minRp: 0, image: lv1 },
  { level: 2, name: '프레임 워커', minRp: 5_000, image: lv2 },
  { level: 3, name: '스팟 탐험가', minRp: 15_000, image: lv3 },
  { level: 4, name: '스팟 헌터', minRp: 35_000, image: lv4 },
  { level: 5, name: '프레임 러버', minRp: 65_000, image: lv5 },
  { level: 6, name: '로컬 탐험가', minRp: 110_000, image: lv6 },
  { level: 7, name: '프레임 큐레이터', minRp: 170_000, image: lv7 },
  { level: 8, name: '프레임 마스터', minRp: 250_000, image: lv8 },
]

// 누적 RP로 현재 레벨을 계산 — minRp를 넘는 가장 높은 레벨.
export function getLevelByRp(rp: number): LevelInfo {
  let current = LEVELS[0]
  for (const lv of LEVELS) {
    if (rp >= lv.minRp) current = lv
    else break
  }
  return current
}

// 다음 레벨(최고 레벨이면 null).
export function getNextLevel(level: number): LevelInfo | null {
  return LEVELS.find((lv) => lv.level === level + 1) ?? null
}
