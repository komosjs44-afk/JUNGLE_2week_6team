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
