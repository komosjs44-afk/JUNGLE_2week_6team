import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase 환경변수가 없습니다. .env 에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 를 설정하세요.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
