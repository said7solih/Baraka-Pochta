import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { Role } from '@/types'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = (roleData?.role ?? 'employee') as Role

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} userPhone={user.phone ?? undefined} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
