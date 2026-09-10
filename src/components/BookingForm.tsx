import { useState } from 'react'
import type { FormEvent } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type BookingFormProps = {
  text: Record<string, string>
  locale: 'ko' | 'zh-TW' | 'en' | 'ja'
  selected: Array<{ id: number; name: Record<string, string>; duration: number; price: number }>
  total: number
  money: Intl.NumberFormat
  duration: (value: number) => string
  onHome: () => void
}

const times = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30']

export function BookingForm({ text, locale, selected, total, money, duration, onHome }: BookingFormProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [doctor, setDoctor] = useState<'yes' | 'no'>('yes')
  const [sedation, setSedation] = useState<'yes' | 'no'>('no')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!isSupabaseConfigured || !supabase) {
      setError('예약 시스템이 아직 연결되지 않았습니다. 관리자에게 문의해주세요.')
      return
    }
    setSubmitting(true)
    const { error: insertError } = await supabase.from('appointments').insert({
      service_ids: selected.map((item) => item.id),
      service_names: selected.map((item) => ({ id: item.id, name: item.name[locale], duration: item.duration, price: item.price })),
      estimated_total: total,
      appointment_date: date,
      appointment_time: time,
      doctor_consultation: doctor,
      sedation,
      name,
      email: email || null,
      phone,
      note: note || null,
      locale,
      privacy_agreed: privacy,
      payment_status: 'PAY_ON_VISIT',
      status: 'REQUESTED',
    })
    setSubmitting(false)
    if (insertError) {
      setError('예약 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
      return
    }
    setComplete(true)
  }

  if (complete) return <section className="booking-page"><div className="success-message"><span>✓</span><h2>{text.success}</h2><p>{text.successText}</p><button className="primary-button" onClick={onHome}>{text.homeButton}</button></div></section>

  return <section className="booking-page"><div className="booking-title"><span className="section-number">KAIA APPOINTMENT</span><h1>{text.book}</h1><p>{text.bookText}</p></div><form className="booking-layout" onSubmit={handleSubmit}><div className="booking-form"><div className="form-section"><h2>01 <span>{text.agree}</span></h2><label className="checkbox-row"><input type="checkbox" required checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} />{text.agree}</label></div><div className="form-section"><h2>02 <span>{text.consult}</span></h2><div className="choice-grid"><label className={doctor === 'yes' ? 'choice active' : 'choice'}><input type="radio" name="doctor" checked={doctor === 'yes'} onChange={() => setDoctor('yes')} />{text.doctorYes}</label><label className={doctor === 'no' ? 'choice active' : 'choice'}><input type="radio" name="doctor" checked={doctor === 'no'} onChange={() => setDoctor('no')} />{text.doctorNo}</label></div><div className="choice-grid"><label className={sedation === 'yes' ? 'choice active' : 'choice'}><input type="radio" name="sedation" checked={sedation === 'yes'} onChange={() => setSedation('yes')} />{text.sleepYes}</label><label className={sedation === 'no' ? 'choice active' : 'choice'}><input type="radio" name="sedation" checked={sedation === 'no'} onChange={() => setSedation('no')} />{text.sleepNo}</label></div></div><div className="form-section"><h2>03 <span>{text.schedule}</span></h2><label className="input-label">{text.date}<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label><div className="time-grid">{times.map((item) => <button type="button" className={time === item ? 'time active' : 'time'} onClick={() => setTime(item)} key={item}>{item}</button>)}</div></div><div className="form-section"><h2>04 <span>{text.customer}</span></h2><div className="input-grid"><label className="input-label">{text.name}<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label className="input-label">{text.phone}<input required value={phone} onChange={(event) => setPhone(event.target.value)} /></label></div><label className="input-label">{text.email}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="input-label">{text.note}<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label></div></div><aside className="booking-summary"><h2>{text.summary} <span>{selected.length}</span></h2>{selected.map((item) => <div className="summary-item" key={item.id}><span>{item.name[locale]}<small>{duration(item.duration)}</small></span><strong>{money.format(item.price)}</strong></div>)}<div className="summary-total"><span>{text.estimate}</span><strong>{money.format(total)}</strong></div><p className="payment-note">{text.payment}</p>{error && <p className="booking-error" role="alert">{error}</p>}<button className="primary-button submit-button" type="submit" disabled={submitting || !time}>{submitting ? '...' : text.submit} <span>↗</span></button><button type="button" className="back-button" onClick={onHome}>{text.back}</button></aside></form></section>
}
