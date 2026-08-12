import type { LeafRepository } from '../types'
import type { LeafAwardInput, LeafTransaction } from '@/types'
import { MOCK_LEAF_TRANSACTIONS } from '@/mocks'
import { mockDelay } from './delay'

// 인메모리 원장(append-only). 시드를 복사해 시작하고, 런타임 적립분을 push한다.
// 새로고침 시 초기화됨(mock 특성) — 실서버 전환 시 supabase leaf_transactions로 대체.
const transactions: LeafTransaction[] = [...MOCK_LEAF_TRANSACTIONS]

let counter = 0
function nextId(): string {
  return `leaf-rt-${Date.now()}-${counter++}`
}

// 중복 지급 방지 키: (userId, reason, sourceType, sourceId)
function alreadyAwarded(input: LeafAwardInput): boolean {
  return transactions.some(
    (t) =>
      t.userId === input.userId &&
      t.reason === input.reason &&
      t.sourceType === input.sourceType &&
      t.sourceId === input.sourceId,
  )
}

export const mockLeafRepository: LeafRepository = {
  async getBalance(userId) {
    const balance = transactions
      .filter((t) => t.userId === userId)
      .reduce((sum, t) => sum + t.amount, 0)
    return mockDelay(balance)
  },

  async listTransactions(userId) {
    const list = transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return mockDelay(list)
  },

  async award(input) {
    if (!alreadyAwarded(input)) {
      transactions.push({ id: nextId(), createdAt: new Date().toISOString(), ...input })
    }
    return mockDelay(undefined)
  },
}
