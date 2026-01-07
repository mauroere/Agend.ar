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
  created_at?: string;
  updated_at?: string;
};

type ProvidersUpdate = Partial<ProvidersRow>;

type PatientsRow = {
  id: string;
  tenant_id: string;
  full_name: string;
  phone_e164: string;
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
};

type TenantsInsert = {
  id?: string;
  name: string;
  created_at?: string;
};

type TenantsUpdate = Partial<TenantsRow>;

type UsersRow = {
  id: string;
  tenant_id: string;
  role: "owner" | "staff";
  created_at: string;
};

type UsersInsert = {
  id?: string;
  tenant_id: string;
  role: "owner" | "staff";
  created_at?: string;
};

type UsersUpdate = Partial<UsersRow>;

type IntegrationsRow = {
  id: string;
  tenant_id: string;
  provider: string;
  credentials: Json;
  created_at: string;
  updated_at: string;
};

type IntegrationsInsert = {
  id?: string;
  tenant_id: string;
  provider: string;
  credentials: Json;
  created_at?: string;
  updated_at?: string;
};

type IntegrationsUpdate = Partial<IntegrationsRow>;

export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: AppointmentsRow;
        Insert: AppointmentsInsert;
        Update: AppointmentsUpdate;
        Relationships: [];
      };
      patients: {
        Row: PatientsRow;
        Insert: PatientsInsert;
        Update: PatientsUpdate;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
