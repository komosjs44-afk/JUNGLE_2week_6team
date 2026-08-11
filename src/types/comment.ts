export interface Comment {
  id: string
  referenceId: string
  /** 회원 댓글이면 회원 id, 게스트 댓글이면 undefined */
  userId?: string
  nickname: string
  avatarUrl?: string | null
  /** 게스트가 남긴 댓글인지 (author 뱃지 표시용) */
  isGuest: boolean
  body: string
  createdAt: string
}

export interface NewCommentInput {
  referenceId: string
  body: string
  /** 로그인 회원이면 채움 */
  userId?: string
  /** 게스트면 채움 (userId와 배타적) */
  guestNickname?: string
}
