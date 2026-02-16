import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, AlertCircle, CheckCircle2, Copy, ExternalLink, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface EmailConfig {
  sendgridApiKey: string;
  sendgridFromEmail: string;
}

export default function AdminEmailConfig() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: config, isLoading: configLoading } = useQuery<EmailConfig>({
    queryKey: ['/api/admin/email-config']
  });

  const isConfigured = config?.sendgridApiKey && config?.sendgridFromEmail && config.sendgridApiKey !== '***hidden***';

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied', description: `${field} copied to clipboard` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (configLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Configuration</h1>
          <p className="text-muted-foreground mt-2">Manage email service settings</p>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => setLocation('/admin/waitlist')}
          variant="ghost"
          size="sm"
          className="gap-2"
          data-testid="button-back-to-waitlist"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Waitlist
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold">Email Configuration</h1>
        <p className="text-muted-foreground mt-2">Configure SendGrid for automated email delivery</p>
      </div>

      {/* Status Alert */}
      {isConfigured ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            SendGrid is properly configured and ready to send emails.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            SendGrid is not configured yet. Follow the instructions below to set it up.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Current Configuration
          </CardTitle>
          <CardDescription>Your SendGrid settings (read-only)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">SENDGRID_API_KEY</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-background px-2 py-1 rounded flex-1 truncate">
                  {isConfigured ? '••••••••••••••••' : 'Not configured'}
                </code>
                {isConfigured && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('SENDGRID_API_KEY', 'Key Name')}
                    data-testid="button-copy-api-key-name"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">SENDGRID_FROM_EMAIL</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-background px-2 py-1 rounded flex-1 truncate">
                  {config?.sendgridFromEmail || 'Not configured'}
                </code>
                {config?.sendgridFromEmail && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(config.sendgridFromEmail, 'Email')}
                    data-testid="button-copy-from-email"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>Follow these steps to configure SendGrid</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Get SendGrid API Key */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Get SendGrid API Key</h3>
                <ol className="text-sm text-muted-foreground space-y-2 mt-2 ml-4 list-decimal">
                  <li>Go to <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">SendGrid API Keys Page <ExternalLink className="h-3 w-3" /></a></li>
                  <li>Sign in to your SendGrid account (create one if needed)</li>
                  <li>Click the <strong>"Create API Key"</strong> button (top right)</li>
                  <li>Give it a name like <code className="bg-muted px-1 rounded">"Adams Club"</code></li>
                  <li>Select <strong>"Full Access"</strong> for permissions</li>
                  <li>Click <strong>"Create & View"</strong></li>
                  <li><strong>Copy the API key immediately</strong> - you won't see it again!</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 2: Get From Email */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Verify Sender Email</h3>
                <ol className="text-sm text-muted-foreground space-y-2 mt-2 ml-4 list-decimal">
                  <li>Go to SendGrid <strong>Settings → Sender Authentication</strong></li>
                  <li>Click <strong>"Verify a Single Sender"</strong></li>
                  <li>Enter your email (e.g., <code className="bg-muted px-1 rounded">noreply@yourcompany.com</code>)</li>
                  <li>Check your email inbox for verification link</li>
                  <li>Click the verification link</li>
                  <li>Copy the verified email address</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 3: Add to Replit Secrets */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Add Secrets to Replit</h3>
                <ol className="text-sm text-muted-foreground space-y-2 mt-2 ml-4 list-decimal">
                  <li>In your Replit workspace, click the <strong>lock icon</strong> (Secrets) on the left sidebar</li>
                  <li>Click <strong>"New Secret"</strong></li>
                  <li>Add these two secrets:
                    <div className="bg-muted p-3 rounded mt-2 space-y-2">
                      <div>
                        <p className="font-mono text-xs font-semibold">Key:</p>
                        <code className="bg-background px-2 py-1 rounded text-xs block">SENDGRID_API_KEY</code>
                        <p className="font-mono text-xs font-semibold mt-1">Value:</p>
                        <code className="bg-background px-2 py-1 rounded text-xs block">SG.xxxxxxxxxxxxxxxx... (your API key)</code>
                      </div>
                      <div className="border-t pt-2">
                        <p className="font-mono text-xs font-semibold">Key:</p>
                        <code className="bg-background px-2 py-1 rounded text-xs block">SENDGRID_FROM_EMAIL</code>
                        <p className="font-mono text-xs font-semibold mt-1">Value:</p>
                        <code className="bg-background px-2 py-1 rounded text-xs block">noreply@yourcompany.com</code>
                      </div>
                    </div>
                  </li>
                  <li>Click "Add Secret" for each one</li>
                  <li><strong>Replit will automatically restart your app</strong> with the new secrets</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 4: Verify */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Test Your Configuration</h3>
                <p className="text-sm text-muted-foreground mt-2">Once secrets are added, go to the <strong>Waitlist Management</strong> page and click the "Test Email" button to verify everything is working.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-amber-900">
          <p>
            ✓ API keys are encrypted and stored securely in Replit Secrets<br />
            ✓ Never share your SendGrid API key publicly<br />
            ✓ Changes to secrets take effect after app restarts (automatic)<br />
            ✓ Only admin users can access this configuration page<br />
            ✓ Free SendGrid accounts can send up to 100 emails per day
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
