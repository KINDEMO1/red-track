export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          student_id: string
          phone: string | null
          department: string | null
          year: string | null
          status: "active" | "suspended" | "pending"
          role: "student" | "admin"
          created_at: string
          updated_at: string
          medical_certificate_status: "approved" | "pending" | "rejected" | null
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          phone?: string | null
          department?: string | null
          year?: string | null
          status?: "active" | "suspended" | "pending"
          role?: "student" | "admin"
          medical_certificate_status?: "approved" | "pending" | "rejected" | null
        }
        Update: {
          full_name?: string
          phone?: string | null
          department?: string | null
          year?: string | null
          status?: "active" | "suspended" | "pending"
          medical_certificate_status?: "approved" | "pending" | "rejected" | null
        }
      }
      medical_certificates: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_type: string
          file_url: string
          upload_date: string
          status: "pending" | "approved" | "rejected"
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_type: string
          file_url: string
          upload_date?: string
          status?: "pending" | "approved" | "rejected"
          notes?: string | null
        }
        Update: {
          status?: "pending" | "approved" | "rejected"
          notes?: string | null
        }
      }
      bicycles: {
        Row: {
          id: string
          name: string
          type: string
          location: string
          is_available: boolean
          image_url: string | null
          last_maintenance: string | null
          next_maintenance: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          location: string
          is_available?: boolean
          image_url?: string | null
          last_maintenance?: string | null
          next_maintenance?: string | null
          notes?: string | null
        }
        Update: {
          name?: string
          type?: string
          location?: string
          is_available?: boolean
          image_url?: string | null
          last_maintenance?: string | null
          next_maintenance?: string | null
          notes?: string | null
        }
      }
      borrowings: {
        Row: {
          id: string
          bicycle_id: string
          user_id: string
          borrow_date: string
          expected_return_date: string
          return_date: string | null
          status: "active" | "returned" | "overdue"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bicycle_id: string
          user_id: string
          borrow_date?: string
          expected_return_date: string
          return_date?: string | null
          status?: "active" | "returned" | "overdue"
        }
        Update: {
          return_date?: string | null
          status?: "active" | "returned" | "overdue"
        }
      }
    }
  }
}
