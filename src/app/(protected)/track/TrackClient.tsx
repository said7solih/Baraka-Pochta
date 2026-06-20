'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Parcel, ParcelStatus, STATUS_LABELS } from '@/types'
import clsx from 'clsx'

const STATUS_COLORS: Record<ParcelStatus, string> = {
  Omborda: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Yetkazib berildi': 'bg-green-100 text-green-800 border-green-200',
  'Qaytib keldi': 'bg-red-100 text-red-800 border-red-200',
  Olinmagan: 'bg-gray-100 text-gray-700 border-gray-200',
}

const STATUS_ICONS: Record<ParcelStatus, string> = {
  Omborda: '🏭',
  'Yetkazib berildi': '✅',
  'Qaytib keldi': '↩️',
  Olinmagan: '⏳',
}

export default function TrackClient({ clientCode }: { clientCode: string }) {
  const supabase = createClient()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('parcels')
      .select('*')
      .eq('client_code', clientCode)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setParcels(data ?? [])
        setLoading(false)
      })
  }, [clientCode])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <div className="text-gray-400 animate-pulse">Загрузка...</div>
      </div>
    )
  }

  const counts = {
    total: parcels.length,
    delivered: parcels.filter(p => p.status === 'Yetkazib berildi').length,
    warehouse: parcels.filter(p => p.status === 'Omborda').length,
    returned: parcels.filter(p => p.status === 'Qaytib keldi').length,
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Мои посылки</h1>
        <p className="text-gray-500 text-sm mt-1">Код клиента: <span className="font-mono font-semibold text-indigo-600">{clientCode}</span></p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Всего', value: counts.total, color: 'bg-indigo-50 border-indigo-200' },
          { label: 'На складе', value: counts.warehouse, color: 'bg-yellow-50 border-yellow-200' },
          { label: 'Доставлено', value: counts.delivered, color: 'bg-green-50 border-green-200' },
          { label: 'Возврат', value: counts.returned, color: 'bg-red-50 border-red-200' },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-4 text-center ${c.color}`}>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Parcel cards */}
      {parcels.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Посылок не найдено</div>
      ) : (
        <div className="space-y-3">
          {parcels.map(p => {
            const st = p.status as ParcelStatus
            return (
              <div key={p.id} className={clsx('border rounded-xl p-4', STATUS_COLORS[st] ?? 'bg-white border-gray-200')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{STATUS_ICONS[st] ?? '📦'}</span>
                      <span className="font-semibold text-sm">
                        {st ? (STATUS_LABELS[st] ?? st) : 'Неизвестно'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <div>Дата: {p.date}</div>
                      {p.supplier && <div>Поставщик: {p.supplier}</div>}
                      {p.cargo_type && <div>Тип: {p.cargo_type}</div>}
                      {p.weight_kg && <div>Вес: {p.weight_kg} кг</div>}
                      {p.mesta && <div>Мест: {p.mesta}</div>}
                      {p.days_in_warehouse ? <div>На складе: {p.days_in_warehouse} дн.</div> : null}
                      {p.comment && <div>Комментарий: {p.comment}</div>}
                    </div>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    {p.amount_usd && <div className="font-mono font-semibold">${p.amount_usd}</div>}
                    {p.amount_sum && <div className="text-gray-500">{p.amount_sum.toLocaleString()} сум</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
