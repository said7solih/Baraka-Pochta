import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OwnerDashboard from './OwnerDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'owner') redirect('/parcels')

  return <OwnerDashboard />
}
