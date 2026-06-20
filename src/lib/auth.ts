import { createClient } from '@/lib/supabase/server'
import { Role } from '@/types'

export async function getUserRole(): Promise<Role | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return (data?.role as Role) ?? null
}

export async function getClientCode(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_roles')
    .select('client_code')
    .eq('user_id', user.id)
    .single()

  return data?.client_code ?? null
}
