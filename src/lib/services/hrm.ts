import type { SupabaseClient } from '@supabase/supabase-js';
import { getNextSequence } from '@/lib/services/sequences';

export interface EmployeeInput {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  joiningDate?: string | null;
  status?: 'active' | 'on_leave' | 'terminated';
  baseSalary?: number;
  currency?: string;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface AttendanceInput {
  employeeId: string;
  attendanceDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: 'present' | 'absent' | 'half_day' | 'leave';
  hoursWorked?: number;
  notes?: string | null;
}

export interface LeaveInput {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
}

export interface PayrollInput {
  periodStart: string;
  periodEnd: string;
  runDate?: string | null;
  notes?: string | null;
}

// ------------------------------------------------------------------
// Employees
// ------------------------------------------------------------------

export async function listEmployees(supabase: SupabaseClient, organizationId: string, status?: string) {
  let query = supabase
    .from('employees')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  return { items: data ?? [], error };
}

export async function getEmployee(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createEmployee(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: EmployeeInput
) {
  const employeeCode = await getNextSequence(supabase, organizationId, 'EMP');
  const { data, error } = await supabase
    .from('employees')
    .insert({
      organization_id: organizationId,
      employee_code: employeeCode,
      full_name: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      designation: input.designation ?? null,
      department: input.department ?? null,
      joining_date: input.joiningDate ?? null,
      status: input.status ?? 'active',
      base_salary: input.baseSalary ?? 0,
      currency: input.currency ?? 'USD',
      bank_name: input.bankName ?? null,
      bank_account: input.bankAccount ?? null,
      bank_ifsc: input.bankIfsc ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

export async function updateEmployee(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: EmployeeInput
) {
  const { data, error } = await supabase
    .from('employees')
    .update({
      full_name: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      designation: input.designation ?? null,
      department: input.department ?? null,
      joining_date: input.joiningDate ?? null,
      status: input.status ?? 'active',
      base_salary: input.baseSalary ?? 0,
      currency: input.currency ?? 'USD',
      bank_name: input.bankName ?? null,
      bank_account: input.bankAccount ?? null,
      bank_ifsc: input.bankIfsc ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteEmployee(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

// ------------------------------------------------------------------
// Attendance
// ------------------------------------------------------------------

export async function listAttendance(
  supabase: SupabaseClient,
  organizationId: string,
  opts: { employeeId?: string; from?: string; to?: string } = {}
) {
  let query = supabase
    .from('attendance')
    .select('*, employees(id, employee_code, full_name, designation)')
    .eq('organization_id', organizationId)
    .order('attendance_date', { ascending: false });
  if (opts.employeeId) query = query.eq('employee_id', opts.employeeId);
  if (opts.from) query = query.gte('attendance_date', opts.from);
  if (opts.to) query = query.lte('attendance_date', opts.to);
  const { data, error } = await query;
  return { items: data ?? [], error };
}

export async function upsertAttendance(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: AttendanceInput
) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      {
        organization_id: organizationId,
        employee_id: input.employeeId,
        attendance_date: input.attendanceDate,
        check_in: input.checkIn ?? null,
        check_out: input.checkOut ?? null,
        status: input.status ?? 'present',
        hours_worked: input.hoursWorked ?? 0,
        notes: input.notes ?? null,
        created_by: userId
      },
      { onConflict: 'organization_id,employee_id,attendance_date' }
    )
    .select()
    .single();
  return { data, error };
}

export async function deleteAttendance(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

// ------------------------------------------------------------------
// Leave requests
// ------------------------------------------------------------------

export async function listLeaveRequests(
  supabase: SupabaseClient,
  organizationId: string,
  status?: string
) {
  let query = supabase
    .from('leave_requests')
    .select('*, employees(id, employee_code, full_name, designation)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  return { items: data ?? [], error };
}

export function calculateLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

export async function createLeaveRequest(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: LeaveInput
) {
  const days = calculateLeaveDays(input.startDate, input.endDate);
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      organization_id: organizationId,
      employee_id: input.employeeId,
      leave_type: input.leaveType,
      start_date: input.startDate,
      end_date: input.endDate,
      days,
      reason: input.reason ?? null,
      status: 'pending',
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

export async function reviewLeaveRequest(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  id: string,
  status: 'approved' | 'rejected',
  reviewNote?: string | null
) {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      status,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote ?? null
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteLeaveRequest(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('leave_requests')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

// ------------------------------------------------------------------
// Payroll
// ------------------------------------------------------------------

export async function listPayrollRuns(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('payroll_runs')
    .select('*, payroll_lines(id, employee_id, gross, allowances, deductions, net, employees(full_name, employee_code))')
    .eq('organization_id', organizationId)
    .order('period_start', { ascending: false });
  return { items: data ?? [], error };
}

export async function createPayrollRun(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: PayrollInput
) {
  const { data, error } = await supabase
    .from('payroll_runs')
    .insert({
      organization_id: organizationId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      run_date: input.runDate ?? new Date().toISOString().slice(0, 10),
      status: 'draft',
      currency: 'USD',
      notes: input.notes ?? null,
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

/**
 * Build payroll lines for a run from active employees' base salaries.
 * Net = gross + allowances - deductions. Pure-ish logic extracted for tests.
 */
export function computePayrollLine(employee: { baseSalary: number }, opts: { allowances?: number; deductions?: number } = {}) {
  const gross = round2(employee.baseSalary);
  const allowances = round2(opts.allowances ?? 0);
  const deductions = round2(opts.deductions ?? 0);
  const net = round2(gross + allowances - deductions);
  return { gross, allowances, deductions, net };
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function generatePayrollLines(
  supabase: SupabaseClient,
  organizationId: string,
  payrollRunId: string
) {
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, base_salary')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  if (empError) return { error: empError };

  const lines = (employees ?? []).map((e) => {
    const calc = computePayrollLine({ baseSalary: Number(e.base_salary) ?? 0 });
    return {
      organization_id: organizationId,
      payroll_run_id: payrollRunId,
      employee_id: e.id,
      gross: calc.gross,
      allowances: calc.allowances,
      deductions: calc.deductions,
      net: calc.net
    };
  });

  if (lines.length > 0) {
    const { error } = await supabase.from('payroll_lines').insert(lines);
    if (error) return { error };
  }

  // Update the run total
  const { data: runLines, error: lineError } = await supabase
    .from('payroll_lines')
    .select('net')
    .eq('payroll_run_id', payrollRunId);
  if (lineError) return { error: lineError };

  const total = round2((runLines ?? []).reduce((sum, l) => sum + Number(l.net ?? 0), 0));
  const { data, error: updateError } = await supabase
    .from('payroll_runs')
    .update({ total_amount: total })
    .eq('organization_id', organizationId)
    .eq('id', payrollRunId)
    .select()
    .single();

  return { data, error: updateError };
}

export async function setPayrollStatus(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  status: 'paid' | 'cancelled'
) {
  const { data, error } = await supabase
    .from('payroll_runs')
    .update({ status })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}
