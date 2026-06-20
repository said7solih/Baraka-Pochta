'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Parcel, ParcelStatus, CargoType, STATUS_LABELS, Client } from '@/types'
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

export default function WarehousePage() {
  const supabase = createClient()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('Omborda')

  // Modal
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<Omit<Parcel, 'id'>>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusSaving, setStatusSaving] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  // Client autocomplete
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [clientFound, setClientFound] = useState<boolean | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let q = supabase.from('parcels').select('*').order('date', { ascending: true })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q.limit(300)
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

  function openAdd() {
    setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) })
    setEditId(null)
    setFormError('')
    setClientFound(null)
    setShowSuggestions(false)
    setModal('add')
    setTimeout(() => codeRef.current?.focus(), 100)
  }

  function openEdit(p: Parcel) {
    const { id, ...rest } = p
    setForm(rest)
    setEditId(id)
    setFormError('')
    setClientFound(true)
    setShowSuggestions(false)
    setModal('edit')
  }

  async function handleSave() {
    if (!form.client_code.trim()) { setFormError('Укажите код клиента'); return }
    if (!form.date) { setFormError('Укажите дату'); return }
    setSaving(true)
    setFormError('')
    if (modal === 'add') {
      const { error } = await supabase.from('parcels').insert(form)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('parcels').update(form).eq('id', editId!)
      if (error) { setFormError(error.message); setSaving(false); return }
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

  async function updateStatus(id: string, status: ParcelStatus) {
    setStatusSaving(id)
    await supabase.from('parcels').update({ status }).eq('id', id)
    setStatusSaving(null)
    load()
  }

  function f(field: keyof Omit<Parcel, 'id'>, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleClientCodeChange(val: string) {
    const code = val.toUpperCase()
    f('client_code', code)
    setClientFound(null)
    if (code.length < 2) { setClientSuggestions([]); setShowSuggestions(false); return }

    const { data } = await supabase
      .from('clients')
      .select('*')
      .ilike('client_code', `${code}%`)
      .limit(6)

    setClientSuggestions(data ?? [])
    setShowSuggestions((data ?? []).length > 0)
  }

  function applyClient(client: Client) {
    setForm(prev => ({
      ...prev,
      client_code: client.client_code,
      name: client.name ?? prev.name,
      phone: client.phone ?? prev.phone,
      address: client.address ?? prev.address,
    }))
    setClientFound(true)
    setShowSuggestions(false)
    setClientSuggestions([])
  }

  async function checkExactClient(code: string) {
    if (!code) return
    const { data } = await supabase.from('clients').select('*').eq('client_code', code).single()
    if (data) { applyClient(data) }
    else { setClientFound(false) }
  }

  const statuses: ParcelStatus[] = ['Omborda', 'Yetkazib berildi', 'Qaytib keldi', 'Olinmagan']

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Складское управление</h1>
          <p className="text-sm text-gray-500 mt-1">Приход, выдача и возврат грузов</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          + Добавить груз
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {([
          { label: 'На складе', st: 'Omborda', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Доставлено', st: 'Yetkazib berildi', color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Возврат', st: 'Qaytib keldi', color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Не забрано', st: 'Olinmagan', color: 'bg-gray-50 border-gray-200 text-gray-700' },
        ] as { label: string; st: string; color: string }[]).map(c => (
          <button
            key={c.label}
            onClick={() => setFilter(filter === c.st ? 'all' : c.st)}
            className={clsx('border rounded-xl p-4 text-left transition-all', c.color, filter === c.st && 'ring-2 ring-indigo-400')}
          >
            <div className="text-2xl font-bold">{parcels.filter(p => p.status === c.st).length}</div>
            <div className="text-xs mt-1 opacity-80">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')}
          className={clsx('px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
            filter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400')}>
          Все
        </button>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              filter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400')}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {['Дата','Код','Имя','Тип','Вес кг','Мест','Дней на складе','Статус','Действие',''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Загрузка...</td></tr>
            ) : parcels.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Нет данных</td></tr>
            ) : parcels.map(p => {
              const st = p.status as ParcelStatus
              const days = p.days_in_warehouse ?? 0
              const isUrgent = st === 'Omborda' && days >= 14
              return (
                <tr key={p.id} className={clsx('hover:bg-gray-50 group', isUrgent && 'bg-red-50')}>
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
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[st] ?? 'bg-gray-100')}>
                      {STATUS_LABELS[st] ?? st}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {st === 'Omborda' && (
                      <div className="flex gap-1">
                        <button onClick={() => updateStatus(p.id, 'Yetkazib berildi')} disabled={statusSaving === p.id}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50">
                          Выдать ✓
                        </button>
                        <button onClick={() => updateStatus(p.id, 'Qaytib keldi')} disabled={statusSaving === p.id}
                          className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50">
                          Возврат ↩
                        </button>
                        <button onClick={() => updateStatus(p.id, 'Olinmagan')} disabled={statusSaving === p.id}
                          className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500 disabled:opacity-50">
                          Не забрали
                        </button>
                      </div>
                    )}
                    {st !== 'Omborda' && (
                      <button onClick={() => updateStatus(p.id, 'Omborda')} disabled={statusSaving === p.id}
                        className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 disabled:opacity-50">
                        ← На склад
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(p)}
                        className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100">
                        ✏️
                      </button>
                      <button onClick={() => setDeleteId(p.id)}
                        className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 text-xs text-gray-500">
        <span><span className="text-orange-500 font-semibold">&gt;7 дней</span> — предупреждение</span>
        <span><span className="text-red-600 font-semibold">&gt;14 дней</span> — срочно забрать</span>
      </div>

      {/* ADD / EDIT MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {modal === 'add' ? 'Добавить груз на склад' : 'Редактировать груз'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="label">Дата прихода *</label>
                <input type="date" value={form.date} onChange={e => f('date', e.target.value)} className="inp" />
              </div>
              <div className="relative">
                <label className="label">Код клиента *</label>
                <div className="relative">
                  <input
                    ref={codeRef}
                    type="text"
                    placeholder="BB01101"
                    value={form.client_code}
                    onChange={e => handleClientCodeChange(e.target.value)}
                    onBlur={() => { setTimeout(() => setShowSuggestions(false), 150); checkExactClient(form.client_code) }}
                    className={clsx('inp font-mono uppercase pr-8', clientFound === true && 'border-green-400', clientFound === false && 'border-red-400')}
                  />
                  {clientFound === true && <span className="absolute right-2 top-2 text-green-500">✓</span>}
                  {clientFound === false && <span className="absolute right-2 top-2 text-red-400">?</span>}
                </div>
                {showSuggestions && (
                  <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {clientSuggestions.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => applyClient(c)}
                        className="w-full px-3 py-2 text-left hover:bg-indigo-50 text-sm flex items-center justify-between"
                      >
                        <span className="font-mono font-semibold text-indigo-700">{c.client_code}</span>
                        <span className="text-gray-600 truncate ml-2">{c.name}</span>
                        <span className="text-gray-400 text-xs ml-2 shrink-0">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
                {clientFound === false && (
                  <p className="text-xs text-orange-500 mt-1">Клиент не найден — данные нужно ввести вручную</p>
                )}
              </div>
              <div>
                <label className="label">Имя клиента</label>
                <input type="text" value={form.name ?? ''} onChange={e => f('name', e.target.value)} className="inp" />
              </div>
              <div>
                <label className="label">Телефон</label>
                <input type="tel" value={form.phone ?? ''} onChange={e => f('phone', e.target.value)} className="inp" />
              </div>
              <div>
                <label className="label">Поставщик</label>
                <input type="text" value={form.supplier ?? ''} onChange={e => f('supplier', e.target.value)} className="inp" />
              </div>
              <div>
                <label className="label">Тип груза</label>
                <select value={form.cargo_type ?? 'Pochta'} onChange={e => f('cargo_type', e.target.value as CargoType)} className="inp">
                  <option value="Pochta">Pochta</option>
                  <option value="Gabarit">Gabarit</option>
                  <option value="Avia">Avia</option>
                </select>
              </div>
              <div>
                <label className="label">Вес (кг)</label>
                <input type="number" step="0.01" value={form.weight_kg ?? ''}
                  onChange={e => f('weight_kg', e.target.value ? parseFloat(e.target.value) : null)} className="inp" />
              </div>
              <div>
                <label className="label">Мест</label>
                <input type="number" value={form.mesta ?? ''}
                  onChange={e => f('mesta', e.target.value ? parseInt(e.target.value) : null)} className="inp" />
              </div>
              <div>
                <label className="label">Сумма USD</label>
                <input type="number" step="0.01" value={form.amount_usd ?? ''}
                  onChange={e => f('amount_usd', e.target.value ? parseFloat(e.target.value) : null)} className="inp" />
              </div>
              <div>
                <label className="label">Сумма (сум)</label>
                <input type="number" value={form.amount_sum ?? ''}
                  onChange={e => f('amount_sum', e.target.value ? parseFloat(e.target.value) : null)} className="inp" />
              </div>
              <div>
                <label className="label">Статус</label>
                <select value={form.status ?? 'Omborda'} onChange={e => f('status', e.target.value as ParcelStatus)} className="inp">
                  {(Object.entries(STATUS_LABELS) as [ParcelStatus, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Адрес</label>
                <input type="text" value={form.address ?? ''} onChange={e => f('address', e.target.value)} className="inp" />
              </div>
              <div className="col-span-2">
                <label className="label">Комментарий</label>
                <textarea rows={2} value={form.comment ?? ''} onChange={e => f('comment', e.target.value)} className="inp resize-none" />
              </div>
            </div>
            {formError && (
              <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
            )}
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Отмена</button>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Удалить запись?</h2>
            <p className="text-sm text-gray-500 mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Отмена</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Удалить</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
        .inp { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.875rem; outline: none; }
        .inp:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }
      `}</style>
    </div>
  )
}
