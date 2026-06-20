import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TrackClient from './TrackClient'

export default async function TrackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, client_code')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'client' || !roleData.client_code) {
    redirect('/dashboard')
  }

  return <TrackClient clientCode={roleData.client_code} />
}
