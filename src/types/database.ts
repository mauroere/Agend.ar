export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type AppointmentsRow = {
  id: string;
  tenant_id: string;
  location_id: string;
  patient_id: string;
  start_at: string;
  end_at: string;
  status: string;
  service_id: string | null;
  provider_id: string | null;
  service_name: string | null;
  service_snapshot: Json | null;
  internal_notes: string | null;
  external_calendar_id?: string | null; // Added
  external_calendar_provider?: string | null; // Added
  created_by: string | null;
  updated_at: string;
};

type AppointmentsInsert = {
  id?: string;
  tenant_id: string;
  location_id: string;
  patient_id: string;
  start_at: string;
  end_at: string;
  status: string;
  service_id?: string | null;
  provider_id?: string | null;
  service_name?: string | null;
  service_snapshot?: Json | null;
  internal_notes?: string | null;
  external_calendar_id?: string | null; // Added
  external_calendar_provider?: string | null; // Added
  created_by?: string | null;
  updated_at?: string;
};

type AppointmentsUpdate = Partial<AppointmentsRow>;

type ServicesRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_minor_units: number | null;
  currency: string;
  color: string | null;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  category_id?: string | null; // Added
  created_at: string;
  updated_at: string;
};

type ServicesInsert = {
  id?: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  duration_minutes?: number;
  price_minor_units?: number | null;
  currency?: string;
  color?: string | null;
  image_url?: string | null;
  active?: boolean;
  sort_order?: number;
  category_id?: string | null; // Added
  created_at?: string;
  updated_at?: string;
};

type ServicesUpdate = Partial<ServicesRow>;

type ProvidersRow = {
  id: string;
  tenant_id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  color: string | null;
  default_location_id: string | null;
  active: boolean;
  specialties: string[];
  metadata: Json;
  user_id?: string | null; // Added
  created_at: string;
  updated_at: string;
};

type ProvidersInsert = {
  id?: string;
  tenant_id: string;
  full_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  color?: string | null;
  default_location_id?: string | null;
  active?: boolean;
  specialties?: string[];
  metadata?: Json;
  user_id?: string | null; // Added
  created_at?: string;
  updated_at?: string;
};

type ProvidersUpdate = Partial<ProvidersRow>;

type PatientsRow = {
  id: string;
  tenant_id: string;
  full_name: string;
  phone_e164: string;
  email?: string | null; // Added
  opt_out: boolean;
  opt_out_at: string | null;
  notes: string | null;
  created_at: string;
};

type PatientsInsert = {
  id?: string;
  tenant_id: string;
  full_name: string;
  phone_e164: string;
  email?: string | null; // Added
  opt_out?: boolean;
  opt_out_at?: string | null;
  notes?: string | null;
  created_at?: string;
};

type PatientsUpdate = Partial<PatientsRow>;

type LocationsRow = {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  timezone: string;
  business_hours: Json;
  default_duration: number;
  buffer_minutes: number;
};

type LocationsInsert = {
  id?: string;
  tenant_id: string;
  name: string;
  timezone: string;
  business_hours: Json;
  address?: string | null;
  default_duration?: number;
  buffer_minutes?: number;
};

type LocationsUpdate = Partial<LocationsRow>;

type MessageLogRow = {
  id: string;
  tenant_id: string;
  appointment_id: string | null;
  patient_id: string;
  direction: string;
  type: string | null;
  status: string;
  wa_message_id: string | null;
  payload_json: Json;
  created_at: string;
};

type MessageLogInsert = {
  id?: string;
  tenant_id: string;
  patient_id: string;
  direction: string;
  status: string;
  appointment_id?: string | null;
  type?: string | null;
  wa_message_id?: string | null;
  payload_json?: Json;
  created_at?: string;
};

type MessageLogUpdate = Partial<MessageLogRow>;

type MessageTemplatesRow = {
  id: string;
  tenant_id: string;
  name: string;
  language: string;
  content: string;
  meta_template_name: string | null;
  status: string;
};

type MessageTemplatesInsert = {
  id?: string;
  tenant_id: string;
  name: string;
  language?: string;
  content: string;
  meta_template_name?: string | null;
  status?: string;
};

type MessageTemplatesUpdate = Partial<MessageTemplatesRow>;

type WaitlistRow = {
  id: string;
  tenant_id: string;
  location_id: string;
  patient_id: string;
  active: boolean;
  preferred_windows: Json | null;
  priority: number;
  created_at: string;
};

type WaitlistInsert = {
  id?: string;
  tenant_id: string;
  location_id: string;
  patient_id: string;
  active?: boolean;
  preferred_windows?: Json | null;
  priority?: number;
  created_at?: string;
};

type WaitlistUpdate = Partial<WaitlistRow>;

type TenantsRow = {
  id: string;
  name: string;
  created_at: string;
  public_slug: string | null;
  custom_domain: string | null;
  public_metadata: Json;
};

type TenantsInsert = {
  id?: string;
  name: string;
  created_at?: string;
  public_slug?: string | null;
  custom_domain?: string | null;
  public_metadata?: Json;
};

type TenantsUpdate = Partial<TenantsRow>;

type UsersRow = {
  id: string;
  tenant_id: string;
  role: "owner" | "staff";
  is_platform_admin?: boolean; // Added
  created_at: string;
};

type UsersInsert = {
  id?: string;
  tenant_id: string;
  role: "owner" | "staff";
  is_platform_admin?: boolean; // Added
  created_at?: string;
};

type UsersUpdate = Partial<UsersRow>;

type IntegrationsRow = {
  id: string;
  tenant_id: string;
  provider: string;
  credentials: Json;
  enabled: boolean; // Added
  created_at: string;
  updated_at: string;
};

type IntegrationsInsert = {
  id?: string;
  tenant_id: string;
  provider: string;
  credentials: Json;
  enabled?: boolean; // Added
  created_at?: string;
  updated_at?: string;
};

type IntegrationsUpdate = Partial<IntegrationsRow>;

type MedicalRecordsRow = {
  id: string;
  tenant_id: string;
  appointment_id: string;
  patient_id: string;
  provider_id: string | null;
  anamnesis: string | null;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type MedicalRecordsInsert = {
  id?: string;
  tenant_id: string;
  appointment_id: string;
  patient_id: string;
  provider_id?: string | null;
  anamnesis?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

type MedicalRecordsUpdate = Partial<MedicalRecordsRow>;

type MedicalAttachmentsRow = {
  id: string;
  record_id: string;
  file_url: string;
  file_type: string | null;
  file_name: string | null;
  created_at: string;
};

type MedicalAttachmentsInsert = {
  id?: string;
  record_id: string;
  file_url: string;
  file_type?: string | null;
  file_name?: string | null;
  created_at?: string;
};

type MedicalAttachmentsUpdate = Partial<MedicalAttachmentsRow>;

type ServiceCategoriesRow = {
  id: string;
  tenant_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

type ServiceCategoriesInsert = {
  id?: string;
  tenant_id: string;
  name: string;
  color?: string | null;
  sort_order?: number;
  active?: boolean;
  created_at?: string;
};

type ServiceCategoriesUpdate = Partial<ServiceCategoriesRow>;

type ChatSessionsRow = {
  id: string;
  tenant_id: string;
  phone_number: string;
  step: string;
  data: Json | null;
  created_at: string | null;
  updated_at: string | null;
};

type ChatSessionsInsert = {
  id?: string;
  tenant_id: string;
  phone_number: string;
  step?: string;
  data?: Json | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ChatSessionsUpdate = Partial<ChatSessionsRow>;

export interface Database {
  public: {
    Tables: {
      agenda_service_categories: {
        Row: ServiceCategoriesRow;
        Insert: ServiceCategoriesInsert;
        Update: ServiceCategoriesUpdate;
        Relationships: [];
      };
      agenda_locations: {
        Row: LocationsRow;
        Insert: LocationsInsert;
        Update: LocationsUpdate;
        Relationships: [];
      };
      agenda_message_log: {
        Row: MessageLogRow;
        Insert: MessageLogInsert;
        Update: MessageLogUpdate;
        Relationships: [];
      };
      agenda_services: {
        Row: ServicesRow;
        Insert: ServicesInsert;
        Update: ServicesUpdate;
        Relationships: [];
      };
      agenda_providers: {
        Row: ProvidersRow;
        Insert: ProvidersInsert;
        Update: ProvidersUpdate;
        Relationships: [];
      };
      agenda_message_templates: {
        Row: MessageTemplatesRow;
        Insert: MessageTemplatesInsert;
        Update: MessageTemplatesUpdate;
        Relationships: [];
      };
      agenda_waitlist: {
        Row: WaitlistRow;
        Insert: WaitlistInsert;
        Update: WaitlistUpdate;
        Relationships: [];
      };
      agenda_tenants: {
        Row: TenantsRow;
        Insert: TenantsInsert;
        Update: TenantsUpdate;
        Relationships: [];
      };
      agenda_users: {
        Row: UsersRow;
        Insert: UsersInsert;
        Update: UsersUpdate;
        Relationships: [];
      };
      agenda_integrations: {
        Row: IntegrationsRow;
        Insert: IntegrationsInsert;
        Update: IntegrationsUpdate;
        Relationships: [];
      };
      agenda_medical_records: {
        Row: MedicalRecordsRow;
        Insert: MedicalRecordsInsert;
        Update: MedicalRecordsUpdate;
        Relationships: [];
      };
      agenda_medical_attachments: {
        Row: MedicalAttachmentsRow;
        Insert: MedicalAttachmentsInsert;
        Update: MedicalAttachmentsUpdate;
        Relationships: [];
      };
      agenda_patients: {
        Row: PatientsRow;
        Insert: PatientsInsert;
        Update: PatientsUpdate;
        Relationships: [];
      };
      agenda_appointments: {
        Row: AppointmentsRow;
        Insert: AppointmentsInsert;
        Update: AppointmentsUpdate;
        Relationships: [];
      };
      agenda_chat_sessions: {
        Row: ChatSessionsRow;
        Insert: ChatSessionsInsert;
        Update: ChatSessionsUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
