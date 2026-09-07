// Hand-written to match the LIVE schema, confirmed 2026-08-24 by directly
// querying the gnifmusartvwngcuquou project's REST API (no `supabase` CLI
// available in this environment to run `supabase gen types` — see the app
// README/PR notes). Columns here are exactly what's live, not what any
// individual migration file claims in isolation; committed migrations in
// this repo have repeatedly lagged what's actually applied (e.g. 0002's
// auth_uid-linking trigger is written but NOT live — see auth.ts).
//
// Regenerate for real once the Supabase CLI is available:
//   supabase gen types typescript --project-id gnifmusartvwngcuquou > src/lib/database.types.ts

export type SiteMemberRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  travel_style: string | null;
  plan: string;
  status: string;
  source: string;
  invitation_code: string | null;
  trial_ends_at: string | null;
  member_until: string | null;
  amount_paise: number | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  updated_at: string;
  auth_uid: string | null;
};

// kind/status widened per migrations 0004 + 0005 on top of 0001's original set.
export type SavedItemKind =
  | "hotel"
  | "event"
  | "experience"
  | "city"
  | "flight"
  | "visa"
  | "note"
  | "journey"
  | "window";

export type SavedItemStatus =
  | "saved"
  | "shortlisted"
  | "enquired"
  | "booked"
  | "travelling"
  | "home";

export type SiteSavedItemRow = {
  id: string;
  member_id: string;
  kind: SavedItemKind;
  ref: string;
  title: string;
  city: string | null;
  city_label: string | null;
  when_start: string | null;
  when_end: string | null;
  meta: Record<string, unknown>;
  status: SavedItemStatus;
  created_at: string;
  updated_at: string;
};

export type SiteSavedItemInsert = Omit<
  SiteSavedItemRow,
  "id" | "created_at" | "updated_at" | "meta" | "status"
> & {
  meta?: Record<string, unknown>;
  status?: SavedItemStatus;
};

export type SiteMemberEventRow = {
  id: number;
  member_id: string | null;
  verb: string;
  target: string | null;
  city: string | null;
  props: Record<string, unknown>;
  at: string;
};

export type SiteMemberPrefsRow = {
  member_id: string;
  profile: Record<string, unknown>;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      site_members: {
        Row: SiteMemberRow;
        Insert: Partial<SiteMemberRow>;
        Update: Partial<SiteMemberRow>;
        Relationships: [];
      };
      site_saved_items: {
        Row: SiteSavedItemRow;
        Insert: SiteSavedItemInsert;
        Update: Partial<SiteSavedItemRow>;
        Relationships: [];
      };
      site_member_events: {
        Row: SiteMemberEventRow;
        Insert: Omit<SiteMemberEventRow, "id" | "at"> & { at?: string };
        Update: Partial<SiteMemberEventRow>;
        Relationships: [];
      };
      site_member_prefs: {
        Row: SiteMemberPrefsRow;
        Insert: SiteMemberPrefsRow;
        Update: Partial<SiteMemberPrefsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
