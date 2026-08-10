import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'; label: string }> = {
  // Product / content
  draft: { variant: 'secondary', label: 'Draft' },
  published: { variant: 'success', label: 'Published' },
  scheduled: { variant: 'info', label: 'Scheduled' },
  archived: { variant: 'outline', label: 'Archived' },
  // Leads
  new: { variant: 'info', label: 'New' },
  contacted: { variant: 'secondary', label: 'Contacted' },
  qualified: { variant: 'warning', label: 'Qualified' },
  quotation_sent: { variant: 'info', label: 'Quotation Sent' },
  negotiation: { variant: 'warning', label: 'Negotiation' },
  won: { variant: 'success', label: 'Won' },
  lost: { variant: 'destructive', label: 'Lost' },
  // Quotation
  sent: { variant: 'info', label: 'Sent' },
  accepted: { variant: 'success', label: 'Accepted' },
  rejected: { variant: 'destructive', label: 'Rejected' },
  expired: { variant: 'outline', label: 'Expired' },
  // Invoices
  paid: { variant: 'success', label: 'Paid' },
  partially_paid: { variant: 'warning', label: 'Partially Paid' },
  overdue: { variant: 'destructive', label: 'Overdue' },
  cancelled: { variant: 'outline', label: 'Cancelled' },
  void: { variant: 'outline', label: 'Void' },
  // Org / subscription
  active: { variant: 'success', label: 'Active' },
  trial: { variant: 'info', label: 'Trial' },
  suspended: { variant: 'destructive', label: 'Suspended' },
  cancelled_sub: { variant: 'outline', label: 'Cancelled' },
  sending: { variant: 'info', label: 'Sending' },
  open: { variant: 'info', label: 'Open' },
  pending: { variant: 'warning', label: 'Pending' },
  resolved: { variant: 'success', label: 'Resolved' },
  closed: { variant: 'outline', label: 'Closed' },
  // Shipment journey
  booked: { variant: 'info', label: 'Booked' },
  in_transit: { variant: 'info', label: 'In Transit' },
  at_customs: { variant: 'warning', label: 'At Customs' },
  cleared: { variant: 'success', label: 'Cleared' },
  delivered: { variant: 'success', label: 'Delivered' },
  held: { variant: 'destructive', label: 'Held' },
  low: { variant: 'destructive', label: 'Low' },
  ok: { variant: 'success', label: 'OK' },
  yes: { variant: 'success', label: 'Yes' },
  no: { variant: 'secondary', label: 'No' },
  in: { variant: 'success', label: 'In' },
  out: { variant: 'info', label: 'Out' },
  adjustment: { variant: 'warning', label: 'Adjustment' },
  done: { variant: 'success', label: 'Done' }
};

const DOT: Record<string, string> = {
  default: 'bg-primary',
  secondary: 'bg-muted-foreground',
  destructive: 'bg-neg',
  outline: 'bg-muted-foreground/60',
  success: 'bg-pos',
  warning: 'bg-warn',
  info: 'bg-info'
};

export function StatusBadge({ status }: { status?: string | null }) {
  const style = status
    ? (STATUS_STYLES[status] ?? { variant: 'secondary' as const, label: status.replace(/_/g, ' ') })
    : { variant: 'secondary' as const, label: '—' };
  return (
    <Badge variant={style.variant} className="pl-2">
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[style.variant])} aria-hidden />
      {style.label}
    </Badge>
  );
}
