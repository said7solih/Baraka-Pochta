'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/types'

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6']

interface StatCard {
  label: string
  value: string
  sub?: string
  color: string
}

export default function OwnerDashboard() {
  const supabase = createClient()

  const [balance, setBalance] = useState<{ total_balance_usd: number; usd: number; sum: number } | null>(null)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyExpense, setMonthlyExpense] = useState(0)
  const [dailyData, setDailyData] = useState<{ date: string; income: number; expense: number }[]>([])
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([])
  const [employeeExpenses, setEmployeeExpenses] = useState<{ employee_name: string; total: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [balRes, dailyRes, expRes] = await Promise.all([
      supabase.from('balance').select('total_balance_usd,usd,sum').order('date', { ascending: false }).limit(1).single(),
      supabase.from('daily_finance').select('*').gte('date', monthStart).order('date'),
      supabase.from('expenses').select('category,total_usd,employee_name').gte('date', monthStart),
    ])

    if (balRes.data) setBalance(balRes.data)

    if (dailyRes.data) {
      const income = dailyRes.data.reduce((s, r) => s + (r.income_usd ?? 0), 0)
      const expense = dailyRes.data.reduce((s, r) => s + (r.expense_usd ?? 0), 0)
      setMonthlyIncome(income)
      setMonthlyExpense(expense)
      setDailyData(dailyRes.data.map(r => ({
        date: r.date.slice(5),
        income: r.income_usd ?? 0,
        expense: r.expense_usd ?? 0,
      })))
    }

    if (expRes.data) {
      const byCat: Record<string, number> = {}
      const byEmp: Record<string, number> = {}

      expRes.data.forEach(e => {
        const cat = e.category as ExpenseCategory
        byCat[cat] = (byCat[cat] ?? 0) + (e.total_usd ?? 0)
        if (e.employee_name) {
          byEmp[e.employee_name] = (byEmp[e.employee_name] ?? 0) + (e.total_usd ?? 0)
        }
      })

      setCategoryData(
        Object.entries(byCat).map(([k, v]) => ({
          name: EXPENSE_CATEGORY_LABELS[k as ExpenseCategory] ?? k,
          value: Math.round(v * 100) / 100,
        }))
      )
      setEmployeeExpenses(
        Object.entries(byEmp)
          .map(([employee_name, total]) => ({ employee_name, total }))
          .sort((a, b) => b.total - a.total)
      )
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <div className="text-gray-400 animate-pulse">Загрузка...</div>
      </div>
    )
  }

  const cards: StatCard[] = [
    { label: 'Баланс (USD)', value: `$${(balance?.total_balance_usd ?? 0).toLocaleString()}`, color: 'bg-indigo-50 border-indigo-200' },
    { label: 'Баланс (сум)', value: `${(balance?.sum ?? 0).toLocaleString()} сум`, color: 'bg-blue-50 border-blue-200' },
    { label: 'Доход за месяц', value: `$${monthlyIncome.toLocaleString()}`, color: 'bg-green-50 border-green-200' },
    { label: 'Расход за месяц', value: `$${monthlyExpense.toLocaleString()}`, color: 'bg-red-50 border-red-200' },
  ]

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Аналитика</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`border rounded-xl p-5 ${c.color}`}>
            <div className="text-sm text-gray-500 mb-1">{c.label}</div>
            <div className="text-xl font-bold text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Line chart */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Доходы и расходы по дням</h2>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => typeof v === 'number' ? `$${v.toLocaleString()}` : v} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Доход" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expense" name="Расход" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-300 text-sm">Нет данных</div>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Расходы по категориям</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => typeof v === 'number' ? `$${v.toLocaleString()}` : v} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-300 text-sm">Нет данных</div>
          )}
        </div>
      </div>

      {/* Employee expenses table */}
      {employeeExpenses.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-sm font-semibold text-gray-700">Расходы по сотрудникам (текущий месяц)</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Сотрудник</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Сумма (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employeeExpenses.map(e => (
                <tr key={e.employee_name} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-900">{e.employee_name}</td>
                  <td className="px-6 py-3 text-right text-gray-900 font-mono">${e.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
