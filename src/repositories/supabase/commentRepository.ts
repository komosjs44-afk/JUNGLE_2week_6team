import type { CommentRepository } from '../types'
import type { Comment } from '@/types'
import { supabase } from '@/lib/supabase'

interface CommentRow {
  id: string
  reference_id: string
  user_id: string | null
  guest_nickname: string | null
  body: string
  created_at: string
  author: { nickname: string; avatar_url: string | null } | null
}

function toComment(row: CommentRow): Comment {
  const isGuest = !row.user_id
  return {
    id: row.id,
    referenceId: row.reference_id,
    userId: row.user_id ?? undefined,
    nickname: isGuest ? (row.guest_nickname ?? '게스트') : (row.author?.nickname ?? '알 수 없음'),
    avatarUrl: isGuest ? undefined : row.author?.avatar_url,
    isGuest,
    body: row.body,
    createdAt: row.created_at,
  }
}

export const supabaseCommentRepository: CommentRepository = {
  async list(referenceId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, author:profiles!user_id(nickname, avatar_url)')
      .eq('reference_id', referenceId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as CommentRow[]).map(toComment)
  },

  async create(input) {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        reference_id: input.referenceId,
        body: input.body,
        user_id: input.userId ?? null,
        guest_nickname: input.userId ? null : (input.guestNickname ?? null),
      })
      .select('*, author:profiles!user_id(nickname, avatar_url)')
      .single()
    if (error) throw error
    return toComment(data as unknown as CommentRow)
  },
}
