'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Parcel, ParcelStatus, CargoType, STATUS_LABELS } from '@/types'
import clsx from 'clsx'

const STATUS_COLORS: Record<ParcelStatus, string> = {
  Omborda: 'bg-yellow-100 text-yellow-800',
  'Yetkazib berildi': 'bg-green-100 text-green-800',
  'Qaytib keldi': 'bg-red-100 text-red-800',
  Olinmagan: 'bg-gray-100 text-gray-700',
}

const EMPTY: Omit<Parcel, 'id'> = {
  date: new Date().toISOString().slice(0, 10),
  client_code: '',
  supplier: '',
  cargo_type: 'Pochta',
  address: '',
  weight_kg: null,
  mesta: null,
  amount_usd: null,
  amount_sum: null,
  phone: '',
  name: '',
  comment: '',
  status: 'Omborda',
  warehouse_status: null,
  days_in_warehouse: null,
  exchange_rate: null,
}

export default function ParcelsPage() {
  const supabase = createClient()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Modal state
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<Omit<Parcel, 'id'>>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')

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

  function openAdd() {
    setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) })
    setEditId(null)
    setError('')
    setModal('add')
  }

  function openEdit(p: Parcel) {
    const { id, ...rest } = p
    setForm(rest)
    setEditId(id)
    setError('')
    setModal('edit')
  }

  async function handleSave() {
    if (!form.client_code.trim()) { setError('Укажите код клиента'); return }
    if (!form.date) { setError('Укажите дату'); return }
    setSaving(true)
    setError('')
    if (modal === 'add') {
      const { error } = await supabase.from('parcels').insert(form)
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('parcels').update(form).eq('id', editId!)
      if (error) { setError(error.message); setSaving(false); return }
    }
    setSaving(false)
    setModal(null)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('parcels').delete().eq('id', id)
    setDeleteId(null)
    load()
  }

  function f(field: keyof Omit<Parcel,'id'>, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
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
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{filtered.length} записей</span>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            + Добавить
          </button>
        </div>
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
              {['Дата','Код','Имя','Поставщик','Тип','Вес','Мест','USD','Сум','Статус',''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">Загрузка...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">Нет данных</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 group">
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
                <td className="px-4 py-3">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(p)}
                      className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
                    >✏️ Изменить</button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {modal === 'add' ? 'Добавить накладную' : 'Редактировать накладную'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {/* Row 1 */}
              <div>
                <label className="label">Дата *</label>
                <input type="date" value={form.date} onChange={e => f('date', e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Код клиента *</label>
                <input type="text" placeholder="BB01101" value={form.client_code}
                  onChange={e => f('client_code', e.target.value.toUpperCase())} className="input font-mono uppercase" />
              </div>
              {/* Row 2 */}
              <div>
                <label className="label">Имя клиента</label>
                <input type="text" value={form.name ?? ''} onChange={e => f('name', e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Телефон</label>
                <input type="tel" value={form.phone ?? ''} onChange={e => f('phone', e.target.value)} className="input" />
              </div>
              {/* Row 3 */}
              <div>
                <label className="label">Поставщик</label>
                <input type="text" value={form.supplier ?? ''} onChange={e => f('supplier', e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Тип груза</label>
                <select value={form.cargo_type ?? 'Pochta'} onChange={e => f('cargo_type', e.target.value as CargoType)} className="input">
                  <option value="Pochta">Pochta</option>
                  <option value="Gabarit">Gabarit</option>
                  <option value="Avia">Avia</option>
                </select>
              </div>
              {/* Row 4 */}
              <div>
                <label className="label">Вес (кг)</label>
                <input type="number" step="0.01" value={form.weight_kg ?? ''}
                  onChange={e => f('weight_kg', e.target.value ? parseFloat(e.target.value) : null)} className="input" />
              </div>
              <div>
                <label className="label">Мест</label>
                <input type="number" value={form.mesta ?? ''}
                  onChange={e => f('mesta', e.target.value ? parseInt(e.target.value) : null)} className="input" />
              </div>
              {/* Row 5 */}
              <div>
                <label className="label">Сумма USD</label>
                <input type="number" step="0.01" value={form.amount_usd ?? ''}
                  onChange={e => f('amount_usd', e.target.value ? parseFloat(e.target.value) : null)} className="input" />
              </div>
              <div>
                <label className="label">Сумма (сум)</label>
                <input type="number" value={form.amount_sum ?? ''}
                  onChange={e => f('amount_sum', e.target.value ? parseFloat(e.target.value) : null)} className="input" />
              </div>
              {/* Row 6 */}
              <div>
                <label className="label">Статус</label>
                <select value={form.status ?? 'Omborda'} onChange={e => f('status', e.target.value as ParcelStatus)} className="input">
                  {(Object.entries(STATUS_LABELS) as [ParcelStatus, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Адрес</label>
                <input type="text" value={form.address ?? ''} onChange={e => f('address', e.target.value)} className="input" />
              </div>
              {/* Row 7 */}
              <div className="col-span-2">
                <label className="label">Комментарий</label>
                <textarea rows={2} value={form.comment ?? ''} onChange={e => f('comment', e.target.value)}
                  className="input resize-none" />
              </div>
            </div>
            {error && (
              <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
                Отмена
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Сохранение...' : modal === 'add' ? 'Добавить' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Удалить накладную?</h2>
            <p className="text-sm text-gray-500 mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Отмена</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
        .input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }
      `}</style>
    </div>
  )
}
