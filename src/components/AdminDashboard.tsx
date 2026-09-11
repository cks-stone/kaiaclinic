import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { serviceImageUrl, blogAssetUrl, doctorImageUrl } from '../lib/serviceImage'

type Appointment = { id: string; service_names: Array<{ name?: string; duration?: number; price?: number }>; appointment_date: string; appointment_time: string; doctor_consultation: 'yes' | 'no'; sedation: 'yes' | 'no'; name: string; email: string | null; phone: string | null; country_code?: string; sns_platform?: string | null; sns_account?: string | null; note: string | null; locale: string; estimated_total: number; payment_status: string; status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'; created_at: string }
type ManagerService = { id: number; category: string; name: Record<string, string>; description: Record<string, string>; price: number; duration: number; tag: string | null; sort: number; image?: string | null }
type AdminPost = { id: string; title: string | null; tag: string | null; image: string | null; content_path: string | null; title_i18n: Record<string, string> | null; tag_i18n: Record<string, string> | null; content_paths: Record<string, string> | null; created_at: string }
type Doctor = { id: string; name: Record<string, string>; position: Record<string, string>; image: string | null; sort: number; created_at: string }
type LangId = 'ko' | 'zh-TW' | 'en' | 'ja'
const adminLangs: { id: LangId; label: string }[] = [{ id: 'ko', label: '한국어' }, { id: 'zh-TW', label: '中文(繁體)' }, { id: 'en', label: 'English' }, { id: 'ja', label: '日本語' }]
const emptyNames = (): Record<LangId, string> => ({ ko: '', 'zh-TW': '', en: '', ja: '' })
type Props = { onHome: () => void; onServicesChanged?: () => void }
const statuses: Appointment['status'][] = ['REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']
const statusLabels: Record<Appointment['status'], string> = { REQUESTED: '예약요청', CONFIRMED: '예약확인완료', CANCELLED: '예약취소', COMPLETED: '진료완료' }
const optionLabels = { all: '전체', yes: '희망', no: '비희망' }
const categoryLabels: Record<string, string> = { signature: '시그니처', lifting: '탄력 · 리프팅', skin: '피부 · 안티에이징', body: '바디 · 제모' }
const formatDate = (value: string) => { const d = new Date(value); return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}` }
const formatDateTime = (value: string) => { const d = new Date(new Date(value).getTime() + 9 * 60 * 60 * 1000); return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` }
const kstDate = (value: string) => { const d = new Date(new Date(value).getTime() + 9 * 60 * 60 * 1000); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}` }

export function AdminDashboard({ onHome, onServicesChanged }: Props) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [session, setSession] = useState(false); const [appointments, setAppointments] = useState<Appointment[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [resendMessage, setResendMessage] = useState(''); const [live, setLive] = useState(false)
  const [search, setSearch] = useState(''); const [dateStart, setDateStart] = useState(''); const [dateEnd, setDateEnd] = useState(''); const [reqStart, setReqStart] = useState(''); const [reqEnd, setReqEnd] = useState(''); const [doctorFilter, setDoctorFilter] = useState('all'); const [sedationFilter, setSedationFilter] = useState('all'); const [statusFilter, setStatusFilter] = useState<'ALL' | Appointment['status']>('ALL'); const [page, setPage] = useState(1)
  const [tab, setTab] = useState<'appointments' | 'services' | 'blogs' | 'doctors'>('appointments')
  const [managerServices, setManagerServices] = useState<ManagerService[]>([]); const [servicesLoading, setServicesLoading] = useState(false); const [svcMessage, setSvcMessage] = useState(''); const [svcCategory, setSvcCategory] = useState('signature'); const [svcName, setSvcName] = useState<Record<LangId, string>>(emptyNames); const [svcDesc, setSvcDesc] = useState<Record<LangId, string>>(emptyNames); const [svcPrice, setSvcPrice] = useState(''); const [svcDuration, setSvcDuration] = useState('30'); const [svcTag, setSvcTag] = useState(''); const [svcPhoto, setSvcPhoto] = useState<File | null>(null); const [editingService, setEditingService] = useState<ManagerService | null>(null)
  const [adminPosts, setAdminPosts] = useState<AdminPost[]>([]); const [blogTitle, setBlogTitle] = useState<Record<LangId, string>>(emptyNames); const [blogTag, setBlogTag] = useState<Record<LangId, string>>(emptyNames); const [blogImage, setBlogImage] = useState<File | null>(null); const [blogContent, setBlogContent] = useState<Record<LangId, File | null>>({ ko: null, 'zh-TW': null, en: null, ja: null }); const [blogMessage, setBlogMessage] = useState(''); const [editingPost, setEditingPost] = useState<AdminPost | null>(null)
const [doctors, setDoctors] = useState<Doctor[]>([]); const [doctorLoading, setDoctorLoading] = useState(false); const [doctorMessage, setDoctorMessage] = useState(''); const [doctorName, setDoctorName] = useState<Record<LangId, string>>(emptyNames); const [doctorPosition, setDoctorPosition] = useState<Record<LangId, string>>(emptyNames); const [doctorPhoto, setDoctorPhoto] = useState<File | null>(null)

  const loadAppointments = async () => {
    if (!supabase) return
    setLoading(true)
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) { setLoading(false); setError('로그인 세션을 확인하지 못했습니다. 다시 로그인해주세요.'); return }
    const { data: admin, error: adminError } = await supabase.from('admin_users').select('user_id').eq('user_id', userData.user.id).maybeSingle()
    if (adminError) { setLoading(false); setError(`admin_users 권한을 확인하지 못했습니다: ${adminError.message}`); return }
    if (!admin) { setLoading(false); setError(`현재 로그인한 Auth 사용자(${userData.user.id})가 admin_users에 등록되지 않았습니다.`); return }
    const { data, error: fetchError } = await supabase.from('appointments').select('*').order('appointment_date', { ascending: true }).order('appointment_time', { ascending: true })
    setLoading(false)
    if (fetchError) { if (fetchError.code === '42501') setError('관리자 계정은 확인됐지만 appointments 조회 권한이 없습니다.'); else if (fetchError.code === '42P01') setError('appointments 테이블이 없습니다.'); else setError(`예약 목록을 불러오지 못했습니다: ${fetchError.message}`); return }
    setAppointments((data ?? []) as Appointment[])
  }

  const loadServices = async () => {
    if (!supabase) return
    setServicesLoading(true)
    const { data, error: fetchError } = await supabase.from('services').select('*').order('sort', { ascending: true }).order('id', { ascending: true })
    setServicesLoading(false)
    if (fetchError) { setSvcMessage(fetchError.code === '42P01' ? 'services 테이블이 없습니다. 스키마를 먼저 적용해주세요.' : `시술 목록을 불러오지 못했습니다: ${fetchError.message}`); return }
    setManagerServices((data ?? []) as ManagerService[])
  }

  const loadPosts = async () => {
    if (!supabase) return
    const { data, error: fetchError } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (fetchError) { setBlogMessage(fetchError.code === '42P01' ? 'posts 테이블이 없습니다. 스키마를 먼저 적용해주세요.' : `블로그 목록을 불러오지 못했습니다: ${fetchError.message}`); return }
    setAdminPosts((data ?? []) as AdminPost[])
  }

  const loadDoctors = async () => {
    if (!supabase) return
    setDoctorLoading(true)
    const { data, error: fetchError } = await supabase.from('doctors').select('*').order('sort', { ascending: true }).order('created_at', { ascending: false })
    setDoctorLoading(false)
    if (fetchError) { setDoctorMessage(fetchError.code === '42P01' ? 'doctors 테이블이 없습니다. 스키마를 먼저 적용해주세요.' : `의료진 목록을 불러오지 못했습니다: ${fetchError.message}`); return }
    setDoctors((data ?? []) as Doctor[])
  }

  useEffect(() => { if (!supabase) return; supabase.auth.getSession().then(({ data }) => setSession(Boolean(data.session))); const authSubscription = supabase.auth.onAuthStateChange((_event, currentSession) => setSession(Boolean(currentSession))); return () => authSubscription.data.subscription.unsubscribe() }, [])
  useEffect(() => {
    if (!supabase || !session) return
    const client = supabase
    void loadAppointments()
    void loadServices()
    void loadPosts()
    void loadDoctors()
    const channel = client.channel(`admin-appointments-live-${Date.now()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
      setAppointments((current) => { if (payload.eventType === 'INSERT') { const next = payload.new as Appointment; return current.some((item) => item.id === next.id) ? current : [...current, next] } if (payload.eventType === 'UPDATE') { const next = payload.new as Appointment; return current.map((item) => item.id === next.id ? next : item) } return current.filter((item) => item.id !== (payload.old as Appointment).id) })
    }).subscribe((channelStatus) => { setLive(channelStatus === 'SUBSCRIBED'); if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') setError(`실시간 연결에 실패했습니다: ${channelStatus}`) })
    return () => { setLive(false); void client.removeChannel(channel) }
  }, [session])

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return appointments.filter((item) => {
      const serviceText = item.service_names.map((service) => service.name || '').join(' ').toLowerCase()
      const contactText = `${item.name} ${item.phone || ''} ${item.email || ''} ${item.sns_account || ''}`.toLowerCase()
      const requestText = `${formatDate(item.created_at)} ${formatDateTime(item.created_at)} ${item.created_at || ''}`.toLowerCase()
      const optionText = `${item.doctor_consultation === 'yes' ? '원장 상담 희망 원장상담 희망' : '원장 상담 비희망 원장상담 비희망'} ${item.sedation === 'yes' ? '수면 마취 희망 수면마취 희망' : '수면 마취 비희망 수면마취 비희망'}`.toLowerCase()
      const matchesSearch = !normalizedSearch || `${contactText} ${requestText} ${optionText} ${serviceText}`.includes(normalizedSearch)
      const matchesDate = (!dateStart || item.appointment_date >= dateStart) && (!dateEnd || item.appointment_date <= dateEnd)
      const matchesReqDate = (!reqStart || kstDate(item.created_at) >= reqStart) && (!reqEnd || kstDate(item.created_at) <= reqEnd)
      const matchesDoctor = doctorFilter === 'all' || (doctorFilter === 'yes' ? item.doctor_consultation === 'yes' : item.doctor_consultation !== 'yes')
      const matchesSedation = sedationFilter === 'all' || (sedationFilter === 'yes' ? item.sedation === 'yes' : item.sedation !== 'yes')
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
      return matchesSearch && matchesDate && matchesReqDate && matchesDoctor && matchesSedation && matchesStatus
    })
  }, [appointments, dateStart, dateEnd, reqStart, reqEnd, doctorFilter, sedationFilter, search, statusFilter])

  const PAGE_SIZE = 20
  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageAppointments = filteredAppointments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const pageItems = (() => { const items: Array<number | '…'> = []; if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) items.push(i); return items } items.push(1); if (safePage > 3) items.push('…'); for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) items.push(i); if (safePage < totalPages - 2) items.push('…'); items.push(totalPages); return items })()

  const signIn = async (event: FormEvent) => { event.preventDefault(); if (!supabase) { setError('Supabase 환경변수가 설정되지 않았습니다.'); return }; setError(''); setResendMessage(''); const { error: signInError } = await supabase.auth.signInWithPassword({ email, password }); if (signInError) { const message = signInError.message.toLowerCase(); setError(message.includes('email not confirmed') ? '이메일 인증이 완료되지 않았습니다.' : message.includes('invalid login credentials') ? '이메일 또는 비밀번호가 올바르지 않습니다.' : `로그인에 실패했습니다: ${signInError.message}`) } }
  const resendConfirmation = async () => { if (!supabase || !email) { setError('인증 메일을 받을 이메일을 먼저 입력해주세요.'); return }; const { error: resendError } = await supabase.auth.resend({ type: 'signup', email }); if (resendError) setError(`인증 메일을 다시 보내지 못했습니다: ${resendError.message}`); else setResendMessage('인증 메일을 다시 보냈습니다.') }
  const updateStatus = async (id: string, status: Appointment['status']) => { if (!supabase) return; const { error: updateError } = await supabase.from('appointments').update({ status }).eq('id', id); if (updateError) setError('예약 상태를 변경하지 못했습니다.') }
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setAppointments([]) }
  const resetFilters = () => { setSearch(''); setDateStart(''); setDateEnd(''); setReqStart(''); setReqEnd(''); setDoctorFilter('all'); setSedationFilter('all'); setStatusFilter('ALL'); setPage(1) }
  const requested = appointments.filter((item) => item.status === 'REQUESTED').length

  const uploadServiceImage = async (file: File): Promise<string | null> => {
    if (!supabase) return null
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `service-${Date.now()}-${Math.round(Math.random() * 1000)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('service-images').upload(path, file, { upsert: false })
    if (uploadError) { setSvcMessage(`사진 업로드에 실패했습니다: ${uploadError.message}`); return null }
    return path
  }
  const deleteServiceImage = async (path: string) => { if (!supabase || !path) return; const { error } = await supabase.storage.from('service-images').remove([path]); if (error) setSvcMessage(`사진 삭제에 실패했습니다: ${error.message}`) }

  const uploadDoctorImage = async (file: File): Promise<string | null> => {
    if (!supabase) return null
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `doctor-${Date.now()}-${Math.round(Math.random() * 1000)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('service-images').upload(path, file, { upsert: false })
    if (uploadError) { setDoctorMessage(`사진 업로드에 실패했습니다: ${uploadError.message}`); return null }
    return path
  }
  const deleteDoctorImage = async (path: string) => { if (!supabase || !path) return; const { error } = await supabase.storage.from('service-images').remove([path]); if (error) setDoctorMessage(`사진 삭제에 실패했습니다: ${error.message}`) }
  const addDoctor = async () => {
    if (!supabase) return
    if (!doctorName.ko.trim()) { setDoctorMessage('한국어 의료진 이름을 입력해주세요.'); return }
    const name: Record<LangId, string> = { ko: doctorName.ko.trim(), 'zh-TW': doctorName['zh-TW'].trim(), en: doctorName.en.trim(), ja: doctorName.ja.trim() }
    const position: Record<LangId, string> = { ko: doctorPosition.ko.trim() || `${doctorName.ko.trim()} 원장`, 'zh-TW': doctorPosition['zh-TW'].trim() || doctorName['zh-TW'].trim(), en: doctorPosition.en.trim() || doctorName.en.trim(), ja: doctorPosition.ja.trim() || doctorName.ja.trim() }
    const image = doctorPhoto ? await uploadDoctorImage(doctorPhoto) : null
    const { error: insertError } = await supabase.from('doctors').insert({ name, position, image, sort: doctors.length + 1 })
    if (insertError) { setDoctorMessage(`의료진을 추가하지 못했습니다: ${insertError.message}`); return }
    setDoctorName(emptyNames); setDoctorPosition(emptyNames); setDoctorPhoto(null); setDoctorMessage('의료진이 추가되었습니다.')
    void loadDoctors()
    if (onServicesChanged) onServicesChanged()
  }
  const removeDoctor = async (doctor: Doctor) => {
    if (!supabase) return
    const { error: deleteError } = await supabase.from('doctors').delete().eq('id', doctor.id)
    if (deleteError) { setDoctorMessage(`의료진을 삭제하지 못했습니다: ${deleteError.message}`); return }
    if (doctor.image) await deleteDoctorImage(doctor.image)
    setDoctorMessage('의료진이 삭제되었습니다.')
    void loadDoctors()
    if (onServicesChanged) onServicesChanged()
  }

  const addService = async () => {
    if (!supabase) return
    const price = Number(svcPrice); const duration = Number(svcDuration)
    if (!svcName.ko.trim() || !price || !duration) { setSvcMessage('한국어 시술명, 가격, 소요시간을 모두 입력해주세요.'); return }
    const names: Record<LangId, string> = { ko: svcName.ko.trim(), 'zh-TW': svcName['zh-TW'].trim(), en: svcName.en.trim(), ja: svcName.ja.trim() }
    const description: Record<LangId, string> = { ko: svcDesc.ko.trim() || names.ko, 'zh-TW': svcDesc['zh-TW'].trim() || names['zh-TW'], en: svcDesc.en.trim() || names.en, ja: svcDesc.ja.trim() || names.ja }
    const image = svcPhoto ? await uploadServiceImage(svcPhoto) : null
    const nextId = managerServices.length ? Math.max(...managerServices.map((item) => item.id)) + 1 : 1
    const { error: insertError } = await supabase.from('services').insert({ id: nextId, category: svcCategory, name: names, description, price, duration, tag: svcTag.trim() || null, sort: managerServices.length + 1, image })
    if (insertError) { setSvcMessage(`시술을 추가하지 못했습니다: ${insertError.message}`); return }
    setSvcName(emptyNames); setSvcDesc(emptyNames); setSvcPrice(''); setSvcTag(''); setSvcPhoto(null); setSvcMessage('시술이 추가되었습니다.')
    void loadServices()
    if (onServicesChanged) onServicesChanged()
  }
  const removeService = async (id: number) => {
    if (!supabase) return
    const target = managerServices.find((item) => item.id === id)
    const { error: deleteError } = await supabase.from('services').delete().eq('id', id)
    if (deleteError) { setSvcMessage(`시술을 삭제하지 못했습니다: ${deleteError.message}`); return }
    if (target?.image) await deleteServiceImage(target.image)
    setSvcMessage('시술이 삭제되었습니다.')
    void loadServices()
    if (onServicesChanged) onServicesChanged()
  }
  const updateServicePhoto = async (id: number, file: File) => {
    if (!supabase) return
    const target = managerServices.find((item) => item.id === id)
    const path = await uploadServiceImage(file)
    if (!path) return
    const { error: updateError } = await supabase.from('services').update({ image: path }).eq('id', id)
    if (updateError) { setSvcMessage(`사진을 저장하지 못했습니다: ${updateError.message}`); return }
    if (target?.image) await deleteServiceImage(target.image)
    setSvcMessage('사진이 변경되었습니다.')
    void loadServices()
    if (onServicesChanged) onServicesChanged()
  }
  const startEditService = (service: ManagerService) => { setEditingService(service); setSvcCategory(service.category); setSvcName({ ko: service.name.ko || '', 'zh-TW': service.name['zh-TW'] || '', en: service.name.en || '', ja: service.name.ja || '' }); setSvcDesc({ ko: service.description.ko || '', 'zh-TW': service.description['zh-TW'] || '', en: service.description.en || '', ja: service.description.ja || '' }); setSvcPrice(String(service.price)); setSvcDuration(String(service.duration)); setSvcTag(service.tag || ''); setSvcPhoto(null); setSvcMessage('') }
  const cancelEditService = () => { setEditingService(null); setSvcCategory('signature'); setSvcName(emptyNames); setSvcDesc(emptyNames); setSvcPrice(''); setSvcDuration('30'); setSvcTag(''); setSvcPhoto(null); setSvcMessage('') }
  const updateService = async () => {
    if (!supabase || !editingService) return
    const price = Number(svcPrice); const duration = Number(svcDuration)
    if (!svcName.ko.trim() || !price || !duration) { setSvcMessage('한국어 시술명, 가격, 소요시간을 모두 입력해주세요.'); return }
    const names: Record<LangId, string> = { ko: svcName.ko.trim(), 'zh-TW': svcName['zh-TW'].trim(), en: svcName.en.trim(), ja: svcName.ja.trim() }
    const description: Record<LangId, string> = { ko: svcDesc.ko.trim() || names.ko, 'zh-TW': svcDesc['zh-TW'].trim() || names['zh-TW'], en: svcDesc.en.trim() || names.en, ja: svcDesc.ja.trim() || names.ja }
    const update: Record<string, unknown> = { category: svcCategory, name: names, description, price, duration, tag: svcTag.trim() || null }
    if (svcPhoto) { const image = await uploadServiceImage(svcPhoto); if (!image) return; update.image = image }
    const { error: updateError } = await supabase.from('services').update(update).eq('id', editingService.id)
    if (updateError) { setSvcMessage(`시술을 수정하지 못했습니다: ${updateError.message}`); return }
    if (update.image && editingService.image) await deleteServiceImage(editingService.image)
    setSvcMessage('시술이 수정되었습니다.')
    setEditingService(null); setSvcCategory('signature'); setSvcName(emptyNames); setSvcDesc(emptyNames); setSvcPrice(''); setSvcDuration('30'); setSvcTag(''); setSvcPhoto(null)
    void loadServices()
    if (onServicesChanged) onServicesChanged()
  }

  const uploadBlogAsset = async (file: File): Promise<string | null> => {
    if (!supabase) return null
    const ext = (file.name.split('.').pop() || 'md').toLowerCase()
    const path = `blog-${Date.now()}-${Math.round(Math.random() * 1000)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('blog-assets').upload(path, file, { upsert: false })
    if (uploadError) { setBlogMessage(`업로드에 실패했습니다: ${uploadError.message}`); return null }
    return path
  }
  const addPost = async () => {
    if (!supabase) return
    const hasTitle = adminLangs.some((lang) => blogTitle[lang.id].trim())
    const contentLangs = adminLangs.filter((lang) => blogContent[lang.id])
    if (!hasTitle) { setBlogMessage('제목을 하나 이상의 언어로 입력해주세요.'); return }
    if (contentLangs.length === 0) { setBlogMessage('내용(md 파일)을 하나 이상의 언어로 선택해주세요.'); return }
    const title_i18n = Object.fromEntries(adminLangs.map((lang) => [lang.id, blogTitle[lang.id].trim()]))
    const tag_i18n = Object.fromEntries(adminLangs.map((lang) => [lang.id, blogTag[lang.id].trim()]))
    const content_paths: Record<string, string> = {}
    for (const lang of contentLangs) { const path = await uploadBlogAsset(blogContent[lang.id]!); if (!path) return; content_paths[lang.id] = path }
    const image = blogImage ? await uploadBlogAsset(blogImage) : null
    const { error: insertError } = await supabase.from('posts').insert({ title: title_i18n.ko, tag: tag_i18n.ko || null, image, content_path: content_paths.ko ?? null, title_i18n, tag_i18n, content_paths })
    if (insertError) { setBlogMessage(`블로그를 등록하지 못했습니다: ${insertError.message}`); return }
    setBlogTitle(emptyNames); setBlogTag(emptyNames); setBlogImage(null); setBlogContent({ ko: null, 'zh-TW': null, en: null, ja: null }); setBlogMessage('블로그가 등록되었습니다.')
    void loadPosts()
    if (onServicesChanged) onServicesChanged()
  }
  const deletePost = async (post: AdminPost) => {
    if (!supabase) return
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id)
    if (deleteError) { setBlogMessage(`블로그를 삭제하지 못했습니다: ${deleteError.message}`); return }
    if (post.image) await supabase.storage.from('blog-assets').remove([post.image])
    if (post.content_path) await supabase.storage.from('blog-assets').remove([post.content_path])
    const extraPaths = post.content_paths ? Object.values(post.content_paths) : []
    if (extraPaths.length) await supabase.storage.from('blog-assets').remove(extraPaths)
    setBlogMessage('블로그가 삭제되었습니다.')
    void loadPosts()
    if (onServicesChanged) onServicesChanged()
  }
  const startEditPost = (post: AdminPost) => { setEditingPost(post); setBlogTitle({ ko: post.title_i18n?.ko || post.title || '', 'zh-TW': post.title_i18n?.['zh-TW'] || '', en: post.title_i18n?.en || '', ja: post.title_i18n?.ja || '' }); setBlogTag({ ko: post.tag_i18n?.ko || post.tag || '', 'zh-TW': post.tag_i18n?.['zh-TW'] || '', en: post.tag_i18n?.en || '', ja: post.tag_i18n?.ja || '' }); setBlogImage(null); setBlogContent({ ko: null, 'zh-TW': null, en: null, ja: null }); setBlogMessage('') }
  const cancelEditPost = () => { setEditingPost(null); setBlogTitle(emptyNames); setBlogTag(emptyNames); setBlogImage(null); setBlogContent({ ko: null, 'zh-TW': null, en: null, ja: null }); setBlogMessage('') }
  const updatePost = async () => {
    if (!supabase || !editingPost) return
    const hasTitle = adminLangs.some((lang) => blogTitle[lang.id].trim())
    if (!hasTitle) { setBlogMessage('제목을 하나 이상의 언어로 입력해주세요.'); return }
    const title_i18n = Object.fromEntries(adminLangs.map((lang) => [lang.id, blogTitle[lang.id].trim()]))
    const tag_i18n = Object.fromEntries(adminLangs.map((lang) => [lang.id, blogTag[lang.id].trim()]))
    const update: Record<string, unknown> = { title: title_i18n.ko, tag: tag_i18n.ko || null, title_i18n, tag_i18n }
    const newPaths: Record<string, string> = {}
    const stalePaths: string[] = []
    for (const lang of adminLangs) { if (blogContent[lang.id]) { const path = await uploadBlogAsset(blogContent[lang.id]!); if (!path) return; newPaths[lang.id] = path; const old = editingPost.content_paths?.[lang.id]; if (old) stalePaths.push(old) } }
    if (newPaths.ko && editingPost.content_path && !editingPost.content_paths) stalePaths.push(editingPost.content_path)
    update.content_paths = { ...(editingPost.content_paths ?? {}), ...newPaths }
    if (blogImage) { const image = await uploadBlogAsset(blogImage); if (!image) return; update.image = image }
    const { error: updateError } = await supabase.from('posts').update(update).eq('id', editingPost.id)
    if (updateError) { setBlogMessage(`블로그를 수정하지 못했습니다: ${updateError.message}`); return }
    const stale = stalePaths.filter(Boolean)
    if (stale.length) await supabase.storage.from('blog-assets').remove(stale)
    if (update.image && editingPost.image) await supabase.storage.from('blog-assets').remove([editingPost.image])
    setBlogMessage('블로그가 수정되었습니다.')
    setEditingPost(null); setBlogTitle(emptyNames); setBlogTag(emptyNames); setBlogImage(null); setBlogContent({ ko: null, 'zh-TW': null, en: null, ja: null })
    void loadPosts()
    if (onServicesChanged) onServicesChanged()
  }

  if (!session) return <section className="admin-page"><div className="admin-login"><span className="section-number">KAIA ADMIN</span><h1>예약 관리</h1><p>관리자 계정으로 로그인하면 실시간 예약 현황과 시술을 관리할 수 있습니다.</p><form onSubmit={signIn}><label className="input-label">이메일<input type="email" required value={email} onChange={(event) => { setEmail(event.target.value); setResendMessage('') }} placeholder="admin@kaiaclinic.com" /></label><label className="input-label">비밀번호<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="booking-error" role="alert">{error}</p>}{resendMessage && <p className="admin-success">{resendMessage}</p>}<button className="primary-button submit-button" type="submit">관리자 로그인 </button></form><button className="back-button" onClick={resendConfirmation}>인증 메일 다시 보내기</button><button className="back-button" onClick={onHome}>홈으로 돌아가기</button></div></section>

  return <section className="admin-page"><div className="admin-header"><div><span className="section-number">KAIA ADMIN / LIVE</span><h1>예약 대시보드</h1><p>새 예약은 목록 하단에 자동으로 추가됩니다.</p></div><div className="admin-actions"><span className={`live-indicator ${live ? 'active' : ''}`}><i></i>{live ? '실시간 연결됨' : '연결 중'}</span><button className="back-button" onClick={signOut}>로그아웃</button></div></div><div className="admin-tabs"><button className={tab === 'appointments' ? 'active' : ''} onClick={() => setTab('appointments')}>예약 관리</button><button className={tab === 'services' ? 'active' : ''} onClick={() => { setTab('services'); void loadServices() }}>시술 관리</button><button className={tab === 'blogs' ? 'active' : ''} onClick={() => { setTab('blogs'); void loadPosts() }}>블로그 관리</button><button className={tab === 'doctors' ? 'active' : ''} onClick={() => { setTab('doctors'); void loadDoctors() }}>의료진 소개</button></div>{error && <p className="booking-error" role="alert">{error}</p>}{tab === 'appointments' ? <><div className="admin-stats"><div><span>전체 예약</span><strong>{appointments.length}</strong></div><div><span>예약요청</span><strong>{requested}</strong></div><div><span>검색 결과</span><strong>{filteredAppointments.length}</strong></div></div><div className="admin-filters"><label className="filter-search">검색<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="예약자, 연락처, 이메일, 시술 검색" /></label><label>시작 날짜<input type="date" value={dateStart} onChange={(event) => { setDateStart(event.target.value); setPage(1) }} /></label><label>종료 날짜<input type="date" value={dateEnd} onChange={(event) => { setDateEnd(event.target.value); setPage(1) }} /></label><label>요청 시작<input type="date" value={reqStart} onChange={(event) => { setReqStart(event.target.value); setPage(1) }} /></label><label>요청 종료<input type="date" value={reqEnd} onChange={(event) => { setReqEnd(event.target.value); setPage(1) }} /></label><label>원장 상담<select value={doctorFilter} onChange={(event) => { setDoctorFilter(event.target.value); setPage(1) }}><option value="all">{optionLabels.all}</option><option value="yes">{optionLabels.yes}</option><option value="no">{optionLabels.no}</option></select></label><label>수면 마취<select value={sedationFilter} onChange={(event) => { setSedationFilter(event.target.value); setPage(1) }}><option value="all">{optionLabels.all}</option><option value="yes">{optionLabels.yes}</option><option value="no">{optionLabels.no}</option></select></label><label>상태<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'ALL' | Appointment['status']); setPage(1) }}><option value="ALL">전체 상태</option>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label><button className="filter-reset" onClick={resetFilters}>초기화</button></div><div className="admin-table-wrap">{loading ? <p className="admin-empty">예약을 불러오는 중입니다.</p> : filteredAppointments.length === 0 ? <p className="admin-empty">조건에 맞는 예약이 없습니다.</p> : <table className="admin-table"><thead><tr><th>날짜</th><th>시간</th><th>예약자</th><th>전화번호</th><th>SNS</th><th>이메일</th><th>시술</th><th>원장 상담</th><th>수면 마취</th><th>상태</th><th>예약요청</th></tr></thead><tbody>{pageAppointments.map((item) => <tr key={item.id}><td><strong>{item.appointment_date}</strong></td><td><strong>{item.appointment_time}</strong></td><td><strong>{item.name || '-'}</strong></td><td>{item.phone ? `${item.country_code || ''} ${item.phone}` : '-'}</td><td>{item.sns_platform || item.sns_account ? `${item.sns_platform || ''}${item.sns_account ? ` · ${item.sns_account}` : ''}` : '-'}</td><td>{item.email || '-'}</td><td>{item.service_names.map((service) => service.name).filter(Boolean).join(', ') || '-'}</td><td>{item.doctor_consultation === 'yes' ? '희망' : '비희망'}</td><td>{item.sedation === 'yes' ? '희망' : '비희망'}</td><td><select value={item.status} onChange={(event) => void updateStatus(item.id, event.target.value as Appointment['status'])}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></td><td>{formatDateTime(item.created_at)}</td></tr>)}</tbody></table>}{filteredAppointments.length > 0 && <div className="admin-pagination"><span className="page-info">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredAppointments.length)} / {filteredAppointments.length}</span><button className="page-nav" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</button>{pageItems.map((item, index) => item === '…' ? <span className="page-dots" key={index}>…</span> : <button className={safePage === item ? 'page-num active' : 'page-num'} key={index} onClick={() => setPage(item as number)}>{item}</button>)}<button className="page-nav" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>›</button></div>}</div></> : tab === 'services' ? <><div className="admin-services-form"><h3>{editingService ? '시술 수정' : '시술 추가'}</h3><p className="field-help">{editingService ? '4개 언어의 시술명과 설명을 각각 수정할 수 있습니다. 방문객이 언어를 선택하면 그 언어로 표시됩니다.' : '시술명과 설명을 4개 언어로 각각 입력하면 추가 즉시 홈페이지와 예약 페이지에 표시됩니다.'}</p><div className="input-grid">{adminLangs.map((lang) => <label className="input-label" key={lang.id}>시술명 · {lang.label}<input value={svcName[lang.id]} onChange={(event) => setSvcName((prev) => ({ ...prev, [lang.id]: event.target.value }))} placeholder="시술명" /></label>)}{adminLangs.map((lang) => <label className="input-label" key={`svc-desc-${lang.id}`}>한 줄 설명 · {lang.label}<input value={svcDesc[lang.id]} onChange={(event) => setSvcDesc((prev) => ({ ...prev, [lang.id]: event.target.value }))} placeholder="시술 설명 (선택)" /></label>)}<label className="input-label">가격 (원)<input type="number" min="0" value={svcPrice} onChange={(event) => setSvcPrice(event.target.value)} placeholder="예: 150000" /></label><label className="input-label">소요시간 (분)<input type="number" min="1" value={svcDuration} onChange={(event) => setSvcDuration(event.target.value)} /></label><label className="input-label">카테고리<select value={svcCategory} onChange={(event) => setSvcCategory(event.target.value)}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="input-label">태그 (선택)<input value={svcTag} onChange={(event) => setSvcTag(event.target.value)} placeholder="예: BEST, NEW" /></label><label className="input-label">시술 사진 · 권장 900×1000px (9:10, 잘림 없음)<input type="file" accept="image/*" onChange={(event) => setSvcPhoto(event.target.files?.[0] ?? null)} /></label></div>{(svcPhoto || (editingService && editingService.image)) && <div className="service-photo-preview"><img alt="시술 사진 미리보기" src={svcPhoto ? URL.createObjectURL(svcPhoto) : serviceImageUrl(editingService!.image)} /></div>}<div className="admin-form-actions"><button className="primary-button" onClick={() => void (editingService ? updateService() : addService())}>{editingService ? '수정 저장' : '시술 추가'}<span>+</span></button>{editingService && <button className="button-secondary" onClick={cancelEditService}>수정 취소</button>}</div>{svcMessage && <p className={svcMessage.includes('못했습니다') ? 'booking-error' : 'admin-success'}>{svcMessage}</p>}</div><div className="admin-table-wrap">{servicesLoading ? <p className="admin-empty">시술을 불러오는 중입니다.</p> : managerServices.length === 0 ? <p className="admin-empty">등록된 시술이 없습니다.</p> : <table className="admin-table admin-services-table"><thead><tr><th>ID</th><th>카테고리</th><th>시술명</th><th>설명</th><th>가격</th><th>소요시간</th><th>태그</th><th>사진</th><th>관리</th></tr></thead><tbody>{managerServices.map((service) => <tr key={service.id}><td>{service.id}</td><td>{categoryLabels[service.category] ?? service.category}</td><td><strong>{service.name.ko}</strong><small>{service.name.en}</small></td><td>{service.description.ko}</td><td>{Number(service.price).toLocaleString()}원</td><td>{service.duration}분</td><td>{service.tag || '-'}</td><td className="service-photo-cell">{service.image ? <img className="service-thumb" src={serviceImageUrl(service.image)} alt="" /> : <span className="service-thumb-empty">없음</span>}<label className="service-photo-upload" title="권장 900×1000px (9:10, 잘림 없음)">변경<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void updateServicePhoto(service.id, file) }} /></label></td><td><button className="service-edit" onClick={() => startEditService(service)}>수정</button><button className="service-remove" onClick={() => void removeService(service.id)}>삭제</button></td></tr>)}</tbody></table>}</div></> : tab === 'blogs' ? <><div className="admin-services-form"><h3>{editingPost ? '블로그 수정' : '블로그 추가'}</h3><p className="field-help">{editingPost ? '제목·태그·내용(md)을 4개 언어로 각각 수정할 수 있습니다. 바꿀 언어의 파일만 다시 선택하면 됩니다.' : '제목과 내용(md 파일)을 4개 언어로 각각 입력할 수 있습니다. 방문객이 언어를 선택하면 그 언어의 글이 표시됩니다.'}</p><div className="input-grid">{[...adminLangs.map((lang) => <label className="input-label" key={lang.id}>제목 · {lang.label}<input value={blogTitle[lang.id]} onChange={(event) => setBlogTitle((prev) => ({ ...prev, [lang.id]: event.target.value }))} placeholder="블로그 제목" /></label>), ...adminLangs.map((lang) => <label className="input-label" key={`blog-tag-${lang.id}`}>태그 · {lang.label} (선택)<input value={blogTag[lang.id]} onChange={(event) => setBlogTag((prev) => ({ ...prev, [lang.id]: event.target.value }))} placeholder="예: SKIN NOTE" /></label>)]}<label className="input-label">{editingPost ? '대표사진 (변경 시 선택) · 권장 1150×1000px' : '대표사진 · 권장 1150×1000px'}<input type="file" accept="image/*" onChange={(event) => setBlogImage(event.target.files?.[0] ?? null)} /></label>{adminLangs.map((lang) => <label className="input-label" key={`blog-md-${lang.id}`}>내용 md · {lang.label}{editingPost && editingPost.content_paths?.[lang.id] ? ` (${editingPost.content_paths[lang.id].split('/').pop()})` : ''}<input type="file" accept=".md,text/markdown,text/plain" onChange={(event) => setBlogContent((prev) => ({ ...prev, [lang.id]: event.target.files?.[0] ?? null }))} /></label>)}</div>{(blogImage || (editingPost && editingPost.image)) && <div className="service-photo-preview"><img alt="대표사진 미리보기" src={blogImage ? URL.createObjectURL(blogImage) : blogAssetUrl(editingPost!.image)} /></div>}<div className="admin-form-actions"><button className="primary-button" onClick={() => void (editingPost ? updatePost() : addPost())}>{editingPost ? '수정 저장' : '블로그 등록'} </button>{editingPost && <button className="button-secondary" onClick={cancelEditPost}>수정 취소</button>}</div>{blogMessage && <p className={blogMessage.includes('못했습니다') ? 'booking-error' : 'admin-success'}>{blogMessage}</p>}</div><div className="admin-table-wrap">{adminPosts.length === 0 ? <p className="admin-empty">등록된 블로그가 없습니다.</p> : <table className="admin-table admin-services-table"><thead><tr><th>대표사진</th><th>제목</th><th>태그</th><th>작성일</th><th>관리</th></tr></thead><tbody>{adminPosts.map((post) => <tr key={post.id}><td>{post.image ? <img className="service-thumb" alt="" src={blogAssetUrl(post.image)} /> : <span className="service-thumb-empty">없음</span>}</td><td><strong>{post.title_i18n?.ko || post.title}</strong><small>{post.content_paths ? adminLangs.filter((lang) => post.content_paths![lang.id]).map((lang) => lang.label).join(' / ') : (post.content_path || '')}</small></td><td>{post.tag || '-'}</td><td>{formatDate(post.created_at)}</td><td><button className="service-edit" onClick={() => startEditPost(post)}>수정</button><button className="service-remove" onClick={() => void deletePost(post)}>삭제</button></td></tr>)}</tbody></table>}</div></> : <><div className="admin-services-form"><h3>의료진 추가</h3><p className="field-help">의료진 이름과 직함을 4개 언어로 각각 입력할 수 있습니다. 추가하면 의료진 소개 페이지에 표시됩니다. 직함을 비워두면 한국어로는 이름 뒤에 '원장'이 자동으로 붙습니다.</p><div className="input-grid">{adminLangs.map((lang) => <label className="input-label" key={`doctor-name-${lang.id}`}>이름 · {lang.label}<input value={doctorName[lang.id]} onChange={(event) => setDoctorName((prev) => ({ ...prev, [lang.id]: event.target.value }))} placeholder={lang.id === 'ko' ? '예: 김카이아' : 'Doctor Name'} /></label>)}{adminLangs.map((lang) => <label className="input-label" key={`doctor-position-${lang.id}`}>직함 · {lang.label} (선택)<input value={doctorPosition[lang.id]} onChange={(event) => setDoctorPosition((prev) => ({ ...prev, [lang.id]: event.target.value }))} placeholder={lang.id === 'ko' ? '예: 피부과 전문의 · 대표원장' : 'Position'} /></label>)}<label className="input-label">사진 (선택)<input type="file" accept="image/*" onChange={(event) => setDoctorPhoto(event.target.files?.[0] ?? null)} /></label></div>{doctorPhoto && <div className="service-photo-preview"><img alt="의료진 사진 미리보기" src={URL.createObjectURL(doctorPhoto)} /></div>}<div className="admin-form-actions"><button className="primary-button add-doctor-button" onClick={() => void addDoctor()}>의료진 추가 </button></div>{doctorMessage && (doctorMessage.startsWith('의료진이') || doctorMessage.startsWith('사진')) && <p className="admin-success">{doctorMessage}</p>}{doctorMessage && doctorMessage.startsWith('doctors') && <p className="booking-error" role="alert">{doctorMessage}</p>}</div><div className="admin-table-wrap">{doctorLoading ? <p className="admin-empty">불러오는 중…</p> : doctors.length === 0 ? <p className="admin-empty">등록된 의료진이 없습니다.</p> : <table className="admin-table"><thead><tr><th>사진</th><th>이름 (ko)</th><th>직함 (ko)</th><th>작성일</th><th>관리</th></tr></thead><tbody>{doctors.map((doctor) => <tr key={doctor.id}><td>{doctor.image ? <img className="service-thumb" alt="" src={doctorImageUrl(doctor.image)} /> : <span className="service-thumb-empty">없음</span>}</td><td><strong>{doctor.name?.ko || doctor.name?.en || ''}</strong><small>{adminLangs.filter((lang) => doctor.name?.[lang.id]).map((lang) => lang.label).join(' / ')}</small></td><td>{doctor.position?.ko || doctor.position?.en || '-'}</td><td>{formatDate(doctor.created_at)}</td><td><button className="service-remove" onClick={() => { if (confirm('이 의료진을 삭제하시겠습니까?')) void removeDoctor(doctor) }}>삭제</button></td></tr>)}</tbody></table>}</div></>}</section>
}