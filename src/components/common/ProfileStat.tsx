interface ProfileStatProps {
  value: number
  label: string
  onClick: () => void
}

export function ProfileStat({ value, label, onClick }: ProfileStatProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-opacity active:opacity-60"
    >
      <span className="text-base font-bold text-neutral-900">{value}</span>
      <span className="text-xs text-neutral-500">{label}</span>
    </button>
  )
}
