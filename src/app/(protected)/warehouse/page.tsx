'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Parcel, ParcelStatus, STATUS_LABELS } from '@/types'
import clsx from 'clsx'

const STATUS_COLORS: Record<ParcelStatus, string> = {
  Omborda: 'bg-yellow-100 text-yellow-800',
  'Yetkazib berildi': 'bg-green-100 text-green-800',
  'Qaytib keldi': 'bg-red-100 text-red-800',
  Olinmagan: 'bg-gray-100 text-gray-700',
}

export default function WarehousePage() {
  const supabase = createClient()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('Omborda')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let q = supabase
      .from('parcels')
      .select('*')
      .order('date', { ascending: true })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q.limit(300)
    // auto-calc days in warehouse for Omborda items
    const today = new Date()
    const rows = (data ?? []).map(p => {
      if (p.status === 'Omborda' && p.date) {
        const d = Math.floor((today.getTime() - new Date(p.date).getTime()) / 86400000)
        return { ...p, days_in_warehouse: d }
      }
      return p
    })
    setParcels(rows)
    setLoading(false)
  }

  async function updateStatus(id: string, status: ParcelStatus) {
    setSaving(id)
    const today = new Date().toISOString().slice(0, 10)
    await supabase
      .from('parcels')
      .update({ status, warehouse_status: status === 'Yetkazib berildi' ? today : null })
      .eq('id', id)
    setSaving(null)
    load()
  }

  const counts = {
    Omborda: parcels.filter(p => p.status === 'Omborda').length,
    total: parcels.length,
  }

  const statuses: ParcelStatus[] = ['Omborda', 'Yetkazib berildi', 'Qaytib keldi', 'Olinmagan']

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Складское управление</h1>
          <p className="text-sm text-gray-500 mt-1">Приход, выдача и возврат грузов</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'На складе', value: parcels.filter(p=>p.status==='Omborda').length, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Доставлено', value: parcels.filter(p=>p.status==='Yetkazib berildi').length, color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Возврат', value: parcels.filter(p=>p.status==='Qaytib keldi').length, color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Не забрано', value: parcels.filter(p=>p.status==='Olinmagan').length, color: 'bg-gray-50 border-gray-200 text-gray-700' },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-4 ${c.color}`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs mt-1 opacity-80">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={clsx('px-4 py-2 rounded-lg text-sm font-medium border transition-colors', filter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400')}
        >
          Все
        </button>
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium border transition-colors', filter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400')}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {['Дата прихода','Код клиента','Имя','Тип','Вес кг','Мест','Дней на складе','Статус','Действие'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Загрузка...</td></tr>
            ) : parcels.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Нет данных</td></tr>
            ) : parcels.map(p => {
              const st = p.status as ParcelStatus
              const days = p.days_in_warehouse ?? 0
              const isUrgent = st === 'Omborda' && days >= 14
              return (
                <tr key={p.id} className={clsx('hover:bg-gray-50', isUrgent && 'bg-red-50')}>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.date}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{p.client_code}</td>
                  <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{p.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.cargo_type ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.weight_kg ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.mesta ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('font-semibold', isUrgent ? 'text-red-600' : days > 7 ? 'text-orange-500' : 'text-gray-700')}>
                      {st === 'Omborda' ? `${days} дн.` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[st] ?? 'bg-gray-100 text-gray-700')}>
                      {STATUS_LABELS[st] ?? st}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {st === 'Omborda' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(p.id, 'Yetkazib berildi')}
                          disabled={saving === p.id}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Выдать ✓
                        </button>
                        <button
                          onClick={() => updateStatus(p.id, 'Qaytib keldi')}
                          disabled={saving === p.id}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50"
                        >
                          Возврат ↩
                        </button>
                        <button
                          onClick={() => updateStatus(p.id, 'Olinmagan')}
                          disabled={saving === p.id}
                          className="px-3 py-1 bg-gray-400 text-white text-xs rounded-lg hover:bg-gray-500 disabled:opacity-50"
                        >
                          Не забрали
                        </button>
                      </div>
                    )}
                    {st !== 'Omborda' && (
                      <button
                        onClick={() => updateStatus(p.id, 'Omborda')}
                        disabled={saving === p.id}
                        className="px-3 py-1 bg-yellow-500 text-white text-xs rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                      >
                        ← На склад
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 inline-block"></span> &gt;7 дней — предупреждение</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span> &gt;14 дней — срочно забрать</span>
      </div>
    </div>
  )
}
