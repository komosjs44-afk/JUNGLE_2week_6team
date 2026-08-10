import { clsx } from 'clsx'

interface AvatarProps {
  nickname: string
  avatarUrl?: string | null
  size?: number
  className?: string
}

export function Avatar({ nickname, avatarUrl, size = 32, className }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={nickname}
        style={{ width: size, height: size }}
        className={clsx('shrink-0 rounded-full object-cover', className)}
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700',
        className,
      )}
    >
      {nickname.slice(0, 1).toUpperCase()}
    </div>
  )
}
