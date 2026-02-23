import { column, Schema, Table } from '@powersync/react-native';

const projects = new Table({
  organization_id: column.text,
  name: column.text,
  code: column.text,
  description: column.text,
  status: column.text,
  address: column.text,
  city: column.text,
  state: column.text,
  zip_code: column.text,
  start_date: column.text,
  estimated_end_date: column.text,
  contract_value: column.real,
  created_at: column.text,
  updated_at: column.text,
});

const project_members = new Table({
  project_id: column.text,
  user_id: column.text,
  role: column.text,
  created_at: column.text,
});

const daily_logs = new Table({
  project_id: column.text,
  user_id: column.text,
  log_date: column.text,
  status: column.text,
  notes: column.text,
  ai_generated: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const workforce_entries = new Table({
  daily_log_id: column.text,
  trade: column.text,
  company: column.text,
  worker_count: column.integer,
  hours_worked: column.real,
  overtime_hours: column.real,
  foreman: column.text,
  ai_generated: column.integer,
  ai_confidence: column.real,
  status: column.text,
  created_at: column.text,
});

const equipment_entries = new Table({
  daily_log_id: column.text,
  name: column.text,
  equipment_type: column.text,
  hours_used: column.real,
  condition: column.text,
  operator_name: column.text,
  ai_generated: column.integer,
  ai_confidence: column.real,
  status: column.text,
  created_at: column.text,
});

const work_completed_entries = new Table({
  daily_log_id: column.text,
  description: column.text,
  location: column.text,
  quantity: column.real,
  unit: column.text,
  csi_code: column.text,
  ai_generated: column.integer,
  ai_confidence: column.real,
  status: column.text,
  created_at: column.text,
});

const material_entries = new Table({
  daily_log_id: column.text,
  material: column.text,
  quantity: column.real,
  unit: column.text,
  supplier: column.text,
  ticket_number: column.text,
  condition: column.text,
  ai_generated: column.integer,
  ai_confidence: column.real,
  status: column.text,
  created_at: column.text,
});

const delay_entries = new Table({
  daily_log_id: column.text,
  cause: column.text,
  description: column.text,
  duration_minutes: column.integer,
  impacted_trades: column.text, // JSON string array
  ai_generated: column.integer,
  ai_confidence: column.real,
  status: column.text,
  created_at: column.text,
});

const safety_entries = new Table({
  daily_log_id: column.text,
  toolbox_talks: column.text, // JSON string array
  inspections: column.text, // JSON string array
  incidents: column.text, // JSON string array
  osha_recordable: column.integer,
  near_misses: column.integer,
  first_aid_cases: column.integer,
  notes: column.text,
  ai_generated: column.integer,
  ai_confidence: column.real,
  ai_confidence_reason: column.text,
  review_status: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const weather_entries = new Table({
  daily_log_id: column.text,
  conditions: column.text, // JSON array of WeatherCondition
  temp_high: column.real,
  temp_low: column.real,
  precipitation: column.text,
  wind_speed: column.real,
  wind_direction: column.text,
  humidity: column.real,
  delay_minutes: column.integer,
  ai_generated: column.integer,
  ai_confidence: column.real,
  ai_confidence_reason: column.text,
  review_status: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const tasks = new Table({
  project_id: column.text,
  daily_log_id: column.text,
  voice_note_id: column.text,
  description: column.text,
  assignee: column.text,
  due_date: column.text,
  priority: column.text,
  category: column.text,
  status: column.text,
  ai_generated: column.integer,
  ai_confidence: column.real,
  completed_at: column.text,
  created_by_id: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const voice_notes = new Table({
  daily_log_id: column.text,
  user_id: column.text,
  file_path: column.text,
  mime_type: column.text,
  duration_seconds: column.integer,
  transcript: column.text,
  status: column.text,
  sync_status: column.text,
  ai_processed: column.integer,
  created_at: column.text,
});

const communications = new Table({
  organization_id: column.text,
  project_id: column.text,
  daily_log_id: column.text,
  voice_note_id: column.text,
  type: column.text,
  status: column.text,
  urgency: column.text,
  recipient: column.text,
  recipient_email: column.text,
  recipient_phone: column.text,
  subject: column.text,
  body: column.text,
  context: column.text,
  ai_generated: column.integer,
  ai_confidence: column.real,
  edited_body: column.text,
  approved_by_id: column.text,
  approved_at: column.text,
  sent_at: column.text,
  created_by_id: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const inspections = new Table({
  organization_id: column.text,
  project_id: column.text,
  daily_log_id: column.text,
  media_id: column.text,
  document_id: column.text,
  title: column.text,
  description: column.text,
  inspection_type: column.text,
  status: column.text,
  ai_analysis: column.text, // JSON
  ai_findings: column.text, // JSON array
  ai_overall_score: column.integer,
  reviewed_by_id: column.text,
  reviewed_at: column.text,
  review_notes: column.text,
  created_by_id: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const compliance_documents = new Table({
  organization_id: column.text,
  document_type: column.text,
  name: column.text,
  license_number: column.text,
  issuing_authority: column.text,
  state: column.text,
  issue_date: column.text,
  expiration_date: column.text,
  status: column.text,
  created_at: column.text,
  updated_at: column.text,
});

export const powersyncSchema = new Schema({
  projects,
  project_members,
  daily_logs,
  workforce_entries,
  equipment_entries,
  work_completed_entries,
  material_entries,
  delay_entries,
  safety_entries,
  weather_entries,
  tasks,
  voice_notes,
  communications,
  inspections,
  compliance_documents,
});
