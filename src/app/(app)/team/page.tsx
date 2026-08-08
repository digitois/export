'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, MailX, Trash2, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { formatDate, getInitials } from '@/lib/utils';

interface Member {
  id: string;
  role: string;
  title?: string | null;
  status: string;
  user_id?: string | null;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
}

const INVITE_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' }
];

function roleVariant(role: string): 'default' | 'info' | 'warning' | 'secondary' {
  switch (role) {
    case 'owner':
      return 'default';
    case 'admin':
      return 'info';
    case 'manager':
      return 'warning';
    default:
      return 'secondary';
  }
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('manager');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [roleBusy, setRoleBusy] = useState<Record<string, boolean>>({});
  const [removing, setRemoving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [m, i] = await Promise.all([
        api<{ data: Member[] }>('/api/team/members'),
        api<Invitation[]>('/api/team/invitations')
      ]);
      setMembers(m.data);
      setInvitations(i);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite() {
    setInviteError('');
    if (!inviteEmail.trim()) {
      setInviteError('Email is required');
      return;
    }
    setInviting(true);
    try {
      await api('/api/team/invitations', {
        method: 'POST',
        body: { email: inviteEmail.trim(), role: inviteRole }
      });
      toast.success('Invitation sent');
      setInviteEmail('');
      setInviteRole('manager');
      setInviteOpen(false);
      load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(member: Member, role: string) {
    setError('');
    setRoleBusy((prev) => ({ ...prev, [member.id]: true }));
    try {
      await api('/api/team/members', { method: 'PATCH', body: { id: member.id, role } });
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role } : m)));
      toast.success('Member role updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role');
    } finally {
      setRoleBusy((prev) => ({ ...prev, [member.id]: false }));
    }
  }

  async function handleRemove(member: Member) {
    if (!window.confirm(`Leave ${member.full_name} from the team?`)) return;
    setError('');
    setRemoving(member.id);
    try {
      await api(`/api/team/members?id=${member.id}&kind=member`, { method: 'DELETE' });
      toast.success('Member removed');
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setRemoving(null);
    }
  }

  async function handleRevoke(inv: Invitation) {
    if (!window.confirm(`Revoke the invitation sent to ${inv.email}?`)) return;
    setError('');
    setRemoving(inv.id);
    try {
      await api(`/api/team/members?id=${inv.id}&kind=invitation`, { method: 'DELETE' });
      toast.success('Invitation revoked');
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    } finally {
      setRemoving(null);
    }
  }

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  return (
    <div className="space-y-6">
      <PageHeader title="Team Members" description="Manage who has access to your organization">
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4" />
              Invite member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Member</DialogTitle>
              <DialogDescription>Send an invite by email. It expires in 7 days.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="teammate@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVITE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={inviting}>
                {inviting ? 'Inviting...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <Loading label="Loading your team..." />
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Members</CardTitle>
                <CardDescription>People with access to this organization.</CardDescription>
              </div>
              <Badge variant="secondary">{members.length} member{members.length !== 1 && 's'}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {members.length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState
                    icon={Users}
                    title="No members yet"
                    description="Invite teammates to collaborate on exports."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.full_name} />}
                              <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.full_name}</p>
                              {member.title && <p className="text-xs text-muted-foreground">{member.title}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                        <TableCell>
                          {member.role === 'owner' ? (
                            <Badge variant={roleVariant(member.role)}>{member.role}</Badge>
                          ) : (
                            <Select
                              value={member.role}
                              disabled={roleBusy[member.id]}
                              onValueChange={(role) => handleRoleChange(member, role)}
                            >
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {INVITE_ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell><StatusBadge status={member.status} /></TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(member.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive"
                            disabled={removing === member.id}
                            onClick={() => handleRemove(member)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {removing === member.id ? 'Removing' : 'Remove'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>Invites waiting to be accepted.</CardDescription>
              </div>
              <Badge variant="secondary">{pendingInvitations.length} pending</Badge>
            </CardHeader>
            <CardContent>
              {pendingInvitations.length === 0 ? (
                <EmptyState
                  icon={MailX}
                  title="No pending invitations"
                  description="Invite teammates by email to grant them access."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-muted-foreground">{inv.email}</TableCell>
                        <TableCell><Badge variant={roleVariant(inv.role)}>{inv.role}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(inv.expires_at)}</TableCell>
                        <TableCell><StatusBadge status={inv.status} /></TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive"
                            disabled={removing === inv.id}
                            onClick={() => handleRevoke(inv)}
                          >
                            <MailX className="h-3.5 w-3.5" />
                            {removing === inv.id ? 'Revoking' : 'Revoke'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}