import type { LeafRepository } from '../types'
import type { LeafReason, LeafSourceType, LeafTransaction } from '@/types'
import { supabase } from '@/lib/supabase'

// ============================================================
// 나뭇잎 원장 Supabase 구현 (docs/supabase-events.sql 실행 후 활성화).
// 적립은 security definer 함수 award_leaf() RPC로만 수행 → 중복/임의 적립 차단.
// 서비스 전환: src/services/leaves.ts 의 import 를 이 구현으로 교체.
// ============================================================

interface AmountRow {
  amount: number
}

interface LeafRow {
  id: string
  user_id: string
  amount: number
  reason: string
  source_type: string
  source_id: string | null
  label: string
  created_at: string
}

function toTx(row: LeafRow): LeafTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    reason: row.reason as LeafReason,
    sourceType: row.source_type as LeafSourceType,
    sourceId: row.source_id,
    label: row.label,
    createdAt: row.created_at,
  }
}

export const supabaseLeafRepository: LeafRepository = {
  async getBalance(userId) {
    const { data, error } = await supabase
      .from('leaf_transactions')
      .select('amount')
      .eq('user_id', userId)
    if (error) throw error
    return (data as AmountRow[]).reduce((sum, r) => sum + r.amount, 0)
  },

  async listTransactions(userId) {
    const { data, error } = await supabase
      .from('leaf_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as LeafRow[]).map(toTx)
  },

  async award(input) {
    // idempotent — 함수 내부에서 on conflict do nothing
    const { error } = await supabase.rpc('award_leaf', {
      p_user_id: input.userId,
      p_amount: input.amount,
      p_reason: input.reason,
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
      p_label: input.label,
    })
    if (error) throw error
  },
}
