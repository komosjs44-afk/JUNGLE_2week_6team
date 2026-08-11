import type { Reference } from '@/types'
import { useAiShootingGuide } from '@/hooks'
import { useMemberGateStore } from '@/stores'
import { Button } from '@/components/common/Button'

function GuideSection({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-neutral-400">{label}</span>
      <p className="text-sm leading-relaxed text-neutral-700">{text}</p>
    </div>
  )
}

export function AiShootingGuide({ reference }: { reference: Reference }) {
  const requireMember = useMemberGateStore((s) => s.requireMember)
  const mutation = useAiShootingGuide(reference)
  const guide = reference.aiShootingGuide ?? mutation.data

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-neutral-700">이 사진 따라 찍기</span>

      {guide ? (
        <div className="flex flex-col gap-4 rounded-md border border-neutral-100 p-4">
          <p className="text-sm leading-relaxed text-neutral-700">{guide.summary}</p>

          <div className="flex flex-col gap-3">
            <GuideSection label="위치" text={`${guide.positionGuide} ${guide.directionGuide}`} />
            <GuideSection label="카메라" text={guide.cameraGuide} />
            <GuideSection label="구도" text={`${guide.compositionGuide} ${guide.heightGuide}`} />
            <GuideSection label="시간" text={`${guide.timeGuide} ${guide.lightGuide}`} />
          </div>

          {guide.tips.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-neutral-400">촬영 팁</span>
              <ul className="flex flex-col gap-1">
                {guide.tips.map((tip, i) => (
                  <li key={i} className="flex gap-1.5 text-sm leading-relaxed text-neutral-700">
                    <span className="shrink-0 text-neutral-300">·</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-1 border-t border-neutral-100 pt-3">
            <span className="text-xs font-medium text-neutral-400">보정</span>
            <p className="text-sm leading-relaxed text-neutral-700">
              {guide.editingGuide} 촬영 후 아래 &apos;이 색감으로 내 사진 보정&apos;으로 이어서 마무리해보세요.
            </p>
          </div>
        </div>
      ) : mutation.isPending ? (
        <div className="flex items-center justify-center gap-2 rounded-md border border-neutral-100 p-6 text-sm text-neutral-500">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          사진을 분석하고 있어요...
        </div>
      ) : mutation.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-neutral-100 p-6 text-center">
          <p className="text-sm text-neutral-500">
            촬영 가이드를 불러오지 못했습니다.
            <br />
            잠시 후 다시 시도해주세요.
          </p>
          <Button variant="secondary" onClick={() => mutation.mutate()}>
            다시 시도
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-neutral-100 p-4">
          <p className="text-sm text-neutral-500">AI가 사진과 촬영 정보를 분석해 비슷하게 찍는 방법을 알려드려요.</p>
          <Button fullWidth onClick={() => requireMember() && mutation.mutate()}>
            AI 촬영 가이드 보기
          </Button>
        </div>
      )}
    </div>
  )
}
