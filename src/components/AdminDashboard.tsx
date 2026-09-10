import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Appointment = {
  id: string
  service_names: Array<{ name?: string; duration?: number; price?: number }>
  appointment_date: string
  appointment_time: string
  doctor_consultation: 'yes' | 'no'
  sedation: 'yes' | 'no'
  name: string
  email: string | null
  phone: string
  note: string | null
  locale: string
  estimated_total: number
  payment_status: string
  status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  created_at: string
}

type Props = { onHome: () => void }
const statuses: Appointment['status'][] = ['REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']

export function AdminDashboard({ onHome }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [live, setLive] = useState(false)

  const loadAppointments = async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error: fetchError } = await supabase.from('appointments').select('*').order('appointment_date', { ascending: true }).order('appointment_time', { ascending: true })
    setLoading(false)
    if (fetchError) { setError('예약 목록을 불러오지 못했습니다. 관리자 권한과 RLS 설정을 확인해주세요.'); return }
    setAppointments((data ?? []) as Appointment[])
  }

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(Boolean(data.session)))
    const authSubscription = supabase.auth.onAuthStateChange((_event, currentSession) => setSession(Boolean(currentSession)))
    return () => authSubscription.data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session) return
    const client = supabase
    void loadAppointments()
    const channel = client.channel('admin-appointments-live').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
      setAppointments((current) => {
        if (payload.eventType === 'INSERT') return [...current, payload.new as Appointment].sort((a, b) => `${a.appointment_date}${a.appointment_time}`.localeCompare(`${b.appointment_date}${b.appointment_time}`))
        if (payload.eventType === 'UPDATE') return current.map((item) => item.id === (payload.new as Appointment).id ? payload.new as Appointment : item)
        return current.filter((item) => item.id !== (payload.old as Appointment).id)
      })
      setLive(true)
    }).subscribe()
    return () => { void client.removeChannel(channel) }
  }, [session])

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) { setError('Supabase 환경변수가 설정되지 않았습니다.'); return }
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError('로그인에 실패했습니다. 관리자 이메일과 비밀번호를 확인해주세요.')
  }

  const updateStatus = async (id: string, status: Appointment['status']) => {
    if (!supabase) return
    const { error: updateError } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (updateError) setError('예약 상태를 변경하지 못했습니다. 관리자 RLS 정책을 확인해주세요.')
  }

  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setAppointments([]) }
  const total = appointments.length
  const requested = appointments.filter((item) => item.status === 'REQUESTED').length

  if (!session) return <section className="admin-page"><div className="admin-login"><span className="section-number">KAIA ADMIN</span><h1>예약 관리</h1><p>관리자 계정으로 로그인하면 실시간 예약 현황을 확인할 수 있습니다.</p><form onSubmit={signIn}><label className="input-label">이메일<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@kaiaclinic.com" /></label><label className="input-label">비밀번호<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="booking-error" role="alert">{error}</p>}<button className="primary-button submit-button" type="submit">관리자 로그인 <span>↗</span></button></form><button className="back-button" onClick={onHome}>홈으로 돌아가기</button></div></section>

  return <section className="admin-page"><div className="admin-header"><div><span className="section-number">KAIA ADMIN / LIVE</span><h1>예약 대시보드</h1><p>새 예약이 등록되면 이 화면에 자동으로 반영됩니다.</p></div><div className="admin-actions"><span className={`live-indicator ${live ? 'active' : ''}`}><i></i>{live ? '실시간 연결됨' : '연결 중'}</span><button className="back-button" onClick={signOut}>로그아웃</button></div></div><div className="admin-stats"><div><span>전체 예약</span><strong>{total}</strong></div><div><span>확인 대기</span><strong>{requested}</strong></div><div><span>내원 후 결제</span><strong>{appointments.filter((item) => item.payment_status === 'PAY_ON_VISIT').length}</strong></div></div>{error && <p className="booking-error" role="alert">{error}</p>}<div className="admin-table-wrap">{loading ? <p className="admin-empty">예약을 불러오는 중입니다.</p> : appointments.length === 0 ? <p className="admin-empty">아직 접수된 예약이 없습니다.</p> : <table className="admin-table"><thead><tr><th>방문 일정</th><th>예약자</th><th>시술</th><th>옵션</th><th>상태</th></tr></thead><tbody>{appointments.map((item) => <tr key={item.id}><td><strong>{item.appointment_date}</strong><small>{item.appointment_time}</small></td><td><strong>{item.name}</strong><small>{item.phone}<br />{item.email}</small></td><td>{item.service_names.map((service) => service.name).filter(Boolean).join(', ') || '-'}</td><td><small>원장 상담: {item.doctor_consultation === 'yes' ? '희망' : '비희망'}<br />수면 마취: {item.sedation === 'yes' ? '희망' : '비희망'}</small></td><td><select value={item.status} onChange={(event) => void updateStatus(item.id, event.target.value as Appointment['status'])}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></td></tr>)}</tbody></table>}</div></section>
}
