/**
 * Database types — hand-authored for the core tables used by the foundation
 * app so the project type-checks out of the box. After you apply the SQL
 * migrations to your Supabase project, REGENERATE the full, authoritative
 * types with:   npm run db:types
 * (supabase gen types typescript --linked > src/lib/database.types.ts)
 */

type Timestamp = string;
type UUID = string;

export type StudentStatus = "enrolled" | "transferred" | "withdrawn" | "graduated" | "archived";
export type AttendanceStatus = "present" | "absent" | "excused" | "late" | "medical";
export type Gender = "male" | "female";

interface Table<Row, Insert = Partial<Row>, Update = Partial<Row>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

/**
 * Permissive table type for the modules whose columns aren't hand-modelled
 * here. They compile against the typed client today; run `npm run db:types`
 * after applying the migrations to replace this whole file with precise,
 * generated types for every column.
 */
type Loose = Table<Record<string, any>>;

export interface Database {
  public: {
    Tables: {
      schools: Table<{
        id: UUID;
        name_ar: string;
        name_en: string | null;
        slug: string;
        logo_url: string | null;
        stamp_url: string | null;
        signature_url: string | null;
        slogan_ar: string | null;
        theme: Record<string, string> | null;
        calendar: "gregorian" | "hijri";
        created_at: Timestamp;
      }>;
      profiles: Table<{
        id: UUID;
        school_id: UUID | null;
        email: string | null;
        full_name: string | null;
        role: string;
        avatar_url: string | null;
        must_change_password: boolean;
        created_at: Timestamp;
      }>;
      academic_years: Table<{
        id: UUID;
        school_id: UUID;
        name: string;
        start_date: string;
        end_date: string;
        is_current: boolean;
      }>;
      school_stages: Table<{
        id: UUID;
        school_id: UUID;
        name_ar: string;
        name_en: string | null;
        sort_order: number;
      }>;
      grade_levels: Table<{
        id: UUID;
        school_id: UUID;
        stage_id: UUID;
        name_ar: string;
        name_en: string | null;
        sort_order: number;
      }>;
      departments: Table<{
        id: UUID;
        school_id: UUID;
        name_ar: string;
        name_en: string | null;
        head_id: UUID | null;
      }>;
      classes: Table<{
        id: UUID;
        school_id: UUID;
        academic_year_id: UUID;
        grade_level_id: UUID;
        name: string;
        capacity: number;
        class_teacher_id: UUID | null;
        student_count: number;
        status: "active" | "archived";
        created_at: Timestamp;
      }>;
      subjects: Table<{
        id: UUID;
        school_id: UUID;
        department_id: UUID | null;
        name_ar: string;
        name_en: string | null;
        code: string;
        weekly_periods: number;
      }>;
      students: Table<{
        id: UUID;
        school_id: UUID;
        student_no: string | null;
        ministry_no: string | null;
        civil_id: string | null;
        name_ar: string;
        name_en: string | null;
        gender: Gender;
        dob: string | null;
        nationality: string | null;
        religion: string | null;
        address: string | null;
        medical_notes: string | null;
        enrollment_date: string | null;
        status: StudentStatus;
        emergency_contact: string | null;
        father_name: string | null;
        mother_name: string | null;
        guardian_name: string | null;
        guardian_mobile: string | null;
        guardian_email: string | null;
        guardian_occupation: string | null;
        current_class_id: UUID | null;
        photo_url: string | null;
        created_at: Timestamp;
      }>;
      staff: Table<{
        id: UUID;
        school_id: UUID;
        profile_id: UUID | null;
        employee_no: string | null;
        civil_id: string | null;
        name_ar: string;
        name_en: string | null;
        department_id: UUID | null;
        position: string | null;
        qualifications: string | null;
        experience_years: number | null;
        email: string | null;
        mobile: string | null;
        hire_date: string | null;
        status: "active" | "inactive";
      }>;
      attendance_records: Table<{
        id: UUID;
        school_id: UUID;
        student_id: UUID;
        class_id: UUID;
        date: string;
        status: AttendanceStatus;
        note: string | null;
        recorded_by: UUID | null;
        created_at: Timestamp;
      }>;
      assessment_types: Table<{
        id: UUID;
        school_id: UUID;
        name_ar: string;
        name_en: string | null;
        weight: number;
        max_score: number;
      }>;
      assessments: Table<{
        id: UUID;
        school_id: UUID;
        class_id: UUID;
        subject_id: UUID;
        assessment_type_id: UUID;
        title: string;
        max_score: number;
        date: string | null;
      }>;
      grades: Table<{
        id: UUID;
        school_id: UUID;
        assessment_id: UUID;
        student_id: UUID;
        score: number | null;
        note: string | null;
      }>;
      behavior_records: Table<{
        id: UUID;
        school_id: UUID;
        student_id: UUID;
        kind: "positive" | "negative";
        category: string;
        description: string | null;
        action_taken: string | null;
        recorded_by: UUID | null;
        date: string;
      }>;
      audit_logs: Table<{
        id: number;
        school_id: UUID | null;
        user_id: UUID | null;
        user_email: string | null;
        action: string;
        entity: string | null;
        entity_id: string | null;
        meta: Record<string, unknown> | null;
        created_at: Timestamp;
      }>;
      // RBAC + reference
      roles: Loose;
      permissions: Loose;
      role_permissions: Loose;
      // Academic structure / assignments
      teaching_assignments: Loose;
      grade_scales: Loose;
      // People relations
      guardians: Loose;
      student_guardians: Loose;
      student_enrollments: Loose;
      // Assessment artifacts
      report_cards: Loose;
      // Islamic studies
      quran_surahs: Loose;
      quran_memorization: Loose;
      quran_revisions: Loose;
      // Curriculum coverage
      curriculum_plans: Loose;
      curriculum_units: Loose;
      curriculum_lessons: Loose;
      curriculum_coverage: Loose;
      // Timetable
      rooms: Loose;
      periods: Loose;
      timetable_slots: Loose;
      // Activities
      activities: Loose;
      activity_participants: Loose;
      activity_attendance: Loose;
      // Observations
      observations: Loose;
      observation_items: Loose;
      // Admin / communication
      report_templates: Loose;
      announcements: Loose;
      notifications: Loose;
      message_log: Loose;
      // Finance
      fee_structures: Loose;
      invoices: Loose;
      invoice_items: Loose;
      installments: Loose;
      payments: Loose;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
