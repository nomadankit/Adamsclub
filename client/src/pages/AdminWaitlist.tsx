import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Users, Mail, MapPin, CheckCircle2, Download, Trash2, Search, Zap, Send } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WaitlistEntry {
  id: string;
  firstName: string;
  email: string;
  phone?: string;
  location?: string;
  interests?: string[];
  state: string;
  optInMarketing: boolean;
  createdAt: string;
  emailsSent?: number;
  lastEmailType?: string;
  lastEmailSentAt?: string;
  mainEmailSent?: boolean;
  followupsSent?: number;
}

interface WaitlistStats {
  total: number;
  marketingOptIn: number;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function AdminWaitlist() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkEmailTab, setBulkEmailTab] = useState('main');
  const [selectedLead, setSelectedLead] = useState<WaitlistEntry | null>(null);
  const [emailContent, setEmailContent] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testEmailSubject, setTestEmailSubject] = useState('Adam\'s Club - Test Email');
  const [testEmailContent, setTestEmailContent] = useState('This is a test email to verify your SendGrid configuration is working correctly.');
  const [bulkEmailSubject, setBulkEmailSubject] = useState('');
  const [bulkEmailContent, setBulkEmailContent] = useState('');
  const [bulkMainEmailContent, setBulkMainEmailContent] = useState('');
  const [bulkPersonalizedContent, setBulkPersonalizedContent] = useState('');
  const [followupNumber, setFollowupNumber] = useState(0);
  const { toast } = useToast();

  const { data: entries, isLoading: entriesLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ['/api/admin/waitlist']
  });

  const { data: stats } = useQuery<WaitlistStats>({
    queryKey: ['/api/admin/waitlist/stats']
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/waitlist/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/waitlist/stats'] });
      toast({ title: 'Success', description: 'Entry deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete entry', variant: 'destructive' });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => apiRequest('POST', `/api/admin/waitlist/bulk-delete`, { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/waitlist/stats'] });
      setSelectedIds(new Set());
      toast({ title: 'Success', description: `Deleted ${selectedIds.size} entries` });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete entries', variant: 'destructive' });
    }
  });

  const generateAIEmailMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await apiRequest('POST', `/api/admin/waitlist/${leadId}/generate-email`, {});
      return response as unknown as { subject: string; content: string };
    },
    onSuccess: (data: any) => {
      setEmailSubject(data.subject || '');
      setEmailContent(data.content || '');
      toast({ title: 'Success', description: 'AI email generated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to generate email', variant: 'destructive' });
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ leadId, subject, content, emailType, followupNum }: any) =>
      apiRequest('POST', `/api/admin/waitlist/${leadId}/send-email`, {
        subject,
        content,
        emailType,
        followupNumber: followupNum
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/waitlist'] });
      setEmailModalOpen(false);
      setEmailContent('');
      setEmailSubject('');
      setSelectedLead(null);
      toast({ title: 'Success', description: 'Email sent successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to send email', variant: 'destructive' });
    }
  });

  const testEmailMutation = useMutation({
    mutationFn: ({ email, subject, content }: any) =>
      apiRequest('POST', `/api/admin/waitlist/test-email`, { email, subject, content }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Test email sent successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to send test email', variant: 'destructive' });
    }
  });

  const bulkSendEmailMutation = useMutation({
    mutationFn: ({ leadIds, subject, content, emailType }: any) =>
      apiRequest('POST', `/api/admin/waitlist/bulk-send-email`, { leadIds, subject, content, emailType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/waitlist'] });
      setBulkEmailOpen(false);
      setBulkEmailContent('');
      setBulkEmailSubject('');
      setBulkMainEmailContent('');
      setBulkPersonalizedContent('');
      setBulkEmailTab('main');
      setSelectedIds(new Set());
      toast({ title: 'Success', description: `Email sent to ${selectedIds.size} recipients` });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to send bulk email', variant: 'destructive' });
    }
  });

  const generateAIBulkEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/admin/waitlist/generate-bulk-email`, {});
      return response as unknown as { subject: string; content: string };
    },
    onSuccess: (data: any) => {
      setBulkEmailSubject(data.subject || '');
      setBulkMainEmailContent(data.content || '');
      toast({ title: 'Success', description: 'AI email template generated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to generate email', variant: 'destructive' });
    }
  });

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    return entries.filter(entry => {
      const matchesSearch = entry.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.location && entry.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesState = selectedState === 'all' || entry.state === selectedState;
      return matchesSearch && matchesState;
    });
  }, [entries, searchQuery, selectedState]);

  // Get unique states from entries
  const uniqueStates = useMemo(() => {
    if (!entries) return [];
    const states = new Set(entries.map(e => e.state));
    return Array.from(states).sort();
  }, [entries]);

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredEntries.length) {
      toast({ title: 'Error', description: 'No entries to export', variant: 'destructive' });
      return;
    }

    const headers = ['First Name', 'Email', 'Phone', 'Location', 'State', 'Marketing Opt-In', 'Email Status', 'Date Joined'];
    const csvContent = [
      headers.join(','),
      ...filteredEntries.map(entry => {
        const date = new Date(entry.createdAt).toLocaleDateString();
        const emailStatus = entry.mainEmailSent ? `Sent (${entry.followupsSent || 0} followups)` : 'Pending';
        return [
          entry.firstName,
          entry.email,
          entry.phone || '',
          entry.location || '',
          entry.state,
          entry.optInMarketing ? 'Yes' : 'No',
          emailStatus,
          date
        ].map(field => `"${field}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `waitlist-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'Success', description: 'CSV exported successfully' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const DEFAULT_BULK_EMAIL_SUBJECT = "An Exciting Opportunity from Adam's Club";
  const DEFAULT_BULK_EMAIL_CONTENT = `Hi there,

Thank you for joining our waitlist! We're thrilled to have you as part of the Adam's Club community.

As an early member, you'll have exclusive access to premium outdoor experiences, gear rentals, and special events. We're building something unique—a community of adventurers and outdoor enthusiasts who share a passion for exploration and high-quality gear.

We'll be reaching out soon with more details about membership benefits and exclusive opportunities. In the meantime, stay tuned for updates.

Best regards,
Adam's Club Team`;

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntries.map(e => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const openEmailModal = (lead: WaitlistEntry, isFollowup: boolean = false) => {
    setSelectedLead(lead);
    if (!isFollowup) {
      setFollowupNumber(0);
      setEmailSubject(`You've successfully joined Adam's Club waitlist!`);
      setEmailContent('');
    } else {
      setFollowupNumber((lead.followupsSent || 0) + 1);
      setEmailSubject(`Adam's Club Update - ${followupNumber}`);
      setEmailContent('');
    }
    setEmailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Waitlist Management</h1>
          </div>
          <p className="text-muted-foreground">View, search, filter, and manage early adopters joining Adam's Club</p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <Button
            onClick={() => setLocation('/admin/email-config')}
            variant="outline"
            size="sm"
            data-testid="button-email-config"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Configuration
          </Button>
          <Button
            onClick={() => setTestEmailOpen(true)}
            variant="outline"
            size="sm"
            data-testid="button-quick-test-email"
          >
            <Mail className="h-4 w-4 mr-2" />
            Test Email
          </Button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">people on waitlist</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">unique countries</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">interests tracked</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leads Management Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Leads Management</CardTitle>
                <CardDescription>Showing {filteredEntries.length} of {entries?.length || 0} leads</CardDescription>
              </div>
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                disabled={!filteredEntries.length}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-waitlist"
                />
              </div>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-state-filter">
                  <SelectValue placeholder="Filter by state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-muted p-3 rounded-lg gap-2 flex-wrap">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setBulkEmailOpen(true);
                      setBulkEmailSubject(DEFAULT_BULK_EMAIL_SUBJECT);
                      setBulkMainEmailContent(DEFAULT_BULK_EMAIL_CONTENT);
                      setBulkPersonalizedContent('');
                      setBulkEmailTab('main');
                    }}
                    variant="default"
                    size="sm"
                    disabled={bulkSendEmailMutation.isPending}
                    data-testid="button-bulk-send-email"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button
                    onClick={() => {
                      if (confirm(`Delete ${selectedIds.size} entries? This cannot be undone.`)) {
                        bulkDeleteMutation.mutate(Array.from(selectedIds));
                      }
                    }}
                    variant="destructive"
                    size="sm"
                    disabled={bulkDeleteMutation.isPending}
                    data-testid="button-bulk-delete"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}

            {/* Table */}
            {entriesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredEntries.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === filteredEntries.length && filteredEntries.length > 0}
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Interests</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Email Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id} data-testid={`row-waitlist-${entry.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(entry.id)}
                            onCheckedChange={() => toggleSelect(entry.id)}
                            data-testid={`checkbox-select-${entry.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{entry.firstName}</TableCell>
                        <TableCell className="text-sm">{entry.email}</TableCell>
                        <TableCell className="text-sm">{entry.phone || '-'}</TableCell>
                        <TableCell className="text-sm">{entry.location || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {entry.interests && entry.interests.length > 0
                            ? entry.interests.slice(0, 2).join(', ') + (entry.interests.length > 2 ? '...' : '')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {entry.state}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col gap-1">
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600">
                                  {entry.mainEmailSent ? (
                                    <>
                                      <Checkbox checked disabled />
                                      <span className="text-xs">Main Email</span>
                                    </>
                                  ) : (
                                    <>
                                      <Checkbox disabled />
                                      <span className="text-xs text-muted-foreground">Main Email</span>
                                    </>
                                  )}
                                </div>
                              </HoverCardTrigger>
                              {!entry.mainEmailSent && (
                                <HoverCardContent className="w-auto p-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEmailModal(entry, false)}
                                    data-testid={`button-send-main-email-${entry.id}`}
                                  >
                                    Send Anyway
                                  </Button>
                                </HoverCardContent>
                              )}
                            </HoverCard>
                            {entry.followupsSent && entry.followupsSent > 0 && (
                              <div className="text-xs text-muted-foreground">
                                +{entry.followupsSent} follow-ups sent
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <Button
                                  onClick={() => openEmailModal(entry, true)}
                                  variant="ghost"
                                  size="sm"
                                  disabled={!entry.mainEmailSent}
                                  data-testid={`button-followup-${entry.id}`}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-auto p-2">
                                <span className="text-xs">Send follow-up</span>
                              </HoverCardContent>
                            </HoverCard>
                            <Button
                              onClick={() => {
                                if (confirm(`Delete entry for ${entry.firstName}?`)) {
                                  deleteEntryMutation.mutate(entry.id);
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              disabled={deleteEntryMutation.isPending}
                              data-testid={`button-delete-${entry.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No leads match your filters</p>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Test Email Modal */}
      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>Send a test email to verify your configuration</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="recipient@example.com"
                data-testid="input-test-email"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={testEmailSubject}
                onChange={(e) => setTestEmailSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-test-email-subject"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={testEmailContent}
                onChange={(e) => setTestEmailContent(e.target.value)}
                placeholder="Email content"
                className="min-h-[200px]"
                data-testid="textarea-test-email-content"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setTestEmailOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!testEmail) {
                    toast({ title: 'Error', description: 'Email address is required', variant: 'destructive' });
                    return;
                  }
                  if (!testEmailContent) {
                    toast({ title: 'Error', description: 'Email content is required', variant: 'destructive' });
                    return;
                  }
                  testEmailMutation.mutate({
                    email: testEmail,
                    subject: testEmailSubject,
                    content: testEmailContent
                  });
                  setTestEmailOpen(false);
                  setTestEmail('');
                  setTestEmailSubject('Adam\'s Club - Test Email');
                  setTestEmailContent('This is a test email to verify your SendGrid configuration is working correctly.');
                }}
                disabled={testEmailMutation.isPending || !testEmail || !testEmailContent}
                data-testid="button-send-test-email"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Modal */}
      <Dialog open={bulkEmailOpen} onOpenChange={setBulkEmailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Email to {selectedIds.size} Recipients</DialogTitle>
            <DialogDescription>Choose a template or write your own email</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={bulkEmailSubject}
                onChange={(e) => setBulkEmailSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-bulk-email-subject"
              />
            </div>

            <Tabs value={bulkEmailTab} onValueChange={setBulkEmailTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="main" data-testid="tab-main-email">Main Email</TabsTrigger>
                <TabsTrigger value="personalized" data-testid="tab-personalized-email">Personalized</TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email Content</label>
                  <p className="text-xs text-muted-foreground mb-2">Default template - edit as needed</p>
                  <Textarea
                    value={bulkMainEmailContent}
                    onChange={(e) => setBulkMainEmailContent(e.target.value)}
                    placeholder="Ready-made email template will appear here"
                    className="min-h-[250px]"
                    data-testid="textarea-bulk-main-email"
                  />
                </div>
              </TabsContent>

              <TabsContent value="personalized" className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email Content</label>
                  <Textarea
                    value={bulkPersonalizedContent}
                    onChange={(e) => setBulkPersonalizedContent(e.target.value)}
                    placeholder="Write your custom email content here..."
                    className="min-h-[250px]"
                    data-testid="textarea-bulk-personalized-email"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                This email will be sent to {selectedIds.size} selected recipient{selectedIds.size !== 1 ? 's' : ''} as a {bulkEmailTab === 'main' ? 'main' : 'personalized'} email
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setBulkEmailOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const content = bulkEmailTab === 'main' ? bulkMainEmailContent : bulkPersonalizedContent;
                  if (!content) {
                    toast({ title: 'Error', description: 'Email content is required', variant: 'destructive' });
                    return;
                  }
                  bulkSendEmailMutation.mutate({
                    leadIds: Array.from(selectedIds),
                    subject: bulkEmailSubject,
                    content: content,
                    emailType: bulkEmailTab === 'main' ? 'main' : 'followup'
                  });
                }}
                disabled={bulkSendEmailMutation.isPending || (!bulkMainEmailContent && !bulkPersonalizedContent)}
                data-testid="button-send-bulk-email"
              >
                <Send className="h-4 w-4 mr-2" />
                Send to All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {followupNumber === 0 ? 'Generate Main Email' : `Send Follow-up #${followupNumber}`}
            </DialogTitle>
            <DialogDescription>
              To: {selectedLead?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-email-subject"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Email content"
                className="min-h-[200px]"
                data-testid="textarea-email-content"
              />
            </div>

            <div className="flex gap-2">
              {followupNumber === 0 && (
                <Button
                  onClick={() => generateAIEmailMutation.mutate(selectedLead!.id)}
                  disabled={generateAIEmailMutation.isPending}
                  variant="outline"
                  data-testid="button-generate-ai-email"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Generate with AI
                </Button>
              )}
              <Button
                onClick={() => testEmailMutation.mutate({ email: selectedLead?.email, subject: emailSubject, content: emailContent })}
                disabled={testEmailMutation.isPending || !emailContent}
                variant="outline"
                data-testid="button-test-email"
              >
                <Mail className="h-4 w-4 mr-2" />
                Test Email
              </Button>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setEmailModalOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!emailContent) {
                    toast({ title: 'Error', description: 'Email content is required', variant: 'destructive' });
                    return;
                  }
                  sendEmailMutation.mutate({
                    leadId: selectedLead!.id,
                    subject: emailSubject,
                    content: emailContent,
                    emailType: followupNumber === 0 ? 'main' : 'followup',
                    followupNum: followupNumber
                  });
                }}
                disabled={sendEmailMutation.isPending || !emailContent}
                data-testid="button-send-email"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
