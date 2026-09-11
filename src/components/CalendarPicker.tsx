import { useState } from 'react'

const weekLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const kstDate = () => { const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''; return { year: Number(get('year')), month: Number(get('month')), day: Number(get('day')) } }
const today = kstDate()

export function CalendarPicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [viewYear, setViewYear] = useState(today.year)
  const [viewMonth, setViewMonth] = useState(today.month - 1)
  const pad = (num: number) => String(num).padStart(2, '0')
  const toKey = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`
  const todayKey = toKey(today.year, today.month - 1, today.day)
  const prevMonth = () => { const d = new Date(viewYear, viewMonth - 1, 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()) }
  const nextMonth = () => { const d = new Date(viewYear, viewMonth + 1, 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()) }
  const startWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: Array<number | null> = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  return <div className="calendar-box"><div className="calendar-header"><button type="button" className="calendar-nav" onClick={prevMonth} aria-label="Previous month">‹</button><span className="calendar-title">{viewYear}. {viewMonth + 1}.</span><button type="button" className="calendar-nav" onClick={nextMonth} aria-label="Next month">›</button></div><div className="calendar-week">{weekLetters.map((letter, index) => <span key={index}>{letter}</span>)}</div><div className="calendar-days">{cells.map((day, index) => { if (day === null) return <span className="calendar-empty" key={index} />; const key = toKey(viewYear, viewMonth, day); const disabled = key < todayKey; return <button type="button" className={['calendar-day', key === todayKey ? 'today' : '', key === value ? 'selected' : '', disabled ? 'disabled' : ''].filter(Boolean).join(' ')} key={index} disabled={disabled} onClick={() => onChange(key)}>{day}</button> })}</div></div>
}