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

export default function ParcelsPage() {
  const supabase = createClient()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => { load() }, [status, dateFrom, dateTo])

  async function load() {
    setLoading(true)
    let q = supabase.from('parcels').select('*').order('date', { ascending: false })
    if (status !== 'all') q = q.eq('status', status)
    if (dateFrom) q = q.gte('date', dateFrom)
    if (dateTo) q = q.lte('date', dateTo)
    const { data } = await q.limit(300)
    setParcels(data ?? [])
    setLoading(false)
  }

  const filtered = search
    ? parcels.filter(p =>
        p.client_code?.toLowerCase().includes(search.toLowerCase()) ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search)
      )
    : parcels

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Накладные</h1>
        <span className="text-sm text-gray-500">{filtered.length} записей</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Поиск по коду, имени, телефону..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">Все статусы</option>
          {(Object.keys(STATUS_LABELS) as ParcelStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={() => { setStatus('all'); setDateFrom(''); setDateTo(''); setSearch('') }}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border rounded-lg">
          Сбросить
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {['Дата','Код клиента','Имя','Поставщик','Тип','Вес кг','Мест','USD','Сум','Статус','Дней на складе'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">Загрузка...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">Нет данных</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">{p.date}</td>
                <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{p.client_code}</td>
                <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{p.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{p.supplier ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{p.cargo_type ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono">{p.weight_kg ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono">{p.mesta ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono">{p.amount_usd ? `$${p.amount_usd}` : '—'}</td>
                <td className="px-4 py-3 text-right font-mono">{p.amount_sum ? p.amount_sum.toLocaleString() : '—'}</td>
                <td className="px-4 py-3">
                  {p.status ? (
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[p.status as ParcelStatus])}>
                      {STATUS_LABELS[p.status as ParcelStatus] ?? p.status}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center">{p.days_in_warehouse ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
