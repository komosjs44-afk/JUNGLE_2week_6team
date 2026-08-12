import { getLevelByRp, getNextLevel } from '@/config/levels'

// 등급 카드 — 대표 이미지(이모지 대신)를 인식 가능한 크기로, Lv/등급명/현재·다음 RP/진행바 표시.
// 진행바는 "현재 등급 → 다음 등급" 구간 진행률. 최고 등급은 "최고 등급 달성"으로 처리.
export function GradeCard({ rp }: { rp: number }) {
  const level = getLevelByRp(rp)
  const next = getNextLevel(level.level)
  const isMax = !next
  const rpToNext = next ? Math.max(0, next.minRp - rp) : 0
  const span = next ? next.minRp - level.minRp : 1
  const progress = next
    ? Math.min(100, Math.max(0, Math.round(((rp - level.minRp) / span) * 100)))
    : 100

  return (
    <div className="flex items-center gap-4 rounded-[12px] border border-neutral-100 bg-white p-4">
      {/* 등급 이미지 — 레벨마다 동일한 정사각 영역, 비율 유지(object-contain), 중앙 정렬, 투명 배경 그대로 */}
      <div className="flex h-20 w-20 shrink-0 items-center justify-center">
        <img
          src={level.image}
          alt={`${level.name} 등급`}
          className="h-full w-full object-contain"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-primary-700">Lv.{level.level}</span>
          <span className="truncate text-base font-bold text-neutral-900">{level.name}</span>
        </div>

        <p className="mt-1 text-xs tabular-nums text-neutral-500">
          {isMax
            ? `${rp.toLocaleString()} RP`
            : `${rp.toLocaleString()} / ${next!.minRp.toLocaleString()} RP`}
        </p>

        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-primary-600 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-1.5 text-[11px] text-neutral-400">
          {isMax ? '최고 등급 달성' : `다음 등급까지 ${rpToNext.toLocaleString()} RP`}
        </p>
      </div>
    </div>
  )
}
