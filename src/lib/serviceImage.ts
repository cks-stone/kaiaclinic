import { supabase } from './supabase'

export const serviceImageUrl = (path: string | null | undefined): string => {
  if (!path || !supabase) return ''
  return supabase.storage.from('service-images').getPublicUrl(path).data.publicUrl
}

export const blogAssetUrl = (path: string | null | undefined): string => {
  if (!path || !supabase) return ''
  return supabase.storage.from('blog-assets').getPublicUrl(path).data.publicUrl
}

export const doctorImageUrl = (path: string | null | undefined): string => {
  if (!path || !supabase) return ''
  return supabase.storage.from('service-images').getPublicUrl(path).data.publicUrl
}