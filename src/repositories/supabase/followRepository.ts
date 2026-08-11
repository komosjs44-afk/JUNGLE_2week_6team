import type { FollowRepository } from '../types'
import type { User } from '@/types'
import { supabase } from '@/lib/supabase'

const DUPLICATE = '23505' // unique 위반(이미 팔로우 중) → 무시

interface FollowRow {
  following_id: string
}

interface FollowCountsRow {
  followers: number
  following: number
}

interface ProfileRow {
  id: string
  nickname: string
  email: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  created_at: string
}

function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    nickname: row.nickname,
    email: row.email ?? '',
    avatarUrl: row.avatar_url,
    bio: row.bio ?? undefined,
    website: row.website ?? undefined,
    createdAt: row.created_at,
  }
}

export const supabaseFollowRepository: FollowRepository = {
  async listFollowingIds(userId) {
    const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', userId)
    if (error) throw error
    return (data as FollowRow[]).map((r) => r.following_id)
  },

  // userId를 팔로우하는 사람들(followers)
  async listFollowers(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select('follower:profiles!follower_id(*)')
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as { follower: ProfileRow }[]).map((r) => toUser(r.follower))
  },

  // userId가 팔로우하는 사람들(following)
  async listFollowing(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select('following:profiles!following_id(*)')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as { following: ProfileRow }[]).map((r) => toUser(r.following))
  },

  async follow(followerId, targetId) {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: targetId })
    if (error && error.code !== DUPLICATE) throw error
  },

  async unfollow(followerId, targetId) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', targetId)
    if (error) throw error
  },

  async getCounts(userId) {
    const { data, error } = await supabase.rpc('follow_counts', { uid: userId }).single()
    if (error) throw error
    const row = data as FollowCountsRow
    return { followers: row.followers, following: row.following }
  },
}
