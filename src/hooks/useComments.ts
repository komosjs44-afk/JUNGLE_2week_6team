import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commentService } from '@/services'
import { useAuthStore, useGuestStore } from '@/stores'
import type { NewCommentInput } from '@/types'

export function useComments(referenceId: string | undefined) {
  return useQuery({
    queryKey: ['comments', referenceId],
    queryFn: () => commentService.list(referenceId as string),
    enabled: !!referenceId,
  })
}

/** 로그인 회원이면 회원으로, 아니면(게스트) 게스트 닉네임으로 댓글을 남긴다. */
export function useCreateComment(referenceId: string) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const guestNickname = useGuestStore((s) => s.nickname)

  return useMutation({
    mutationFn: (body: string) => {
      const input: NewCommentInput = userId
        ? { referenceId, body, userId }
        : { referenceId, body, guestNickname: guestNickname ?? undefined }
      if (!input.userId && !input.guestNickname) {
        return Promise.reject(new Error('닉네임이 필요해요.'))
      }
      return commentService.create(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', referenceId] })
      queryClient.invalidateQueries({ queryKey: ['reference', referenceId] })
    },
  })
}
