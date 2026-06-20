'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Parcel, CargoType, ParcelStatus } from '@/types'
import * as XLSX from 'xlsx'

type PreviewRow = Omit<Parcel, 'id'>

export default function UploadPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(0)
  const [error, setError] = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    setPreview([])
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null })

        const parsed: PreviewRow[] = rows.map(r => ({
          date: formatDate(r['Дата'] ?? r['date'] ?? r['DATE']),
          supplier: str(r['Поставщик'] ?? r['supplier']),
          client_code: str(r['Код клиента'] ?? r['client_code'] ?? r['КОД'])?.toUpperCase() ?? '',
          cargo_type: str(r['Тип груза'] ?? r['cargo_type']) as CargoType | null,
          address: str(r['Адрес'] ?? r['address']),
          weight_kg: num(r['Вес'] ?? r['weight_kg'] ?? r['КГ']),
          mesta: num(r['Мест'] ?? r['mesta']),
          amount_usd: num(r['USD'] ?? r['amount_usd']),
          amount_sum: num(r['Сум'] ?? r['amount_sum']),
          phone: str(r['Телефон'] ?? r['phone']),
          name: str(r['Имя'] ?? r['name']),
          comment: str(r['Комментарий'] ?? r['comment']),
          status: (str(r['Статус'] ?? r['status']) as ParcelStatus) ?? 'Omborda',
          warehouse_status: str(r['warehouse_status']),
          days_in_warehouse: num(r['days_in_warehouse']),
          exchange_rate: num(r['exchange_rate'] ?? r['Курс']),
        }))

        setPreview(parsed.filter(r => r.client_code))
      } catch {
        setError('Ошибка парсинга файла. Проверьте формат.')
      }
    }
    reader.readAsBinaryString(file)
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    const { error } = await supabase.from('parcels').insert(preview)
    setSaving(false)
    if (error) { setError(error.message); return }
    setSaved(preview.length)
    setPreview([])
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Загрузить накладные</h1>

      {/* Upload zone */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
        <div className="text-4xl mb-3">📁</div>
        <p className="text-gray-600 mb-1">Загрузите Excel или CSV файл с накладными</p>
        <p className="text-xs text-gray-400 mb-4">Колонки: Дата, Код клиента, Поставщик, Тип груза, Адрес, Вес, Мест, USD, Сум, Телефон, Имя, Статус, Комментарий</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile}
          className="hidden" id="file-upload" />
        <label htmlFor="file-upload"
          className="cursor-pointer inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          Выбрать файл
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {saved > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ Сохранено {saved} записей
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Предпросмотр: {preview.length} строк</p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : `Сохранить ${preview.length} записей`}
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['Дата','Код','Имя','Поставщик','Вес','USD','Статус'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{p.date}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-indigo-700">{p.client_code}</td>
                    <td className="px-3 py-2 text-gray-900">{p.name ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{p.supplier ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{p.weight_kg ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{p.amount_usd ? `$${p.amount_usd}` : '—'}</td>
                    <td className="px-3 py-2">{p.status ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  return String(v).trim()
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function formatDate(v: unknown): string {
  if (!v) return new Date().toISOString().slice(0, 10)
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10)
}
