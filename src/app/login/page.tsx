'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type LoginMode = 'staff' | 'client'
type ClientStep = 'code' | 'phone' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<LoginMode>('staff')

  // Staff (owner/employee) state — email + password
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')

  // Client state
  const [clientCode, setClientCode] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientOtp, setClientOtp] = useState('')
  const [clientStep, setClientStep] = useState<ClientStep>('code')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    return digits.startsWith('998') ? `+${digits}` : `+998${digits}`
  }

  // --- STAFF FLOW (email + password) ---
  async function handleStaffLogin() {
    setError('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: staffEmail.trim(),
      password: staffPassword,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    if (!data.user) { setError('Пользователь не найден'); return }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .single()

    if (!roleData || roleData.role === 'client') {
      await supabase.auth.signOut()
      setError('Нет доступа. Используйте вход для клиентов.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  // --- CLIENT FLOW ---
  async function handleClientCheckCode() {
    setError('')
    if (!clientCode.trim()) { setError('Введите код клиента'); return }
    setClientStep('phone')
  }

  async function handleClientSendOtp() {
    setError('')
    setLoading(true)
    const phone = formatPhone(clientPhone)

    // Check that client_code + phone match
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, phone')
      .eq('client_code', clientCode.trim().toUpperCase())
      .single()

    if (clientErr || !client) {
      setLoading(false)
      setError('Клиент с таким кодом не найден')
      return
    }

    // Phone verification (soft match on digits)
    const dbDigits = (client.phone ?? '').replace(/\D/g, '').slice(-9)
    const inputDigits = phone.replace(/\D/g, '').slice(-9)
    if (dbDigits && dbDigits !== inputDigits) {
      setLoading(false)
      setError('Номер телефона не совпадает с нашими данными')
      return
    }

    const { error } = await supabase.auth.signInWithOtp({ phone })
    setLoading(false)
    if (error) { setError(error.message); return }
    setMessage(`Код отправлен на ${phone}`)
    setClientStep('otp')
  }

  async function handleClientVerifyOtp() {
    setError('')
    setLoading(true)
    const phone = formatPhone(clientPhone)
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: clientOtp,
      type: 'sms',
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    if (!data.user) { setError('Ошибка верификации'); return }

    // Ensure user_roles record exists for this client
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', data.user.id)
      .single()

    if (!existing) {
      await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: 'client',
        client_code: clientCode.trim().toUpperCase(),
      })
    }

    router.push('/track')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">BP</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Baraka Pochta</h1>
          <p className="text-gray-500 text-sm mt-1">Внутренняя система учёта</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            onClick={() => { setMode('staff'); setError(''); setMessage('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'staff'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Сотрудник / Владелец
          </button>
          <button
            onClick={() => { setMode('client'); setError(''); setMessage('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'client'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Клиент
          </button>
        </div>

        {/* Error / Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {message}
          </div>
        )}

        {/* STAFF FORM — email + password */}
        {mode === 'staff' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="owner@baraka.uz"
                value={staffEmail}
                onChange={e => setStaffEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пароль
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={staffPassword}
                onChange={e => setStaffPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <button
              onClick={handleStaffLogin}
              disabled={loading || !staffEmail || !staffPassword}
              className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </div>
        )}

        {/* CLIENT FORM */}
        {mode === 'client' && (
          <div className="space-y-4">
            {clientStep === 'code' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Код клиента
                  </label>
                  <input
                    type="text"
                    placeholder="BB01101"
                    value={clientCode}
                    onChange={e => setClientCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleClientCheckCode()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm uppercase tracking-wider font-mono"
                  />
                </div>
                <button
                  onClick={handleClientCheckCode}
                  disabled={!clientCode.trim()}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Продолжить
                </button>
              </>
            )}

            {clientStep === 'phone' && (
              <>
                <div className="p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">
                  Код клиента: <span className="font-mono font-bold">{clientCode}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Номер телефона
                  </label>
                  <input
                    type="tel"
                    placeholder="+998 90 123 45 67"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleClientSendOtp()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <button
                  onClick={handleClientSendOtp}
                  disabled={loading || !clientPhone}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Проверка...' : 'Отправить код'}
                </button>
                <button
                  onClick={() => { setClientStep('code'); setError('') }}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Изменить код клиента
                </button>
              </>
            )}

            {clientStep === 'otp' && (
              <>
                <div className="p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">
                  Код клиента: <span className="font-mono font-bold">{clientCode}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Код из SMS
                  </label>
                  <input
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={clientOtp}
                    onChange={e => setClientOtp(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleClientVerifyOtp()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm tracking-widest text-center text-lg"
                  />
                </div>
                <button
                  onClick={handleClientVerifyOtp}
                  disabled={loading || clientOtp.length < 4}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Проверка...' : 'Войти'}
                </button>
                <button
                  onClick={() => { setClientStep('phone'); setClientOtp(''); setMessage('') }}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Изменить номер
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
