import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().max(20).optional().nullable(),
  monthly_salary: z.number().positive('Monthly salary must be positive'),
  salary_divisor: z.number().int().min(1).max(365).default(30),
  joined_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const attendanceSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status: z.enum(['present', 'absent', 'half']),
});

export const finalizeSalaryRunSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Month must be first day of month (YYYY-MM-01)'),
  days_present: z.number().int().min(0),
  days_absent: z.number().int().min(0),
  manual_override: z.number().min(0).optional().nullable(),
});
