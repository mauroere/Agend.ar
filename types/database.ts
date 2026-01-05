export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string;
          tenant_id: string;
          location_id: string;
          patient_id: string;
          start_at: string;
          end_at: string;
          status: string;
          service_name: string | null;
          internal_notes: string | null;
          created_by: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["appointments"]["Row"]> & {
          tenant_id: string;
          location_id: string;
          patient_id: string;
          start_at: string;
          end_at: string;
          status: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Row"]>;
      };
      patients: {
        Row: {
          id: string;
          tenant_id: string;
          full_name: string;
          phone_e164: string;
          opt_out: boolean;
          opt_out_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["patients"]["Row"]> & {
          tenant_id: string;
          full_name: string;
          phone_e164: string;
        };
        Update: Partial<Database["public"]["Tables"]["patients"]["Row"]>;
      };
      locations: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          address: string | null;
          timezone: string;
          business_hours: Json;
          default_duration: number;
          buffer_minutes: number;
        };
        Insert: Partial<Database["public"]["Tables"]["locations"]["Row"]> & {
          tenant_id: string;
          name: string;
          timezone: string;
          business_hours: Json;
        };
        Update: Partial<Database["public"]["Tables"]["locations"]["Row"]>;
      };
      message_log: {
        Row: {
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
        Insert: Partial<Database["public"]["Tables"]["message_log"]["Row"]> & {
          tenant_id: string;
          patient_id: string;
          direction: string;
          status: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_log"]["Row"]>;
      };
      waitlist: {
        Row: {
          id: string;
          tenant_id: string;
          location_id: string;
          patient_id: string;
          active: boolean;
          preferred_windows: Json | null;
          priority: number;
          created_at: string;
        };
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
      };
      users: {
        Row: {
          id: string;
          tenant_id: string;
          role: "owner" | "staff";
          created_at: string;
        };
      };
    };
  };
}
