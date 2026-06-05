import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import './App.css'

// ── Constants ──────────────────────────────────────────────
const USERS = [
  { id:'marie',    name:'Marie',    role:'Operations Director',           color:'#843C0C', initials:'MA', access:'director',    pin:'1001' },
  { id:'jordan',   name:'Jordan',   role:'Operations Manager',            color:'#1F4E79', initials:'JO', access:'manager',     pin:'1002' },
  { id:'banseh',   name:'Banseh',   role:'Senior Ops Coordinator',        color:'#0070C0', initials:'BA', access:'coordinator', pin:'1003' },
  { id:'lely',     name:'Lely',     role:'Operations Coordinator',        color:'#2E75B6', initials:'LE', access:'coordinator', pin:'1004' },
  { id:'jose',     name:'Jose',     role:'Night Shift Coordinator',       color:'#375623', initials:'JS', access:'coordinator', pin:'1005' },
  { id:'lea',      name:'Lea',      role:'Client Relations Manager',      color:'#C00000', initials:'LA', access:'relations',   pin:'1006' },
  { id:'haslinda', name:'Haslinda', role:'Procurement Officer',           color:'#7030A0', initials:'HA', access:'procurement', pin:'1007' },
  { id:'veronica', name:'Veronica', role:'Procurement & Admin Asst',      color:'#7030A0', initials:'VE', access:'procurement', pin:'1008' },
  { id:'ayu',      name:'Ayu',      role:'Accounts / Finance',            color:'#006064', initials:'AY', access:'finance',     pin:'1009' },
  { id:'aimy',     name:'Aimy',     role:'Accounts / Finance',            color:'#006064', initials:'AI', access:'finance',     pin:'1010' },
]

const STAGES = [
  'Acknowledgment Sent','Info Gathering','Class Verification','Quote Prep',
  'Quote Sent','Awaiting PO','Procurement Requested','Job Order Created',
  'Technician Mobilized','On the Way','Boarded','Job In Progress',
  'Job Completed','Docs Saved to Server','Invoice Requested','Invoice Sent','Closed'
]

const STATUS_CFG = {
  'In Progress': { bg:'#EBF3FB', tc:'#1F4E79' },
  'On Track':    { bg:'#E2EFDA', tc:'#375623' },
  'Delayed':     { bg:'#FCE4D6', tc:'#C55A11' },
  'On Hold':     { bg:'#FFF2CC', tc:'#7F5F00' },
  'Closed':      { bg:'#E2EFDA', tc:'#375623' },
  'Cancelled':   { bg:'#F2F2F2', tc:'#595959' },
}

// ── Helpers ────────────────────────────────────────────────
const genId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}`
const now = () => { const d = new Date(); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0') }
const today = () => new Date().toISOString().slice(0,10)

function Avatar({ user, size=32 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:user.color+'22',
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      fontSize:size*0.33, fontWeight:700, color:user.color, border:`1.5px solid ${user.color}44` }}>
      {user.initials}
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG['In Progress']
  return <span style={{ background:s.bg, color:s.tc, fontSize:11, padding:'2px 7px', borderRadius:5, fontWeight:700 }}>{status}</span>
}

function TypeBadge({ type }) {
  return type === 'Rawabi'
    ? <span style={{ background:'#DEEAF1', color:'#0070C0', fontSize:11, padding:'2px 7px', borderRadius:5, fontWeight:700 }}>⚓ Rawabi</span>
    : <span style={{ background:'#EBF3FB', color:'#1F4E79', fontSize:11, padding:'2px 7px', borderRadius:5, fontWeight:700 }}>Regular</span>
}

function Spinner() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'3rem', color:'#888', fontSize:13 }}>Loading…</div>
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('navcom_user')
    return saved ? JSON.parse(saved) : null
  })
  const [tab, setTab] = useState('dashboard')
  const [cases, setCases] = useState([])
  const [rfqs, setRfqs] = useState([])
  const [night, setNight] = useState([])
  const [procurement, setProcurement] = useState([])
  const [invoices, setInvoices] = useState([])
  const [jordanOff, setJordanOff] = useState(false)
  const [rawabiQuiet, setRawabiQuiet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [showNew, setShowNew] = useState(false)

  // ── Load all data ──
  const loadAll = useCallback(async () => {
    setLoading(true)
    const [c, r, n, p, inv, s] = await Promise.all([
      supabase.from('cases').select('*').order('created_at', { ascending:false }),
      supabase.from('rfqs').select('*').order('created_at', { ascending:false }),
      supabase.from('night_log').select('*').order('created_at', { ascending:false }),
      supabase.from('procurement').select('*').order('created_at', { ascending:false }),
      supabase.from('invoices').select('*').order('created_at', { ascending:false }),
      supabase.from('settings').select('*'),
    ])
    if (c.data) setCases(c.data)
    if (r.data) setRfqs(r.data)
    if (n.data) setNight(n.data)
    if (p.data) setProcurement(p.data)
    if (inv.data) setInvoices(inv.data)
    if (s.data) {
      const jo = s.data.find(x => x.key === 'jordan_off')
      const rq = s.data.find(x => x.key === 'rawabi_quiet')
      if (jo) setJordanOff(jo.value === 'true')
      if (rq) setRawabiQuiet(rq.value === 'true')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Real-time subscriptions ──
  useEffect(() => {
    const sub = supabase.channel('navcom-realtime')
      .on('postgres_changes', { event:'*', schema:'public', table:'cases' }, payload => {
        if (payload.eventType === 'INSERT') setCases(p => [payload.new, ...p])
        if (payload.eventType === 'UPDATE') {
          setCases(p => p.map(c => c.id === payload.new.id ? payload.new : c))
          setModal(prev => prev && prev.id === payload.new.id ? payload.new : prev)
        }
        if (payload.eventType === 'DELETE') setCases(p => p.filter(c => c.id !== payload.old.id))
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'rfqs' }, payload => {
        if (payload.eventType === 'INSERT') setRfqs(p => [payload.new, ...p])
        if (payload.eventType === 'UPDATE') setRfqs(p => p.map(r => r.id === payload.new.id ? payload.new : r))
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'night_log' }, payload => {
        if (payload.eventType === 'INSERT') setNight(p => [payload.new, ...p])
        if (payload.eventType === 'UPDATE') setNight(p => p.map(n => n.id === payload.new.id ? payload.new : n))
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'procurement' }, payload => {
        if (payload.eventType === 'INSERT') setProcurement(p => [payload.new, ...p])
        if (payload.eventType === 'UPDATE') setProcurement(p => p.map(x => x.id === payload.new.id ? payload.new : x))
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'invoices' }, payload => {
        if (payload.eventType === 'INSERT') setInvoices(p => [payload.new, ...p])
        if (payload.eventType === 'UPDATE') setInvoices(p => p.map(x => x.id === payload.new.id ? payload.new : x))
      })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'settings' }, payload => {
        if (payload.new.key === 'jordan_off') setJordanOff(payload.new.value === 'true')
        if (payload.new.key === 'rawabi_quiet') setRawabiQuiet(payload.new.value === 'true')
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  const toggleSetting = async (key, current) => {
    const newVal = (!current).toString()
    await supabase.from('settings').update({ value: newVal, updated_by: user?.id, updated_at: new Date().toISOString() }).eq('key', key)
  }

  const login = (u) => { setUser(u); localStorage.setItem('navcom_user', JSON.stringify(u)) }
  const logout = () => { setUser(null); localStorage.removeItem('navcom_user'); setTab('dashboard') }

  if (!user) return <LoginScreen onLogin={login} />

  const isManager = ['marie','jordan'].includes(user.id)
  const tabs = buildTabs(user)

  return (
    <div className="app">
      <TopBar user={user} jordanOff={jordanOff} rawabiQuiet={rawabiQuiet}
        isManager={isManager} onLogout={logout}
        onToggleJordan={() => toggleSetting('jordan_off', jordanOff)}
        onToggleRawabi={() => toggleSetting('rawabi_quiet', rawabiQuiet)} />
      <div style={{ display:'flex' }}>
        <Sidebar tabs={tabs} active={tab} setActive={setTab} />
        <main className="main-content">
          {loading ? <Spinner /> : <>
            {tab === 'dashboard'   && <DashboardTab cases={cases} rfqs={rfqs} night={night} jordanOff={jordanOff} rawabiQuiet={rawabiQuiet} />}
            {tab === 'cases'       && <CasesTab cases={cases} user={user} isManager={isManager} jordanOff={jordanOff} showNew={showNew} setShowNew={setShowNew} setModal={setModal} />}
            {tab === 'rawabi'      && <RawabiTab cases={cases.filter(c => c.type === 'Rawabi')} rawabiQuiet={rawabiQuiet} setModal={setModal} />}
            {tab === 'rfqs'        && <RfqTab rfqs={rfqs} user={user} isManager={isManager} />}
            {tab === 'night'       && <NightTab night={night} user={user} isManager={isManager} jordanOff={jordanOff} />}
            {tab === 'procurement' && <ProcurementTab procurement={procurement} user={user} isManager={isManager} />}
            {tab === 'invoices'    && <InvoicesTab invoices={invoices} cases={cases} user={user} isManager={isManager} jordanOff={jordanOff} />}
            {tab === 'team'        && <TeamTab currentUser={user} jordanOff={jordanOff} />}
          </>}
        </main>
      </div>
      {modal && <CaseModal c={modal} user={user} isManager={isManager} onClose={() => setModal(null)} />}
    </div>
  )
}

function buildTabs(u) {
  const t = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'cases', icon:'💼', label:'All Cases' },
    { id:'rawabi', icon:'⚓', label:'Rawabi' },
  ]
  if (['director','manager','relations','coordinator'].includes(u.access)) t.push({ id:'rfqs', icon:'📩', label:'RFQ Tracker' })
  if (u.id === 'jose' || ['director','manager'].includes(u.access)) t.push({ id:'night', icon:'🌙', label:'Night Log' })
  if (['director','manager','procurement'].includes(u.access)) t.push({ id:'procurement', icon:'🛒', label:'Procurement' })
  if (['director','manager','finance','coordinator'].includes(u.access)) t.push({ id:'invoices', icon:'🧾', label:'Invoices' })
  t.push({ id:'team', icon:'👥', label:'Team' })
  return t
}

// ── Login ──────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [selected, setSelected] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const selectUser = (u) => {
    setSelected(u)
    setPin('')
    setError('')
  }

  const enterDigit = (digit) => {
    if (pin.length >= 4) return
    const newPin = pin + digit
    setPin(newPin)
    if (newPin.length === 4) {
      setTimeout(() => checkPin(newPin), 100)
    }
  }

  const checkPin = (enteredPin) => {
    if (enteredPin === selected.pin) {
      setError('')
      onLogin(selected)
    } else {
      setShake(true)
      setError('Incorrect PIN — try again')
      setPin('')
      setTimeout(() => setShake(false), 500)
    }
  }

  const clearPin = () => setPin(pin.slice(0, -1))

  if (selected) {
    return (
      <div className="login-screen">
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>⚓</div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1F4E79', margin:'0 0 6px' }}>NAVCOM Operations</h1>
        </div>
        <div style={{ background:'#fff', borderRadius:16, border:'0.5px solid #e0e0e0', padding:'28px 24px', width:'100%', maxWidth:320, textAlign:'center' }}>
          <Avatar user={selected} size={52} />
          <p style={{ margin:'12px 0 4px', fontWeight:700, fontSize:16 }}>{selected.name}</p>
          <p style={{ margin:'0 0 24px', fontSize:12, color:'#666' }}>{selected.role}</p>

          {/* PIN dots */}
          <div style={{ display:'flex', gap:12, justifyContent:'center', marginBottom:24,
            animation: shake ? 'shake 0.4s ease' : 'none' }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ width:16, height:16, borderRadius:'50%',
                background: i < pin.length ? selected.color : '#e0e0e0',
                border: `2px solid ${i < pin.length ? selected.color : '#ccc'}`,
                transition:'background 0.15s' }} />
            ))}
          </div>

          {error && <p style={{ color:'#C55A11', fontSize:12, marginBottom:12, fontWeight:600 }}>{error}</p>}

          {/* Number pad */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:16 }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
              <button key={i} onClick={() => d === '⌫' ? clearPin() : d ? enterDigit(d) : null}
                style={{ padding:'16px 0', fontSize: d === '⌫' ? 18 : 20, fontWeight:600,
                  background: d ? '#f5f5f4' : 'none',
                  border: d ? '0.5px solid #e0e0e0' : 'none',
                  borderRadius:10, cursor: d ? 'pointer' : 'default',
                  color: d === '⌫' ? '#888' : '#111',
                  transition:'background 0.1s' }}
                onMouseDown={e => e.currentTarget.style.background = d ? '#e8e8e6' : 'none'}
                onMouseUp={e => e.currentTarget.style.background = d ? '#f5f5f4' : 'none'}>
                {d}
              </button>
            ))}
          </div>

          <button onClick={() => { setSelected(null); setPin(''); setError('') }}
            style={{ background:'none', border:'none', color:'#888', fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
            ← Back to profiles
          </button>
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(6px); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="login-screen">
      <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
        <div style={{ fontSize:36, marginBottom:8 }}>⚓</div>
        <h1 style={{ fontSize:22, fontWeight:700, color:'#1F4E79', margin:'0 0 6px' }}>NAVCOM Operations</h1>
        <p style={{ color:'#666', fontSize:13, margin:0 }}>Select your profile to continue</p>
      </div>
      <div className="login-grid">
        {USERS.map(u => (
          <button key={u.id} className="login-btn" onClick={() => selectUser(u)}
            style={{ borderColor: u.color+'44' }}>
            <Avatar user={u} size={38} />
            <p style={{ margin:'8px 0 2px', fontWeight:700, fontSize:14 }}>{u.name}</p>
            <p style={{ margin:0, fontSize:11, color:'#666', lineHeight:1.3 }}>{u.role}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── TopBar ─────────────────────────────────────────────────
function TopBar({ user, jordanOff, rawabiQuiet, isManager, onLogout, onToggleJordan, onToggleRawabi }) {
  return (
    <div className="topbar">
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:20 }}>⚓</span>
        <span style={{ fontWeight:700, fontSize:15, color:'#1F4E79' }}>NAVCOM Ops</span>
        {jordanOff && <span className="badge-warn">Jordan absent — Marie covering</span>}
        {rawabiQuiet && <span className="badge-info">Rawabi: quiet mode</span>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        {isManager && <>
          <label className="toggle-label">
            <input type="checkbox" checked={jordanOff} onChange={onToggleJordan} />
            Jordan off
          </label>
          <label className="toggle-label">
            <input type="checkbox" checked={rawabiQuiet} onChange={onToggleRawabi} />
            Rawabi quiet
          </label>
        </>}
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Avatar user={user} size={26} />
          <span style={{ fontSize:13, fontWeight:600 }}>{user.name}</span>
        </div>
        <button className="btn-ghost" onClick={onLogout}>Sign out</button>
      </div>
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────
function Sidebar({ tabs, active, setActive }) {
  return (
    <nav className="sidebar">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)}
          className={`nav-btn ${active === t.id ? 'active' : ''}`}>
          <span style={{ fontSize:15 }}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ── Dashboard ──────────────────────────────────────────────
function DashboardTab({ cases, rfqs, night, jordanOff, rawabiQuiet }) {
  const active  = cases.filter(c => c.status !== 'Closed' && c.status !== 'Cancelled')
  const delayed = cases.filter(c => c.status === 'Delayed')
  const rawabi  = cases.filter(c => c.type === 'Rawabi' && c.status !== 'Closed')
  const overdue = rfqs.filter(r => r.turnaround === 'Overdue')
  const pending = night.filter(n => !n.decision)

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>

      {jordanOff && <div className="alert-warn">⚠ Jordan is off duty — Marie is covering above-coordinator decisions. Team continues as normal.</div>}
      {rawabiQuiet && <div className="alert-info">⚓ Rawabi quiet mode active — Jordan has pulled Banseh into regular operations.</div>}

      <div className="metric-grid">
        {[
          { label:'Active cases',      val:active.length,  color:'#1F4E79' },
          { label:'Delayed',           val:delayed.length, color:'#C55A11' },
          { label:'Rawabi active',     val:rawabi.length,  color:'#0070C0' },
          { label:'Overdue RFQs',      val:overdue.length, color:'#C00000' },
          { label:'Night log pending', val:pending.length, color:'#375623' },
          { label:'Closed total',      val:cases.filter(c=>c.status==='Closed').length, color:'#375623' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <p className="metric-label">{m.label}</p>
            <p className="metric-value" style={{ color:m.color }}>{m.val}</p>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="card">
          <p className="card-title" style={{ color:'#C55A11' }}>⚠ Needs attention</p>
          {delayed.length === 0 && <p className="muted">All cases on track.</p>}
          {delayed.map(c => (
            <div key={c.id} className="list-item" style={{ borderLeftColor:'#C55A11' }}>
              <p style={{ margin:'0 0 2px', fontWeight:700, fontSize:13 }}>{c.id} — {c.client}</p>
              <p style={{ margin:0, fontSize:12, color:'#666' }}>{c.scope}</p>
              {c.remarks && <p style={{ margin:0, fontSize:11, color:'#C55A11' }}>{c.remarks}</p>}
            </div>
          ))}
        </div>
        <div className="card">
          <p className="card-title" style={{ color:'#0070C0' }}>⚓ Rawabi cases</p>
          {rawabi.length === 0 && <p className="muted">No active Rawabi cases.</p>}
          {rawabi.map(c => (
            <div key={c.id} className="list-item" style={{ borderLeftColor:'#0070C0' }}>
              <p style={{ margin:'0 0 2px', fontWeight:700, fontSize:13 }}>{c.vessel}</p>
              <p style={{ margin:'0 0 4px', fontSize:12, color:'#666' }}>{c.scope} · {c.location}</p>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      </div>

      {pending.length > 0 && (
        <div className="alert-green" style={{ marginTop:14 }}>
          <p style={{ margin:'0 0 8px', fontWeight:700, fontSize:13, color:'#375623' }}>
            🌙 Overnight items pending Jordan's decision ({pending.length})
          </p>
          {pending.map(n => (
            <p key={n.id} style={{ margin:'0 0 3px', fontSize:12, color:'#375623' }}>
              · {n.client} — {n.type}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Cases Tab ──────────────────────────────────────────────
function CasesTab({ cases, user, isManager, jordanOff, showNew, setShowNew, setModal }) {
  const [filter, setFilter] = useState('open')

  const filtered = cases.filter(c => {
    if (filter === 'mine')    return c.assigned_to === user.id
    if (filter === 'rawabi')  return c.type === 'Rawabi'
    if (filter === 'delayed') return c.status === 'Delayed'
    if (filter === 'open')    return c.status !== 'Closed' && c.status !== 'Cancelled'
    return true
  })

  const canNew = isManager || ['banseh','lely','haslinda'].includes(user.id)

  return (
    <div>
      <div className="tab-header">
        <h2 className="page-title" style={{ margin:0 }}>All Cases</h2>
        {canNew && (
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ New case</button>
        )}
      </div>
      <div className="filter-row">
        {['all','open','mine','rawabi','delayed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`filter-btn ${filter===f?'active':''}`}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
        <span className="muted" style={{ fontSize:11, alignSelf:'center', marginLeft:4 }}>
          {filtered.length} case{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {showNew && <NewCaseForm user={user} onClose={() => setShowNew(false)} jordanOff={jordanOff} />}

      <div className="case-list">
        {filtered.map(c => <CaseCard key={c.id} c={c} onClick={() => setModal(c)} />)}
        {filtered.length === 0 && <p className="muted">No cases found.</p>}
      </div>
    </div>
  )
}

function CaseCard({ c, onClick }) {
  const assignee = USERS.find(u => u.id === c.assigned_to)
  const isDelayed = c.status === 'Delayed'
  const isRawabi  = c.type === 'Rawabi'
  return (
    <div onClick={onClick} className="case-card"
      style={{ borderColor: isDelayed ? '#C55A11' : isRawabi ? '#0070C0' : '#e0e0e0' }}>
      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:6, marginBottom:5, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#888', fontWeight:700 }}>{c.id}</span>
            <TypeBadge type={c.type} />
            <StatusBadge status={c.status} />
            {c.jordan_absent && <span style={{ background:'#FFF9E6', color:'#7F5F00', fontSize:11, padding:'2px 6px', borderRadius:5, fontWeight:600 }}>Jordan absent</span>}
          </div>
          <p style={{ margin:'0 0 2px', fontWeight:700, fontSize:14 }}>{c.client}</p>
          <p style={{ margin:'0 0 6px', fontSize:12, color:'#666' }}>{c.scope}</p>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'#888' }}>🚢 {c.vessel}</span>
            <span style={{ fontSize:11, color:'#888' }}>📍 {c.location}</span>
            <span style={{ fontSize:11, color:'#888' }}>📋 {c.stage}</span>
          </div>
          {c.remarks && <p style={{ margin:'6px 0 0', fontSize:11, color:'#C55A11', background:'#FCE4D6', padding:'3px 7px', borderRadius:5 }}>{c.remarks}</p>}
        </div>
        {assignee && (
          <div style={{ textAlign:'center', flexShrink:0 }}>
            <Avatar user={assignee} size={28} />
            <p style={{ margin:'3px 0 0', fontSize:10, color:'#666' }}>{assignee.name}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NewCaseForm({ user, onClose, jordanOff }) {
  const [form, setForm] = useState({
    client:'', scope:'', type:'Regular', vessel:'', location:'',
    class_flag:'❌ Pending', assigned_to: user.id
  })
  const [saving, setSaving] = useState(false)

  const set = (k,v) => setForm(p => ({...p, [k]:v}))

  const submit = async () => {
    if (!form.client || !form.scope) return
    setSaving(true)
    const id = genId('C')
    const { error } = await supabase.from('cases').insert({
      id, date: today(), ...form,
      quote_status:'Soft Quote', stage:'Acknowledgment Sent',
      status:'In Progress', lea_notified:false,
      jordan_absent: jordanOff, remarks:'', updates:[],
    })
    if (!error) onClose()
    setSaving(false)
  }

  return (
    <div className="card" style={{ marginBottom:14 }}>
      <h3 style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>New case</h3>
      <div className="form-grid">
        {[['client','Client'],['scope','Scope'],['vessel','Vessel'],['location','Location']].map(([k,l]) => (
          <div key={k}>
            <p className="field-label">{l}</p>
            <input value={form[k]} onChange={e=>set(k,e.target.value)} className="field-input" />
          </div>
        ))}
        <div>
          <p className="field-label">Type</p>
          <select value={form.type} onChange={e=>set('type',e.target.value)} className="field-input">
            <option>Regular</option><option>Rawabi</option>
          </select>
        </div>
        <div>
          <p className="field-label">Assign to</p>
          <select value={form.assigned_to} onChange={e=>set('assigned_to',e.target.value)} className="field-input">
            {USERS.filter(u => ['coordinator','procurement'].includes(u.access)).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <button onClick={submit} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Create case'}</button>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
      </div>
    </div>
  )
}

// ── Case Modal ─────────────────────────────────────────────
function CaseModal({ c, user, isManager, onClose }) {
  const [upd, setUpd] = useState('')
  const [saving, setSaving] = useState(false)
  const assignee = USERS.find(u => u.id === c.assigned_to)
  const canEdit = isManager || c.assigned_to === user.id

  const updateField = async (field, val) => {
    await supabase.from('cases').update({ [field]: val, updated_at: new Date().toISOString() }).eq('id', c.id)
  }

  const postUpdate = async () => {
    if (!upd.trim()) return
    setSaving(true)
    const existing = Array.isArray(c.updates) ? c.updates : []
    const newUpds = [{ by:user.id, time:now(), text:upd }, ...existing]
    await supabase.from('cases').update({ updates: newUpds, updated_at: new Date().toISOString() }).eq('id', c.id)
    setUpd('')
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div className="modal-box">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div>
            <div style={{ display:'flex', gap:6, marginBottom:4 }}>
              <span style={{ fontSize:11, color:'#888', fontWeight:700 }}>{c.id}</span>
              <TypeBadge type={c.type} />
            </div>
            <h2 style={{ fontSize:17, fontWeight:700, margin:'0 0 2px' }}>{c.client}</h2>
            <p style={{ margin:0, fontSize:13, color:'#666' }}>{c.scope}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, color:'#888', cursor:'pointer' }}>✕</button>
        </div>

        <div className="detail-grid">
          {[['Vessel',c.vessel],['Location',c.location],['Class & Flag',c.class_flag],['Date',c.date]].map(([l,v]) => (
            <div key={l} className="detail-cell">
              <p className="field-label">{l}</p>
              <p style={{ margin:0, fontSize:13, fontWeight:600 }}>{v}</p>
            </div>
          ))}
        </div>

        <div className="form-grid-3" style={{ marginBottom:14 }}>
          <div>
            <p className="field-label">Status</p>
            {canEdit
              ? <select value={c.status} onChange={e=>updateField('status',e.target.value)} className="field-input">
                  {Object.keys(STATUS_CFG).map(s => <option key={s}>{s}</option>)}
                </select>
              : <StatusBadge status={c.status} />
            }
          </div>
          <div>
            <p className="field-label">Stage</p>
            {canEdit
              ? <select value={c.stage} onChange={e=>updateField('stage',e.target.value)} className="field-input">
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              : <p style={{ margin:0, fontSize:12 }}>{c.stage}</p>
            }
          </div>
          <div>
            <p className="field-label">Assigned to</p>
            {isManager
              ? <select value={c.assigned_to||''} onChange={e=>updateField('assigned_to',e.target.value)} className="field-input">
                  {USERS.filter(u=>['coordinator','procurement'].includes(u.access)).map(u=>(
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              : <p style={{ margin:0, fontSize:12 }}>{assignee?.name}</p>
            }
          </div>
        </div>

        {canEdit && (
          <div style={{ marginBottom:14 }}>
            <p className="field-label">Remarks</p>
            <input value={c.remarks||''} onChange={e=>updateField('remarks',e.target.value)}
              placeholder="Add a note…" className="field-input" style={{ width:'100%' }} />
          </div>
        )}

        <div>
          <p style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Updates</p>
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            <input value={upd} onChange={e=>setUpd(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&postUpdate()}
              placeholder="Post an update…" className="field-input" style={{ flex:1 }} />
            <button onClick={postUpdate} disabled={saving} className="btn-primary">
              {saving ? '…' : 'Post'}
            </button>
          </div>
          <div style={{ maxHeight:160, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
            {(Array.isArray(c.updates)?c.updates:[]).map((u,i) => {
              const poster = USERS.find(x => x.id === u.by)
              return (
                <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                  {poster && <Avatar user={poster} size={22} />}
                  <div style={{ background:'#f5f5f4', borderRadius:6, padding:'5px 9px', flex:1 }}>
                    <p style={{ margin:'0 0 1px', fontSize:10, color:'#888' }}>{poster?.name} · {u.time}</p>
                    <p style={{ margin:0, fontSize:12 }}>{u.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Rawabi Tab ─────────────────────────────────────────────
function RawabiTab({ cases, rawabiQuiet, setModal }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <h2 className="page-title" style={{ margin:0 }}>⚓ Rawabi Project</h2>
        <span style={{ background:rawabiQuiet?'#FFF2CC':'#DEEAF1', color:rawabiQuiet?'#7F5F00':'#0070C0', fontSize:12, padding:'2px 10px', borderRadius:6, fontWeight:700 }}>
          {rawabiQuiet ? 'Quiet — Banseh in regular ops' : 'Active — Banseh on exclusive lead'}
        </span>
      </div>
      <div className="alert-rawabi" style={{ marginBottom:14 }}>
        <strong>Arrangement:</strong> Banseh is the exclusive lead. Backups: Haslinda (day off/time gaps) · Jose (nights). Lely: extreme overload only, Jordan-authorized. Jordan may pull Banseh into regular ops when Rawabi is quiet.
      </div>
      <div className="case-list">
        {cases.map(c => <CaseCard key={c.id} c={c} onClick={() => setModal(c)} />)}
        {cases.length === 0 && <p className="muted">No active Rawabi cases.</p>}
      </div>
    </div>
  )
}

// ── RFQ Tab ────────────────────────────────────────────────
function RfqTab({ rfqs, user, isManager }) {
  const overdue = rfqs.filter(r => r.turnaround === 'Overdue')
  return (
    <div>
      <h2 className="page-title">RFQ Tracker — Lea</h2>
      {overdue.length > 0 && (
        <div className="alert-warn" style={{ marginBottom:12 }}>
          {overdue.length} overdue RFQ{overdue.length>1?'s':''} — escalate to Jordan and Marie immediately
        </div>
      )}
      <div className="case-list">
        {rfqs.map(r => {
          const isOverdue = r.turnaround === 'Overdue'
          return (
            <div key={r.id} className="case-card" style={{ borderColor: isOverdue?'#C55A11':'#e0e0e0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                <div>
                  <div style={{ display:'flex', gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:11, color:'#888' }}>{r.id}</span>
                    <span style={{ background:isOverdue?'#FCE4D6':r.turnaround==='On Time'?'#E2EFDA':'#FFF2CC', color:isOverdue?'#C55A11':r.turnaround==='On Time'?'#375623':'#7F5F00', fontSize:11, padding:'2px 7px', borderRadius:5, fontWeight:700 }}>
                      {r.turnaround||'Pending'}
                    </span>
                    <span style={{ background:'#EBF3FB', color:'#1F4E79', fontSize:11, padding:'2px 7px', borderRadius:5 }}>{r.quote_status}</span>
                  </div>
                  <p style={{ margin:'0 0 2px', fontWeight:700, fontSize:13 }}>{r.client}</p>
                  <p style={{ margin:0, fontSize:12, color:'#666' }}>{r.scope}</p>
                  {r.satisfaction && <p style={{ margin:'4px 0 0', fontSize:12 }}>{r.satisfaction}</p>}
                  {r.complaint && <p style={{ margin:'4px 0 0', fontSize:11, color:'#C00000', background:'#FADADD', padding:'2px 7px', borderRadius:5 }}>Complaint: {r.complaint}</p>}
                </div>
                <p style={{ fontSize:11, color:'#888', flexShrink:0 }}>{r.date}</p>
              </div>
            </div>
          )
        })}
        {rfqs.length === 0 && <p className="muted">No RFQs logged.</p>}
      </div>
    </div>
  )
}

// ── Night Log Tab ──────────────────────────────────────────
function NightTab({ night, user, isManager, jordanOff }) {
  const [form, setForm] = useState({ client:'', type:'New Inquiry', description:'', urgency:'Moderate - Morning Review' })
  const [saving, setSaving] = useState(false)
  const canPost = user.id === 'jose'
  const pending = night.filter(n => !n.decision)

  const addLog = async () => {
    if (!form.client || !form.description) return
    setSaving(true)
    const id = genId('NL')
    await supabase.from('night_log').insert({ id, date:today(), time:now(), ...form, action_needed:'', decision:'' })
    setForm({ client:'', type:'New Inquiry', description:'', urgency:'Moderate - Morning Review' })
    setSaving(false)
  }

  const decide = async (id, decision) => {
    await supabase.from('night_log').update({ decision }).eq('id', id)
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <h2 className="page-title" style={{ margin:0 }}>🌙 Jose — Night Log</h2>
        {pending.length > 0 && <span className="badge-info">{pending.length} pending Jordan{jordanOff?' (Marie covering)':''}</span>}
      </div>

      {canPost && (
        <div className="card" style={{ marginBottom:14 }}>
          <h3 style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Log overnight activity</h3>
          <div className="form-grid">
            <div>
              <p className="field-label">Client / Case</p>
              <input value={form.client} onChange={e=>setForm(p=>({...p,client:e.target.value}))} className="field-input" />
            </div>
            <div>
              <p className="field-label">Type</p>
              <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className="field-input">
                {['New Inquiry','New Rawabi Inquiry','Email on Active Case','Email on Rawabi Case','Urgent Issue','Other'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <p className="field-label">Urgency</p>
              <select value={form.urgency} onChange={e=>setForm(p=>({...p,urgency:e.target.value}))} className="field-input">
                {['Urgent - Call Jordan/Marie Now','Moderate - Morning Review','Low - FYI Only'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ margin:'10px 0' }}>
            <p className="field-label">Description / Action taken</p>
            <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} className="field-input" style={{ width:'100%', resize:'vertical' }} />
          </div>
          <button onClick={addLog} disabled={saving} className="btn-green">{saving?'Saving…':'Add to log'}</button>
        </div>
      )}

      <div className="case-list">
        {night.map(n => (
          <div key={n.id} className="case-card" style={{ borderColor: n.urgency?.includes('Urgent')?'#C55A11':'#e0e0e0' }}>
            <div style={{ display:'flex', gap:6, marginBottom:4, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#888' }}>{n.id} · {n.date} {n.time}</span>
              <span style={{ background:n.urgency?.includes('Urgent')?'#FCE4D6':n.urgency?.includes('Moderate')?'#FFF2CC':'#E2EFDA', color:n.urgency?.includes('Urgent')?'#C55A11':n.urgency?.includes('Moderate')?'#7F5F00':'#375623', fontSize:11, padding:'2px 6px', borderRadius:5, fontWeight:700 }}>
                {n.urgency?.split(' - ')[0]}
              </span>
              <span style={{ background:'#EBF3FB', color:'#1F4E79', fontSize:11, padding:'2px 6px', borderRadius:5 }}>{n.type}</span>
            </div>
            <p style={{ margin:'0 0 2px', fontWeight:700, fontSize:13 }}>{n.client}</p>
            <p style={{ margin:0, fontSize:12, color:'#666' }}>{n.description}</p>
            {isManager && !n.decision && (
              <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap' }}>
                {['Assign to Banseh','Assign to Lely','No action needed'].map(d => (
                  <button key={d} onClick={() => decide(n.id, d)} className="btn-outline-sm">{d}</button>
                ))}
              </div>
            )}
            {n.decision && <p style={{ margin:'8px 0 0', fontSize:11, background:'#E2EFDA', color:'#375623', padding:'3px 8px', borderRadius:5, fontWeight:700, display:'inline-block' }}>✓ {n.decision}</p>}
          </div>
        ))}
        {night.length === 0 && <p className="muted">No overnight log entries.</p>}
      </div>
    </div>
  )
}

// ── Procurement Tab ────────────────────────────────────────
function ProcurementTab({ procurement, user, isManager }) {
  return (
    <div>
      <h2 className="page-title">Procurement — Haslinda & Veronica</h2>
      <div className="case-list">
        {procurement.map(p => (
          <div key={p.id} className="case-card" style={{ borderColor: p.case_type==='Rawabi'?'#0070C0':'#e0e0e0' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
              <div>
                <div style={{ display:'flex', gap:6, marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'#888' }}>{p.id} · {p.case_id}</span>
                  <TypeBadge type={p.case_type} />
                  <span style={{ background:p.delivery_status?.includes('Delivered')?'#E2EFDA':p.delivery_status?.includes('Delayed')?'#FCE4D6':'#EBF3FB', color:p.delivery_status?.includes('Delivered')?'#375623':p.delivery_status?.includes('Delayed')?'#C55A11':'#1F4E79', fontSize:11, padding:'2px 6px', borderRadius:5, fontWeight:700 }}>{p.delivery_status}</span>
                </div>
                <p style={{ margin:'0 0 2px', fontWeight:700, fontSize:13 }}>{p.item}</p>
                <p style={{ margin:0, fontSize:12, color:'#666' }}>Supplier: {p.supplier} · {p.handled_by} · {p.po_status}</p>
              </div>
              <p style={{ fontSize:11, color:'#888', flexShrink:0 }}>{p.date}</p>
            </div>
          </div>
        ))}
        {procurement.length === 0 && <p className="muted">No procurement requests.</p>}
      </div>
    </div>
  )
}

// ── Invoices Tab ───────────────────────────────────────────
function InvoicesTab({ invoices, cases, user, isManager, jordanOff }) {
  const readyForInvoice = cases.filter(c => ['Invoice Requested','Invoice Sent','Closed'].includes(c.stage))

  const confirmInvoice = async (id) => {
    await supabase.from('invoices').update({ jordan_confirmed:true, jordan_confirmed_date:today() }).eq('id', id)
  }

  return (
    <div>
      <h2 className="page-title">Invoices — Ayu & Aimy</h2>
      <p style={{ margin:'0 0 14px', fontSize:12, color:'#666' }}>
        No invoice is sent without Jordan's final confirmation.
        {jordanOff ? ' Jordan is off — hold new invoices or escalate to Marie.' : ''}
      </p>
      {invoices.length === 0 && readyForInvoice.length === 0 && <p className="muted">No invoices yet.</p>}
      <div className="case-list">
        {invoices.map(inv => (
          <div key={inv.id} className="case-card" style={{ borderColor: inv.case_type==='Rawabi'?'#0070C0':'#e0e0e0' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
              <div>
                <div style={{ display:'flex', gap:6, marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'#888' }}>{inv.id} · {inv.case_id}</span>
                  <TypeBadge type={inv.case_type} />
                  <span style={{ background:inv.jordan_confirmed?'#E2EFDA':'#FFF2CC', color:inv.jordan_confirmed?'#375623':'#7F5F00', fontSize:11, padding:'2px 6px', borderRadius:5, fontWeight:700 }}>
                    {inv.jordan_confirmed ? '✓ Jordan confirmed' : '⏳ Awaiting Jordan'}
                  </span>
                </div>
                <p style={{ margin:'0 0 2px', fontWeight:700, fontSize:13 }}>{inv.client}</p>
                <p style={{ margin:0, fontSize:12, color:'#666' }}>{inv.scope} {inv.amount ? `· ${inv.amount}` : ''}</p>
              </div>
              {user.id === 'jordan' && !inv.jordan_confirmed && (
                <button onClick={() => confirmInvoice(inv.id)} className="btn-teal">Confirm</button>
              )}
            </div>
          </div>
        ))}
        {readyForInvoice.map(c => (
          <div key={c.id} className="case-card" style={{ borderColor: c.type==='Rawabi'?'#0070C0':'#e0e0e0', opacity:0.75 }}>
            <div style={{ display:'flex', gap:6, marginBottom:4 }}>
              <span style={{ fontSize:11, color:'#888' }}>{c.id}</span>
              <TypeBadge type={c.type} />
              <span style={{ background:'#FFF2CC', color:'#7F5F00', fontSize:11, padding:'2px 6px', borderRadius:5, fontWeight:700 }}>{c.stage}</span>
            </div>
            <p style={{ margin:'0 0 2px', fontWeight:700, fontSize:13 }}>{c.client}</p>
            <p style={{ margin:0, fontSize:12, color:'#666' }}>{c.scope} — awaiting Ayu to raise invoice</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Team Tab ───────────────────────────────────────────────
function TeamTab({ currentUser, jordanOff }) {
  return (
    <div>
      <h2 className="page-title">Team</h2>
      {jordanOff && <div className="alert-warn" style={{ marginBottom:12 }}>Jordan is off — Marie covering above-coordinator decisions.</div>}
      <div className="team-grid">
        {USERS.map(u => (
          <div key={u.id} className="team-card" style={{ borderColor: u.id===currentUser.id?'#1F4E79':'#e0e0e0' }}>
            <Avatar user={u} size={36} />
            <div style={{ minWidth:0 }}>
              <p style={{ margin:'0 0 2px', fontWeight:700, fontSize:13 }}>{u.name}</p>
              <p style={{ margin:'0 0 5px', fontSize:11, color:'#666', lineHeight:1.3 }}>{u.role}</p>
              {u.id==='banseh'   && <span className="role-badge" style={{ background:'#DEEAF1', color:'#0070C0' }}>⚓ Rawabi lead</span>}
              {u.id==='haslinda' && <span className="role-badge" style={{ background:'#EAD1FB', color:'#7030A0' }}>Rawabi day backup</span>}
              {u.id==='jose'     && <span className="role-badge" style={{ background:'#E2EFDA', color:'#375623' }}>🌙 Rawabi night backup</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
