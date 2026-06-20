'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Expense, ExpenseCategory, EXPENSE_CATEGORY_LABELS } from '@/types'

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]

export default function ExpensesPage() {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => { load() }, [category, dateFrom, dateTo])

  async function load() {
    setLoading(true)
    let q = supabase.from('expenses').select('*').order('date', { ascending: false })
    if (category !== 'all') q = q.eq('category', category)
    if (dateFrom) q = q.gte('date', dateFrom)
    if (dateTo) q = q.lte('date', dateTo)
    const { data } = await q.limit(200)
    setExpenses(data ?? [])
    setLoading(false)
  }

  const total = expenses.reduce((s, e) => s + (e.total_usd ?? 0), 0)

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Расходы</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Все категории</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={() => { setCategory('all'); setDateFrom(''); setDateTo('') }}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border rounded-lg">
          Сбросить
        </button>
      </div>

      <div className="text-sm text-gray-500">
        Итого: <span className="font-semibold text-gray-900">${total.toLocaleString()}</span> ({expenses.length} записей)
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {['Дата','Категория','Статья','Сотрудник','USD','Сум','Итого USD','Комментарий'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Загрузка...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Нет данных</td></tr>
            ) : expenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{e.date}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                    {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-900">{e.expense_item ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{e.employee_name ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-right">{e.usd ? `$${e.usd}` : '—'}</td>
                <td className="px-4 py-3 font-mono text-right">{e.sum ? `${e.sum.toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3 font-mono text-right font-semibold">{e.total_usd ? `$${e.total_usd}` : '—'}</td>
                <td className="px-4 py-3 text-gray-500 max-w-48 truncate">{e.comment ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
