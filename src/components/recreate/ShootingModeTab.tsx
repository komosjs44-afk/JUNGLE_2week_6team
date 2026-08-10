import { useState } from 'react'
import { clsx } from 'clsx'
import { Aperture, Moon, GalleryHorizontal, User, Sparkle } from 'lucide-react'
import { MOCK_SHOOTING_MODES } from '@/mocks'
import type { ShootingModeId } from '@/types'
import { Tag } from '@/components/common/Tag'

const MODE_ICONS: Record<ShootingModeId, typeof Aperture> = {
  normal: Aperture,
  portrait: User,
  night: Moon,
  cinematic: Sparkle,
  panorama: GalleryHorizontal,
}

export function ShootingModeTab() {
  const [selected, setSelected] = useState<ShootingModeId>('normal')

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <p className="text-xs text-neutral-400">촬영 시 참고할 모드를 골라보세요. 실제 카메라 제어는 하지 않아요.</p>
      {MOCK_SHOOTING_MODES.map((mode) => {
        const Icon = MODE_ICONS[mode.id]
        const isSelected = selected === mode.id
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => setSelected(mode.id)}
            className={clsx(
              'flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors',
              isSelected ? 'border-primary-500 bg-primary-50' : 'border-neutral-100 bg-white',
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-full',
                  isSelected ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-500',
                )}
              >
                <Icon size={17} />
              </div>
              <p className="font-semibold text-neutral-900">{mode.name} 모드</p>
            </div>
            <p className="text-sm text-neutral-600">{mode.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {mode.recommendedFor.map((r) => (
                <Tag key={r}>{r}</Tag>
              ))}
            </div>
            <p className="text-xs text-neutral-400">Tip. {mode.tip}</p>
          </button>
        )
      })}
    </div>
  )
}
