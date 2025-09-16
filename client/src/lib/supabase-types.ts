// Supabase Database Types
// Generated from database schema for direct API calls

export interface Database {
  public: {
    Tables: {
      // User and Authentication Tables
      app_users: {
        Row: {
          id: number
          username: string
          name: string
          email: string
          password_hash: string
          role: string
          school_id: number | null
          student_id: number | null
          credits: number
          is_active: boolean
          is_admin: boolean
          last_login: string | null
          profile_picture: string | null
          phone_number: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          username: string
          name: string
          email: string
          password_hash: string
          role?: string
          school_id?: number | null
          student_id?: number | null
          credits?: number
          is_active?: boolean
          is_admin?: boolean
          profile_picture?: string | null
          phone_number?: string | null
        }
        Update: {
          username?: string
          name?: string
          email?: string
          password_hash?: string
          role?: string
          school_id?: number | null
          student_id?: number | null
          credits?: number
          is_active?: boolean
          is_admin?: boolean
          last_login?: string | null
          profile_picture?: string | null
          phone_number?: string | null
          updated_at?: string | null
        }
      }

      // School Tables
      schools: {
        Row: {
          id: number
          name: string
          address: string | null
          phone: string | null
          email: string | null
          website: string | null
          principal_name: string | null
          established_year: number | null
          created_at: string
        }
        Insert: {
          name: string
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          principal_name?: string | null
          established_year?: number | null
        }
        Update: {
          name?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          principal_name?: string | null
          established_year?: number | null
        }
      }

      // Student Tables
      students: {
        Row: {
          id: number
          name: string
          name_in_bangla: string | null
          student_id: string
          class: string | null
          section: string | null
          roll_number: string | null
          date_of_birth: string | null
          gender: string | null
          blood_group: string | null
          father_name: string | null
          father_name_in_bangla: string | null
          mother_name: string | null
          mother_name_in_bangla: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relation: string | null
          present_address: string | null
          permanent_address: string | null
          village: string | null
          post_office: string | null
          thana: string | null
          district: string | null
          division: string | null
          phone: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_relation: string | null
          emergency_contact_phone: string | null
          school_id: number | null
          status: string | null
          photo: string | null
          id_card_issue_date: string | null
          id_card_valid_until: string | null
          created_at: string
        }
        Insert: {
          name: string
          name_in_bangla?: string | null
          student_id: string
          class?: string | null
          section?: string | null
          roll_number?: string | null
          date_of_birth?: string | null
          gender?: string | null
          blood_group?: string | null
          father_name?: string | null
          father_name_in_bangla?: string | null
          mother_name?: string | null
          mother_name_in_bangla?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relation?: string | null
          present_address?: string | null
          permanent_address?: string | null
          village?: string | null
          post_office?: string | null
          thana?: string | null
          district?: string | null
          division?: string | null
          phone?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relation?: string | null
          emergency_contact_phone?: string | null
          school_id?: number | null
          status?: string | null
          photo?: string | null
          id_card_issue_date?: string | null
          id_card_valid_until?: string | null
        }
        Update: {
          name?: string
          name_in_bangla?: string | null
          student_id?: string
          class?: string | null
          section?: string | null
          roll_number?: string | null
          date_of_birth?: string | null
          gender?: string | null
          blood_group?: string | null
          father_name?: string | null
          father_name_in_bangla?: string | null
          mother_name?: string | null
          mother_name_in_bangla?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relation?: string | null
          present_address?: string | null
          permanent_address?: string | null
          village?: string | null
          post_office?: string | null
          thana?: string | null
          district?: string | null
          division?: string | null
          phone?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relation?: string | null
          emergency_contact_phone?: string | null
          school_id?: number | null
          status?: string | null
          photo?: string | null
          id_card_issue_date?: string | null
          id_card_valid_until?: string | null
        }
      }

      // Teacher Tables  
      teachers: {
        Row: {
          id: number
          teacher_id: string
          name: string
          name_in_bangla: string | null
          designation: string | null
          qualification: string | null
          subject: string | null
          phone: string | null
          email: string | null
          date_of_birth: string | null
          gender: string | null
          blood_group: string | null
          present_address: string | null
          permanent_address: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          join_date: string | null
          salary: string | null
          status: string | null
          photo: string | null
          school_id: number | null
          created_at: string
        }
        Insert: {
          teacher_id: string
          name: string
          name_in_bangla?: string | null
          designation?: string | null
          qualification?: string | null
          subject?: string | null
          phone?: string | null
          email?: string | null
          date_of_birth?: string | null
          gender?: string | null
          blood_group?: string | null
          present_address?: string | null
          permanent_address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          join_date?: string | null
          salary?: string | null
          status?: string | null
          photo?: string | null
          school_id?: number | null
        }
        Update: Partial<{
          teacher_id: string
          name: string
          name_in_bangla: string | null
          designation: string | null
          qualification: string | null
          subject: string | null
          phone: string | null
          email: string | null
          date_of_birth: string | null
          gender: string | null
          blood_group: string | null
          present_address: string | null
          permanent_address: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          join_date: string | null
          salary: string | null
          status: string | null
          photo: string | null
          school_id: number | null
        }>
      }

      // Academic Tables
      academic_years: {
        Row: {
          id: number
          name: string
          name_bn: string | null
          start_date: string
          end_date: string
          is_active: boolean | null
          is_current: boolean | null
          description: string | null
          description_bn: string | null
          total_students: number | null
          total_classes: number | null
          total_terms: number | null
          status: string | null
          school_id: number
          created_at: string
        }
        Insert: {
          name: string
          name_bn?: string | null
          start_date: string
          end_date: string
          is_active?: boolean | null
          is_current?: boolean | null
          description?: string | null
          description_bn?: string | null
          total_students?: number | null
          total_classes?: number | null
          total_terms?: number | null
          status?: string | null
          school_id?: number
        }
        Update: Partial<{
          name: string
          name_bn: string | null
          start_date: string
          end_date: string
          is_active: boolean | null
          is_current: boolean | null
          description: string | null
          description_bn: string | null
          total_students: number | null
          total_classes: number | null
          total_terms: number | null
          status: string | null
          school_id: number
        }>
      }

      academic_terms: {
        Row: {
          id: number
          name: string
          name_bn: string
          academic_year_id: number
          start_date: string
          end_date: string
          is_active: boolean | null
          description: string | null
          description_bn: string | null
          exam_scheduled: boolean | null
          result_published: boolean | null
          status: string
          school_id: number
          created_at: string
        }
        Insert: {
          name: string
          name_bn: string
          academic_year_id: number
          start_date: string
          end_date: string
          is_active?: boolean | null
          description?: string | null
          description_bn?: string | null
          exam_scheduled?: boolean | null
          result_published?: boolean | null
          status?: string
          school_id?: number
        }
        Update: Partial<{
          name: string
          name_bn: string
          academic_year_id: number
          start_date: string
          end_date: string
          is_active: boolean | null
          description: string | null
          description_bn: string | null
          exam_scheduled: boolean | null
          result_published: boolean | null
          status: string
          school_id: number
        }>
      }

      // Document and Template Tables
      document_templates: {
        Row: {
          id: number
          name: string
          name_bn: string
          type: string
          category: string
          category_bn: string
          description: string
          description_bn: string
          template: any | null
          preview: string | null
          is_global: boolean | null
          is_default: boolean | null
          is_favorite: boolean | null
          thumbnail_color: string | null
          settings: any | null
          tags: string[] | null
          required_credits: number | null
          is_active: boolean | null
          version: string | null
          created_by: string
          created_at: string
          updated_at: string | null
          icon: string | null
          difficulty: string | null
          estimated_time: string | null
          is_popular: boolean | null
          usage_count: number | null
          last_used: string | null
          school_id: number
        }
        Insert: {
          name: string
          name_bn: string
          type: string
          category: string
          category_bn: string
          description: string
          description_bn: string
          template?: any | null
          preview?: string | null
          is_global?: boolean | null
          is_default?: boolean | null
          is_favorite?: boolean | null
          thumbnail_color?: string | null
          settings?: any | null
          tags?: string[] | null
          required_credits?: number | null
          is_active?: boolean | null
          version?: string | null
          created_by: string
          icon?: string | null
          difficulty?: string | null
          estimated_time?: string | null
          is_popular?: boolean | null
          usage_count?: number | null
          last_used?: string | null
          school_id?: number
        }
        Update: Partial<{
          name: string
          name_bn: string
          type: string
          category: string
          category_bn: string
          description: string
          description_bn: string
          template: any | null
          preview: string | null
          is_global: boolean | null
          is_default: boolean | null
          is_favorite: boolean | null
          thumbnail_color: string | null
          settings: any | null
          tags: string[] | null
          required_credits: number | null
          is_active: boolean | null
          version: string | null
          created_by: string
          updated_at: string | null
          icon: string | null
          difficulty: string | null
          estimated_time: string | null
          is_popular: boolean | null
          usage_count: number | null
          last_used: string | null
          school_id: number
        }>
      }

      // Library Tables
      library_books: {
        Row: {
          id: number
          title: string
          title_bn: string
          author: string
          isbn: string | null
          category: string
          publisher: string | null
          publish_year: number | null
          total_copies: number
          available_copies: number
          location: string
          description: string | null
          school_id: number
          created_at: string
        }
        Insert: {
          title: string
          title_bn: string
          author: string
          isbn?: string | null
          category: string
          publisher?: string | null
          publish_year?: number | null
          total_copies?: number
          available_copies?: number
          location: string
          description?: string | null
          school_id?: number
        }
        Update: Partial<{
          title: string
          title_bn: string
          author: string
          isbn: string | null
          category: string
          publisher: string | null
          publish_year: number | null
          total_copies: number
          available_copies: number
          location: string
          description: string | null
          school_id: number
        }>
      }

      // Inventory Tables
      inventory_items: {
        Row: {
          id: number
          name: string
          name_bn: string
          category: string
          subcategory: string | null
          brand: string | null
          model: string | null
          serial_number: string | null
          unit_price: string | null
          current_quantity: number
          minimum_threshold: number
          unit: string
          supplier: string | null
          location: string
          condition: string
          description: string | null
          school_id: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          name: string
          name_bn: string
          category: string
          subcategory?: string | null
          brand?: string | null
          model?: string | null
          serial_number?: string | null
          unit_price?: string | null
          current_quantity?: number
          minimum_threshold?: number
          unit: string
          supplier?: string | null
          location: string
          condition: string
          description?: string | null
          school_id?: number
        }
        Update: Partial<{
          name: string
          name_bn: string
          category: string
          subcategory: string | null
          brand: string | null
          model: string | null
          serial_number: string | null
          unit_price: string | null
          current_quantity: number
          minimum_threshold: number
          unit: string
          supplier: string | null
          location: string
          condition: string
          description: string | null
          school_id: number
          updated_at: string | null
        }>
      }

      // Transport Tables
      transport_routes: {
        Row: {
          id: number
          route_name: string
          pickup_points: string | null
          timings: string | null
          monthly_fee: string
          school_id: number | null
          created_at: string
        }
        Insert: {
          route_name: string
          pickup_points?: string | null
          timings?: string | null
          monthly_fee: string
          school_id?: number | null
        }
        Update: Partial<{
          route_name: string
          pickup_points: string | null
          timings: string | null
          monthly_fee: string
          school_id: number | null
        }>
      }

      transport_vehicles: {
        Row: {
          id: number
          vehicle_number: string
          type: string
          capacity: number
          driver_name: string
          driver_phone: string
          helper_name: string | null
          helper_phone: string | null
          route_id: number | null
          is_active: boolean | null
          school_id: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          vehicle_number: string
          type: string
          capacity: number
          driver_name: string
          driver_phone: string
          helper_name?: string | null
          helper_phone?: string | null
          route_id?: number | null
          is_active?: boolean | null
          school_id?: number
        }
        Update: Partial<{
          vehicle_number: string
          type: string
          capacity: number
          driver_name: string
          driver_phone: string
          helper_name: string | null
          helper_phone: string | null
          route_id: number | null
          is_active: boolean | null
          school_id: number
          updated_at: string | null
        }>
      }

      // Notification Tables
      notifications: {
        Row: {
          id: number
          title: string
          title_bn: string
          message: string
          message_bn: string
          type: string | null
          priority: string | null
          category: string
          category_bn: string
          recipient_id: number | null
          recipient_type: string
          sender: string | null
          is_read: boolean | null
          is_live: boolean | null
          is_active: boolean | null
          is_public: boolean | null
          action_required: boolean | null
          read_at: string | null
          school_id: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          title: string
          title_bn: string
          message: string
          message_bn: string
          type?: string | null
          priority?: string | null
          category: string
          category_bn: string
          recipient_id?: number | null
          recipient_type?: string
          sender?: string | null
          is_read?: boolean | null
          is_live?: boolean | null
          is_active?: boolean | null
          is_public?: boolean | null
          action_required?: boolean | null
          read_at?: string | null
          school_id?: number
        }
        Update: Partial<{
          title: string
          title_bn: string
          message: string
          message_bn: string
          type: string | null
          priority: string | null
          category: string
          category_bn: string
          recipient_id: number | null
          recipient_type: string
          sender: string | null
          is_read: boolean | null
          is_live: boolean | null
          is_active: boolean | null
          is_public: boolean | null
          action_required: boolean | null
          read_at: string | null
          school_id: number
          updated_at: string | null
        }>
      }

      // Calendar Tables
      calendar_events: {
        Row: {
          id: number
          title: string
          title_bn: string | null
          description: string | null
          description_bn: string | null
          start_date: string
          end_date: string | null
          start_time: string | null
          end_time: string | null
          type: string | null
          is_active: boolean | null
          is_public: boolean | null
          location: string | null
          organizer: string | null
          attendees: any | null
          school_id: number
          created_by: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          title: string
          title_bn?: string | null
          description?: string | null
          description_bn?: string | null
          start_date: string
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          type?: string | null
          is_active?: boolean | null
          is_public?: boolean | null
          location?: string | null
          organizer?: string | null
          attendees?: any | null
          school_id?: number
          created_by?: number | null
        }
        Update: Partial<{
          title: string
          title_bn: string | null
          description: string | null
          description_bn: string | null
          start_date: string
          end_date: string | null
          start_time: string | null
          end_time: string | null
          type: string | null
          is_active: boolean | null
          is_public: boolean | null
          location: string | null
          organizer: string | null
          attendees: any | null
          school_id: number
          created_by: number | null
          updated_at: string | null
        }>
      }

      // Payment Tables
      payment_transactions: {
        Row: {
          id: number
          transaction_id: string
          amount: string
          currency: string
          payment_method: string
          status: string
          payer_name: string
          payer_phone: string
          description: string
          description_bn: string
          student_id: number | null
          school_id: number
          created_at: string
          completed_at: string | null
        }
        Insert: {
          transaction_id: string
          amount: string
          currency?: string
          payment_method: string
          status?: string
          payer_name: string
          payer_phone: string
          description: string
          description_bn: string
          student_id?: number | null
          school_id?: number
        }
        Update: Partial<{
          transaction_id: string
          amount: string
          currency: string
          payment_method: string
          status: string
          payer_name: string
          payer_phone: string
          description: string
          description_bn: string
          student_id: number | null
          school_id: number
          completed_at: string | null
        }>
      }

      // Financial Tables
      financial_transactions: {
        Row: {
          id: number
          transaction_type: string
          category: string
          amount: string
          date: string
          description: string | null
          payment_method: string
          reference_number: string | null
          school_id: number
          created_by: number | null
          created_at: string
        }
        Insert: {
          transaction_type: string
          category: string
          amount: string
          date: string
          description?: string | null
          payment_method: string
          reference_number?: string | null
          school_id?: number
          created_by?: number | null
        }
        Update: Partial<{
          transaction_type: string
          category: string
          amount: string
          date: string
          description: string | null
          payment_method: string
          reference_number: string | null
          school_id: number
          created_by: number | null
        }>
      }

      // Staff Tables
      staff: {
        Row: {
          id: number
          staff_id: string
          name: string
          name_in_bangla: string | null
          designation: string | null
          department: string | null
          phone: string | null
          email: string | null
          date_of_birth: string | null
          gender: string | null
          blood_group: string | null
          present_address: string | null
          permanent_address: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          join_date: string | null
          salary: string | null
          status: string | null
          photo: string | null
          school_id: number | null
          created_at: string
        }
        Insert: {
          staff_id: string
          name: string
          name_in_bangla?: string | null
          designation?: string | null
          department?: string | null
          phone?: string | null
          email?: string | null
          date_of_birth?: string | null
          gender?: string | null
          blood_group?: string | null
          present_address?: string | null
          permanent_address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          join_date?: string | null
          salary?: string | null
          status?: string | null
          photo?: string | null
          school_id?: number | null
        }
        Update: Partial<{
          staff_id: string
          name: string
          name_in_bangla: string | null
          designation: string | null
          department: string | null
          phone: string | null
          email: string | null
          date_of_birth: string | null
          gender: string | null
          blood_group: string | null
          present_address: string | null
          permanent_address: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          join_date: string | null
          salary: string | null
          status: string | null
          photo: string | null
          school_id: number | null
        }>
      }

      // Parents Tables
      parents: {
        Row: {
          id: number
          name: string
          name_in_bangla: string | null
          father_name: string | null
          mother_name: string | null
          phone: string | null
          email: string | null
          address: string | null
          occupation: string | null
          relation: string | null
          emergency_contact: string | null
          school_id: number | null
          created_at: string
        }
        Insert: {
          name: string
          name_in_bangla?: string | null
          father_name?: string | null
          mother_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          occupation?: string | null
          relation?: string | null
          emergency_contact?: string | null
          school_id?: number | null
        }
        Update: Partial<{
          name: string
          name_in_bangla: string | null
          father_name: string | null
          mother_name: string | null
          phone: string | null
          email: string | null
          address: string | null
          occupation: string | null
          relation: string | null
          emergency_contact: string | null
          school_id: number | null
        }>
      }

      // Inventory Movements Tables
      inventory_movements: {
        Row: {
          id: number
          item_id: number
          type: string
          quantity: number
          reason: string | null
          reference_number: string | null
          created_by: number | null
          created_at: string
          school_id: number | null
        }
        Insert: {
          item_id: number
          type: string
          quantity: number
          reason?: string | null
          reference_number?: string | null
          created_by?: number | null
          school_id?: number | null
        }
        Update: Partial<{
          item_id: number
          type: string
          quantity: number
          reason: string | null
          reference_number: string | null
          created_by: number | null
          school_id: number | null
        }>
      }

      // Classes Table
      classes: {
        Row: {
          id: number
          name: string
          name_in_bangla: string | null
          capacity: number | null
          school_id: number | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          name: string
          name_in_bangla?: string | null
          capacity?: number | null
          school_id?: number | null
          is_active?: boolean | null
        }
        Update: Partial<{
          name: string
          name_in_bangla: string | null
          capacity: number | null
          school_id: number | null
          is_active: boolean | null
        }>
      }

      // Library Borrowed Books Table
      library_borrowed_books: {
        Row: {
          id: number
          book_id: number
          student_id: number
          borrow_date: string
          due_date: string
          return_date: string | null
          status: string
          fine: string | null
          notes: string | null
          school_id: number
          created_at: string
        }
        Insert: {
          book_id: number
          student_id: number
          borrow_date?: string
          due_date: string
          return_date?: string | null
          status?: string
          fine?: string | null
          notes?: string | null
          school_id?: number
        }
        Update: Partial<{
          book_id: number
          student_id: number
          borrow_date: string
          due_date: string
          return_date: string | null
          status: string
          fine: string | null
          notes: string | null
          school_id: number
        }>
      }

      // Video Conferences Table
      video_conferences: {
        Row: {
          id: number
          name: string
          name_bn: string
          subject: string
          host: string
          status: string
          start_time: string
          end_time: string | null
          participants: number | null
          max_participants: number | null
          meeting_id: string
          is_recording: boolean | null
          recording_url: string | null
          school_id: number
          created_at: string
        }
        Insert: {
          name: string
          name_bn: string
          subject: string
          host: string
          status?: string
          start_time: string
          end_time?: string | null
          participants?: number | null
          max_participants?: number | null
          meeting_id: string
          is_recording?: boolean | null
          recording_url?: string | null
          school_id?: number
        }
        Update: Partial<{
          name: string
          name_bn: string
          subject: string
          host: string
          status: string
          start_time: string
          end_time: string | null
          participants: number | null
          max_participants: number | null
          meeting_id: string
          is_recording: boolean | null
          recording_url: string | null
          school_id: number
        }>
      }

      // Student Import Batches Table
      student_import_batches: {
        Row: {
          id: number
          file_name: string
          file_size: number | null
          total_records: number
          successful_imports: number | null
          failed_imports: number | null
          status: string
          error_log: any | null
          uploaded_by: string | null
          school_id: number | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          total_records: number
          successful_imports?: number | null
          failed_imports?: number | null
          status?: string
          error_log?: any | null
          uploaded_by?: string | null
          school_id?: number | null
        }
        Update: Partial<{
          file_name: string
          file_size: number | null
          total_records: number
          successful_imports: number | null
          failed_imports: number | null
          status: string
          error_log: any | null
          uploaded_by: string | null
          school_id: number | null
          completed_at: string | null
        }>
      }

      // School Document Permissions Table
      school_document_permissions: {
        Row: {
          id: number
          school_id: number
          document_type_id: number
          is_allowed: boolean
          credits_per_use: number
          granted_at: string | null
          revoked_at: string | null
          granted_by: string | null
          notes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          school_id: number
          document_type_id: number
          is_allowed?: boolean
          credits_per_use?: number
          granted_at?: string | null
          revoked_at?: string | null
          granted_by?: string | null
          notes?: string | null
        }
        Update: Partial<{
          school_id: number
          document_type_id: number
          is_allowed: boolean
          credits_per_use: number
          granted_at: string | null
          revoked_at: string | null
          granted_by: string | null
          notes: string | null
          updated_at: string | null
        }>
      }

      // Transport Student Assignments Table
      transport_student_assignments: {
        Row: {
          id: number
          student_id: number
          route_id: number
          vehicle_id: number | null
          pickup_point: string
          drop_point: string
          monthly_fee: string
          is_active: boolean | null
          school_id: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          student_id: number
          route_id: number
          vehicle_id?: number | null
          pickup_point: string
          drop_point: string
          monthly_fee: string
          is_active?: boolean | null
          school_id?: number
        }
        Update: Partial<{
          student_id: number
          route_id: number
          vehicle_id: number | null
          pickup_point: string
          drop_point: string
          monthly_fee: string
          is_active: boolean | null
          school_id: number
          updated_at: string | null
        }>
      }

      // School Settings Table (comprehensive configuration)
      school_settings: {
        Row: {
          id: number
          school_id: number
          name: string
          name_in_bangla: string
          address: string
          address_in_bangla: string
          email: string
          phone: string
          website: string | null
          school_type: string
          establishment_year: number
          eiin: string | null
          registration_number: string | null
          principal_name: string | null
          principal_phone: string | null
          description: string | null
          description_in_bangla: string | null
          primary_color: string | null
          secondary_color: string | null
          accent_color: string | null
          motto: string | null
          motto_bn: string | null
          logo_url: string | null
          favicon_url: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          school_id?: number
          name: string
          name_in_bangla: string
          address: string
          address_in_bangla: string
          email: string
          phone: string
          website?: string | null
          school_type?: string
          establishment_year: number
          eiin?: string | null
          registration_number?: string | null
          principal_name?: string | null
          principal_phone?: string | null
          description?: string | null
          description_in_bangla?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          accent_color?: string | null
          motto?: string | null
          motto_bn?: string | null
          logo_url?: string | null
          favicon_url?: string | null
        }
        Update: Partial<{
          school_id: number
          name: string
          name_in_bangla: string
          address: string
          address_in_bangla: string
          email: string
          phone: string
          website: string | null
          school_type: string
          establishment_year: number
          eiin: string | null
          registration_number: string | null
          principal_name: string | null
          principal_phone: string | null
          description: string | null
          description_in_bangla: string | null
          primary_color: string | null
          secondary_color: string | null
          accent_color: string | null
          motto: string | null
          motto_bn: string | null
          logo_url: string | null
          favicon_url: string | null
          updated_at: string | null
        }>
      }

      // Attendance Table
      attendance: {
        Row: {
          id: number
          student_id: number
          class: string
          section: string | null
          date: string
          status: string
          remarks: string | null
          marked_by: number | null
          school_id: number
          created_at: string
        }
        Insert: {
          student_id: number
          class: string
          section?: string | null
          date: string
          status?: string
          remarks?: string | null
          marked_by?: number | null
          school_id?: number
        }
        Update: Partial<{
          student_id: number
          class: string
          section: string | null
          date: string
          status: string
          remarks: string | null
          marked_by: number | null
          school_id: number
        }>
      }

      // Exams Table
      exams: {
        Row: {
          id: number
          name: string
          name_bn: string
          description: string | null
          type: string
          class: string
          subject: string
          total_marks: number
          pass_marks: number
          date: string
          start_time: string | null
          end_time: string | null
          duration: number | null
          status: string
          school_id: number
          created_at: string
        }
        Insert: {
          name: string
          name_bn: string
          description?: string | null
          type?: string
          class: string
          subject: string
          total_marks?: number
          pass_marks?: number
          date: string
          start_time?: string | null
          end_time?: string | null
          duration?: number | null
          status?: string
          school_id?: number
        }
        Update: Partial<{
          name: string
          name_bn: string
          description: string | null
          type: string
          class: string
          subject: string
          total_marks: number
          pass_marks: number
          date: string
          start_time: string | null
          end_time: string | null
          duration: number | null
          status: string
          school_id: number
        }>
      }

      // Exam Results Table
      exam_results: {
        Row: {
          id: number
          exam_id: number
          student_id: number
          marks_obtained: number
          grade: string | null
          remarks: string | null
          is_absent: boolean | null
          school_id: number
          created_at: string
        }
        Insert: {
          exam_id: number
          student_id: number
          marks_obtained: number
          grade?: string | null
          remarks?: string | null
          is_absent?: boolean | null
          school_id?: number
        }
        Update: Partial<{
          exam_id: number
          student_id: number
          marks_obtained: number
          grade: string | null
          remarks: string | null
          is_absent: boolean | null
          school_id: number
        }>
      }

      // Events Table
      events: {
        Row: {
          id: number
          name: string
          name_bn: string
          description: string | null
          description_bn: string | null
          date: string
          start_time: string | null
          end_time: string | null
          location: string | null
          type: string
          is_active: boolean | null
          organizer: string | null
          contact_info: string | null
          max_participants: number | null
          current_participants: number | null
          registration_required: boolean | null
          registration_fee: string | null
          image_url: string | null
          school_id: number
          created_by: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          name: string
          name_bn: string
          description?: string | null
          description_bn?: string | null
          date: string
          start_time?: string | null
          end_time?: string | null
          location?: string | null
          type?: string
          is_active?: boolean | null
          organizer?: string | null
          contact_info?: string | null
          max_participants?: number | null
          current_participants?: number | null
          registration_required?: boolean | null
          registration_fee?: string | null
          image_url?: string | null
          school_id?: number
          created_by?: number | null
        }
        Update: Partial<{
          name: string
          name_bn: string
          description: string | null
          description_bn: string | null
          date: string
          start_time: string | null
          end_time: string | null
          location: string | null
          type: string
          is_active: boolean | null
          organizer: string | null
          contact_info: string | null
          max_participants: number | null
          current_participants: number | null
          registration_required: boolean | null
          registration_fee: string | null
          image_url: string | null
          school_id: number
          created_by: number | null
          updated_at: string | null
        }>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Utility Types for easier use
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type TablesRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

// Common types for easier access
export type Student = TablesRow<'students'>
export type StudentInsert = TablesInsert<'students'>
export type StudentUpdate = TablesUpdate<'students'>

export type Teacher = TablesRow<'teachers'>
export type TeacherInsert = TablesInsert<'teachers'>
export type TeacherUpdate = TablesUpdate<'teachers'>

export type LibraryBook = TablesRow<'library_books'>
export type LibraryBookInsert = TablesInsert<'library_books'>
export type LibraryBookUpdate = TablesUpdate<'library_books'>

export type InventoryItem = TablesRow<'inventory_items'>
export type InventoryItemInsert = TablesInsert<'inventory_items'>
export type InventoryItemUpdate = TablesUpdate<'inventory_items'>

export type CalendarEvent = TablesRow<'calendar_events'>
export type CalendarEventInsert = TablesInsert<'calendar_events'>
export type CalendarEventUpdate = TablesUpdate<'calendar_events'>

export type Notification = TablesRow<'notifications'>
export type NotificationInsert = TablesInsert<'notifications'>
export type NotificationUpdate = TablesUpdate<'notifications'>

export type DocumentTemplate = TablesRow<'document_templates'>
export type DocumentTemplateInsert = TablesInsert<'document_templates'>
export type DocumentTemplateUpdate = TablesUpdate<'document_templates'>

export type AcademicYear = TablesRow<'academic_years'>
export type AcademicYearInsert = TablesInsert<'academic_years'>
export type AcademicYearUpdate = TablesUpdate<'academic_years'>

export type AcademicTerm = TablesRow<'academic_terms'>
export type AcademicTermInsert = TablesInsert<'academic_terms'>
export type AcademicTermUpdate = TablesUpdate<'academic_terms'>

export type TransportRoute = TablesRow<'transport_routes'>
export type TransportRouteInsert = TablesInsert<'transport_routes'>
export type TransportRouteUpdate = TablesUpdate<'transport_routes'>

export type TransportVehicle = TablesRow<'transport_vehicles'>
export type TransportVehicleInsert = TablesInsert<'transport_vehicles'>
export type TransportVehicleUpdate = TablesUpdate<'transport_vehicles'>

export type PaymentTransaction = TablesRow<'payment_transactions'>
export type PaymentTransactionInsert = TablesInsert<'payment_transactions'>
export type PaymentTransactionUpdate = TablesUpdate<'payment_transactions'>

export type FinancialTransaction = TablesRow<'financial_transactions'>
export type FinancialTransactionInsert = TablesInsert<'financial_transactions'>
export type FinancialTransactionUpdate = TablesUpdate<'financial_transactions'>

export type Staff = TablesRow<'staff'>
export type StaffInsert = TablesInsert<'staff'>
export type StaffUpdate = TablesUpdate<'staff'>

export type Parent = TablesRow<'parents'>
export type ParentInsert = TablesInsert<'parents'>
export type ParentUpdate = TablesUpdate<'parents'>

export type InventoryMovement = TablesRow<'inventory_movements'>
export type InventoryMovementInsert = TablesInsert<'inventory_movements'>
export type InventoryMovementUpdate = TablesUpdate<'inventory_movements'>

// New table type exports
export type LibraryBorrowedBook = TablesRow<'library_borrowed_books'>
export type LibraryBorrowedBookInsert = TablesInsert<'library_borrowed_books'>
export type LibraryBorrowedBookUpdate = TablesUpdate<'library_borrowed_books'>

export type VideoConference = TablesRow<'video_conferences'>
export type VideoConferenceInsert = TablesInsert<'video_conferences'>
export type VideoConferenceUpdate = TablesUpdate<'video_conferences'>

export type StudentImportBatch = TablesRow<'student_import_batches'>
export type StudentImportBatchInsert = TablesInsert<'student_import_batches'>
export type StudentImportBatchUpdate = TablesUpdate<'student_import_batches'>

export type SchoolDocumentPermission = TablesRow<'school_document_permissions'>
export type SchoolDocumentPermissionInsert = TablesInsert<'school_document_permissions'>
export type SchoolDocumentPermissionUpdate = TablesUpdate<'school_document_permissions'>

export type TransportStudentAssignment = TablesRow<'transport_student_assignments'>
export type TransportStudentAssignmentInsert = TablesInsert<'transport_student_assignments'>
export type TransportStudentAssignmentUpdate = TablesUpdate<'transport_student_assignments'>

export type SchoolSettings = TablesRow<'school_settings'>
export type SchoolSettingsInsert = TablesInsert<'school_settings'>
export type SchoolSettingsUpdate = TablesUpdate<'school_settings'>

// New Academic & Management Tables
export type Attendance = TablesRow<'attendance'>
export type AttendanceInsert = TablesInsert<'attendance'>
export type AttendanceUpdate = TablesUpdate<'attendance'>

export type Exam = TablesRow<'exams'>
export type ExamInsert = TablesInsert<'exams'>
export type ExamUpdate = TablesUpdate<'exams'>

export type ExamResult = TablesRow<'exam_results'>
export type ExamResultInsert = TablesInsert<'exam_results'>
export type ExamResultUpdate = TablesUpdate<'exam_results'>

export type Event = TablesRow<'events'>
export type EventInsert = TablesInsert<'events'>
export type EventUpdate = TablesUpdate<'events'>

// Dashboard Stats Type
export interface DashboardStats {
  students: number
  teachers: number
  books: number
  inventory_items: number
  pending_fees: number
  total_revenue: number
  active_notifications: number
  upcoming_events: number
}

// Search and Filter Types
export interface StudentFilter {
  class?: string
  section?: string
  status?: string
  school_id?: number
}

export interface TeacherFilter {
  subject?: string
  status?: string
  school_id?: number
}

export interface LibraryBookFilter {
  category?: string
  availability?: 'available' | 'borrowed' | 'all'
  school_id?: number
}

export interface NotificationFilter {
  type?: string
  is_read?: boolean
  recipient_id?: number
  school_id?: number
}