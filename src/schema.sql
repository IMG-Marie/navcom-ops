-- ============================================================
-- NAVCOM OPERATIONS SYSTEM — SUPABASE DATABASE SCHEMA
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- CASES table
create table if not exists cases (
  id text primary key,
  date text,
  client text,
  scope text,
  type text default 'Regular',
  assigned_to text,
  vessel text,
  location text,
  class_flag text default '❌ Pending',
  quote_status text default 'Soft Quote',
  quote_amount text,
  job_order text,
  stage text default 'Acknowledgment Sent',
  status text default 'In Progress',
  lea_notified boolean default false,
  procure_needed text default '❌ Not Required',
  procure_status text,
  jordan_absent boolean default false,
  remarks text,
  updates jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RFQ table
create table if not exists rfqs (
  id text primary key,
  date text,
  client text,
  scope text,
  assigned_to text,
  quote_status text default 'Awaiting Quote',
  quote_sent text,
  turnaround text default 'Pending',
  satisfaction text,
  complaint text,
  resolution text,
  escalated_to text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- NIGHT LOG table
create table if not exists night_log (
  id text primary key,
  date text,
  time text,
  type text,
  client text,
  description text,
  urgency text,
  action_needed text,
  decision text,
  created_at timestamptz default now()
);

-- PROCUREMENT table
create table if not exists procurement (
  id text primary key,
  date text,
  case_id text,
  case_type text default 'Regular',
  requested_by text,
  item text,
  handled_by text,
  supplier text,
  po_status text default '⏳ Pending Approval',
  delivery_status text default '⏳ Pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INVOICES table
create table if not exists invoices (
  id text primary key,
  date text,
  case_id text,
  case_type text default 'Regular',
  client text,
  scope text,
  amount text,
  prepared_by text default 'Ayu',
  jordan_confirmed boolean default false,
  jordan_confirmed_date text,
  date_sent text,
  payment_status text default '⏳ Not Yet Sent',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SETTINGS table (for Jordan-off and Rawabi-quiet toggles)
create table if not exists settings (
  key text primary key,
  value text,
  updated_by text,
  updated_at timestamptz default now()
);

-- Insert default settings
insert into settings (key, value, updated_by) values
  ('jordan_off', 'false', 'system'),
  ('rawabi_quiet', 'false', 'system')
on conflict (key) do nothing;

-- ── Enable real-time on all tables ──
alter publication supabase_realtime add table cases;
alter publication supabase_realtime add table rfqs;
alter publication supabase_realtime add table night_log;
alter publication supabase_realtime add table procurement;
alter publication supabase_realtime add table invoices;
alter publication supabase_realtime add table settings;

-- ── Row Level Security: allow all (you can tighten later) ──
alter table cases enable row level security;
alter table rfqs enable row level security;
alter table night_log enable row level security;
alter table procurement enable row level security;
alter table invoices enable row level security;
alter table settings enable row level security;

create policy "Allow all" on cases for all using (true) with check (true);
create policy "Allow all" on rfqs for all using (true) with check (true);
create policy "Allow all" on night_log for all using (true) with check (true);
create policy "Allow all" on procurement for all using (true) with check (true);
create policy "Allow all" on invoices for all using (true) with check (true);
create policy "Allow all" on settings for all using (true) with check (true);

-- ── Seed sample data ──
insert into cases (id, date, client, scope, type, assigned_to, vessel, location, class_flag, quote_status, stage, status, lea_notified, jordan_absent, remarks, updates) values
('C-001','2026-06-01','Gulf Marine Services','GMDSS Annual Survey','Regular','banseh','MV Gulf Star','Port Rashid, Dubai','✅ Confirmed','Approved','Job In Progress','On Track',true,false,'','[{"by":"banseh","time":"09:15","text":"Technician boarded. Job started."},{"by":"banseh","time":"07:30","text":"Job Order created and sent."}]'),
('C-002','2026-06-02','Rawabi Offshore','Radio Survey - SOLAS','Rawabi','banseh','Rawabi 3','Dammam, KSA','✅ Confirmed','Sent to Client','Quote Sent','In Progress',true,false,'Awaiting PO from client','[{"by":"banseh","time":"10:00","text":"Quote sent to client. Following up."}]'),
('C-003','2026-06-02','Emirates Shipping','EPIRB Servicing','Regular','lely','MV Emirates Pearl','Jebel Ali','✅ Confirmed','Approved','Technician Mobilized','On Track',true,false,'','[{"by":"lely","time":"11:30","text":"Technician confirmed. Mobilizing tomorrow AM."}]'),
('C-004','2026-06-01','Rawabi Offshore','NAVTEX Installation','Rawabi','banseh','Rawabi 7','Jubail, KSA','❌ Pending','Quote Prep','Class Verification','Delayed',true,false,'Class confirmation pending — HOLD','[{"by":"banseh","time":"08:00","text":"Chasing Class confirmation. No response yet."}]'),
('C-005','2026-05-30','Abu Dhabi National Tankers','SSB Radio Repair','Regular','lely','MT Mariam','ADNOC Ruwais','✅ Confirmed','Approved','Invoice Sent','Closed',true,false,'','[{"by":"lely","time":"16:00","text":"Invoice confirmed sent. Case closed."}]')
on conflict (id) do nothing;

insert into rfqs (id, date, client, scope, assigned_to, quote_status, quote_sent, turnaround, satisfaction) values
('RFQ-001','2026-06-01','Gulf Marine Services','GMDSS Annual Survey','banseh','Approved','2026-06-01','On Time','😊 Satisfied'),
('RFQ-002','2026-06-02','Emirates Shipping','EPIRB Servicing','lely','Quote Sent','2026-06-02','On Time',''),
('RFQ-003','2026-06-02','Al Bahia Marine','AIS Class B Installation','','Awaiting Quote','','Overdue','')
on conflict (id) do nothing;

insert into night_log (id, date, time, type, client, description, urgency, action_needed, decision) values
('NL-001','2026-06-03','21:30','New Inquiry','Pacific Carriers','RFQ received for SOLAS radio survey. Ack sent. Logged for Jordan morning review.','Moderate - Morning Review','Assign to Banseh','')
on conflict (id) do nothing;

insert into procurement (id, date, case_id, case_type, requested_by, item, handled_by, supplier, po_status, delivery_status) values
('PR-001','2026-06-01','C-004','Rawabi','banseh','NAVTEX Receiver - Furuno NX-700A','Haslinda','Furuno ME','PO Raised','In Transit')
on conflict (id) do nothing;
