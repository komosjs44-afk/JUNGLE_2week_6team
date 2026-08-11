import { useState, type FormEvent } from 'react'
import { useComments, useCreateComment } from '@/hooks'
import { useAuthStore, useGuestStore } from '@/stores'
import { formatRelativeTime } from '@/utils/format'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { Textarea } from '@/components/common/Input'

const MAX_LENGTH = 500

export function CommentSection({ referenceId }: { referenceId: string }) {
  const { data: comments, isLoading } = useComments(referenceId)
  const { mutate, isPending, error } = useCreateComment(referenceId)
  const user = useAuthStore((s) => s.user)
  const guestNickname = useGuestStore((s) => s.nickname)
  const [body, setBody] = useState('')

  const authorName = user?.nickname ?? guestNickname

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    mutate(trimmed, { onSuccess: () => setBody('') })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-neutral-900">댓글 · 피드백</p>

      {isLoading ? (
        <p className="text-sm text-neutral-400">불러오는 중...</p>
      ) : comments && comments.length > 0 ? (
        <div className="flex flex-col gap-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar nickname={c.nickname} avatarUrl={c.avatarUrl} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-neutral-900">{c.nickname}</span>
                  {c.isGuest && (
                    <span className="shrink-0 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                      게스트
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-neutral-300">{formatRelativeTime(c.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-sm break-words text-neutral-700">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-2 text-center text-sm text-neutral-400">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
        {authorName && <p className="text-xs text-neutral-400">{authorName}(으)로 남겨요</p>}
        <Textarea
          placeholder="후기나 개선 의견을 남겨주세요."
          value={body}
          maxLength={MAX_LENGTH}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && <p className="text-xs text-danger">{error instanceof Error ? error.message : '등록에 실패했어요.'}</p>}
        <Button type="submit" fullWidth loading={isPending} disabled={!body.trim()}>
          등록
        </Button>
      </form>
    </div>
  )
}
