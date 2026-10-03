export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | 'pending'
  | 'flagged'
  | 'confirmed'
  | 'on_hold'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'cancelled';

export type UserRole = 'owner' | 'staff' | 'super_admin' | 'admin';
export type CourierProvider = 'steadfast' | 'pathao' | 'redx';

export type GenericRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Database = {
  public: {
    Tables: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Row: Record<string, any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Insert: Record<string, any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Update: Record<string, any>;
        Relationships: GenericRelationship[];
      };
      tenants: {
        Row: {
          id: string;
          business_name: string;
          owner_id: string | null;
          plan: 'trial' | 'basic' | 'pro';
          subscription_status: 'active' | 'expired' | 'cancelled';
          created_at: string;
        };
        Insert: {
          id?: string;
          business_name: string;
          owner_id?: string | null;
          plan?: 'trial' | 'basic' | 'pro';
          subscription_status?: 'active' | 'expired' | 'cancelled';
          created_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          owner_id?: string | null;
          plan?: 'trial' | 'basic' | 'pro';
          subscription_status?: 'active' | 'expired' | 'cancelled';
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          role: UserRole;
          full_name: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          role: UserRole;
          full_name?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          role?: UserRole;
          full_name?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          sku: string | null;
          buy_price: number;
          sell_price: number;
          stock_quantity: number;
          low_stock_threshold: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          sku?: string | null;
          buy_price: number;
          sell_price: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          sku?: string | null;
          buy_price?: number;
          sell_price?: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      stock_movements: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          direction: 'in' | 'out';
          quantity: number;
          reason: string;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          direction: 'in' | 'out';
          quantity: number;
          reason: string;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string;
          direction?: 'in' | 'out';
          quantity?: number;
          reason?: string;
          reference_id?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      orders: {
        Row: {
          id: string;
          tenant_id: string;
          customer_name: string;
          customer_phone: string;
          customer_address: string;
          status: OrderStatus;
          total_amount: number;
          cod_amount: number;
          delivery_charge: number;
          notes: string | null;
          is_flagged: boolean;
          flag_reason: string | null;
          courier_provider: CourierProvider | null;
          cod_collected: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_name: string;
          customer_phone: string;
          customer_address: string;
          status?: OrderStatus;
          total_amount: number;
          cod_amount: number;
          delivery_charge?: number;
          notes?: string | null;
          is_flagged?: boolean;
          flag_reason?: string | null;
          courier_provider?: CourierProvider | null;
          cod_collected?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          customer_name?: string;
          customer_phone?: string;
          customer_address?: string;
          status?: OrderStatus;
          total_amount?: number;
          cod_amount?: number;
          delivery_charge?: number;
          notes?: string | null;
          is_flagged?: boolean;
          flag_reason?: string | null;
          courier_provider?: CourierProvider | null;
          cod_collected?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      order_items: {
        Row: {
          id: string;
          tenant_id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          buy_price: number;
          sell_price: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          buy_price: number;
          sell_price: number;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          buy_price?: number;
          sell_price?: number;
        };
        Relationships: GenericRelationship[];
      };
      courier_credentials: {
        Row: {
          id: string;
          tenant_id: string;
          provider: CourierProvider;
          encrypted_api_key: string;
          encrypted_api_secret: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          provider: CourierProvider;
          encrypted_api_key: string;
          encrypted_api_secret?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          provider?: CourierProvider;
          encrypted_api_key?: string;
          encrypted_api_secret?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      courier_shipments: {
        Row: {
          id: string;
          tenant_id: string;
          order_id: string;
          provider: string;
          consignment_id: string;
          tracking_code: string | null;
          status: string;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          order_id: string;
          provider: string;
          consignment_id: string;
          tracking_code?: string | null;
          status?: string;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          order_id?: string;
          provider?: string;
          consignment_id?: string;
          tracking_code?: string | null;
          status?: string;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      bill_costs: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          amount: number;
          date: string;
          is_recurring: boolean;
          frequency: 'daily' | 'monthly' | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          amount: number;
          date: string;
          is_recurring?: boolean;
          frequency?: 'daily' | 'monthly' | null;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          amount?: number;
          date?: string;
          is_recurring?: boolean;
          frequency?: 'daily' | 'monthly' | null;
          category?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      employees: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          phone: string | null;
          monthly_salary: number;
          salary_divisor: number;
          joined_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          phone?: string | null;
          monthly_salary: number;
          salary_divisor?: number;
          joined_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          phone?: string | null;
          monthly_salary?: number;
          salary_divisor?: number;
          joined_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      attendance: {
        Row: {
          id: string;
          tenant_id: string;
          employee_id: string;
          date: string;
          status: 'present' | 'absent' | 'half';
        };
        Insert: {
          id?: string;
          tenant_id: string;
          employee_id: string;
          date: string;
          status: 'present' | 'absent' | 'half';
        };
        Update: {
          id?: string;
          tenant_id?: string;
          employee_id?: string;
          date?: string;
          status?: 'present' | 'absent' | 'half';
        };
        Relationships: GenericRelationship[];
      };
      salary_runs: {
        Row: {
          id: string;
          tenant_id: string;
          employee_id: string;
          month: string;
          days_present: number;
          days_absent: number;
          gross_salary: number;
          deduction: number;
          net_payable: number;
          manual_override: number | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          employee_id: string;
          month: string;
          days_present: number;
          days_absent: number;
          gross_salary: number;
          deduction?: number;
          net_payable: number;
          manual_override?: number | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          employee_id?: string;
          month?: string;
          days_present?: number;
          days_absent?: number;
          gross_salary?: number;
          deduction?: number;
          net_payable?: number;
          manual_override?: number | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      customers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          phone: string;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          phone: string;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          phone?: string;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      due_ledger: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string | null;
          party_name: string;
          party_phone: string | null;
          type: 'credit' | 'debit';
          amount: number;
          note: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_id?: string | null;
          party_name: string;
          party_phone?: string | null;
          type: 'credit' | 'debit';
          amount: number;
          note?: string | null;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          customer_id?: string | null;
          party_name?: string;
          party_phone?: string | null;
          type?: 'credit' | 'debit';
          amount?: number;
          note?: string | null;
          date?: string;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      loan_ledger: {
        Row: {
          id: string;
          tenant_id: string;
          party_name: string;
          party_phone: string | null;
          type: 'borrowed' | 'repaid';
          amount: number;
          note: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          party_name: string;
          party_phone?: string | null;
          type: 'borrowed' | 'repaid';
          amount: number;
          note?: string | null;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          party_name?: string;
          party_phone?: string | null;
          type?: 'borrowed' | 'repaid';
          amount?: number;
          note?: string | null;
          date?: string;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      opening_balances: {
        Row: {
          id: string;
          tenant_id: string;
          total_stock_value: number;
          total_receivable: number;
          total_payable: number;
          set_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          total_stock_value?: number;
          total_receivable?: number;
          total_payable?: number;
          set_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          total_stock_value?: number;
          total_receivable?: number;
          total_payable?: number;
          set_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      subscriptions: {
        Row: {
          id: string;
          tenant_id: string;
          plan: string;
          status: 'pending' | 'active' | 'expired' | 'cancelled';
          sslcommerz_transaction_id: string | null;
          amount: number | null;
          renewed_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          plan: string;
          status?: 'pending' | 'active' | 'expired' | 'cancelled';
          sslcommerz_transaction_id?: string | null;
          amount?: number | null;
          renewed_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          plan?: string;
          status?: 'pending' | 'active' | 'expired' | 'cancelled';
          sslcommerz_transaction_id?: string | null;
          amount?: number | null;
          renewed_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
    };
    Views: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Row: Record<string, any>;
        Relationships: GenericRelationship[];
      };
    };
    Functions: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Args: Record<string, any>;
        Returns: unknown;
      };
    };
    Enums: {
      order_status: OrderStatus;
      user_role: UserRole;
      courier_provider: CourierProvider;
    };
    CompositeTypes: Record<string, never>;
  };
};
