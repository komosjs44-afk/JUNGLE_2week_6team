import { supabase } from '@/lib/supabase'

const BUCKET = 'reference-images'

// crypto.randomUUID 는 보안 컨텍스트(HTTPS/localhost)에서만 동작해서
// 폰의 http://LAN-IP 접속에선 없다. 폴백으로 고유 파일명 생성.
function uniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * 이미지 파일을 Supabase Storage(reference-images)에 업로드하고
 * 영구 public URL 을 돌려준다.
 * 경로는 `${userId}/${uuid}.${ext}` 형태로 사용자별로 구분한다.
 */
export async function uploadReferenceImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${uniqueId()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

const USER_PHOTOS_BUCKET = 'user-photos'

/**
 * 내 사진을 user-photos 버킷에 업로드하고 public URL을 돌려준다.
 * AI 색감 분석(Edge Function)이 서버에서 fetch할 수 있는 URL이 필요할 때 쓴다 —
 * 로컬 blob: URL은 브라우저 밖에서 읽을 수 없다.
 */
export async function uploadUserPhoto(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${uniqueId()}.${ext}`

  const { error } = await supabase.storage.from(USER_PHOTOS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error

  const { data } = supabase.storage.from(USER_PHOTOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
