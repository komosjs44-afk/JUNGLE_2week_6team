import { supabaseCommentRepository } from '@/repositories/supabase/commentRepository'
import type { CommentRepository } from '@/repositories/types'

export const commentService: CommentRepository = supabaseCommentRepository
