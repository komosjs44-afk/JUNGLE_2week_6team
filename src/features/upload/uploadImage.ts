import { supabase } from '@/lib/supabase'

const BUCKET = 'reference-images'

/**
 * 이미지 파일을 Supabase Storage(reference-images)에 업로드하고
 * 영구 public URL 을 돌려준다.
 * 경로는 `${userId}/${uuid}.${ext}` 형태로 사용자별로 구분한다.
 */
export async function uploadReferenceImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
