import { useParams, useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { token } = useParams();
  const [, navigate] = useLocation();
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenData, setTokenData] = useState<{ userEmail?: string; tempPassword?: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' }
  });

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-token/${token}`);
        const data = await response.json();
        
        if (response.ok && data.valid) {
          setTokenValid(true);
          setTokenData(data);
        } else {
          setTokenValid(false);
          toast({ title: 'Error', description: 'Invalid or expired reset link', variant: 'destructive' });
        }
      } catch (error) {
        setTokenValid(false);
        toast({ title: 'Error', description: 'Failed to validate reset link', variant: 'destructive' });
      }
    };

    if (token) {
      validateToken();
    }
  }, [token, toast]);

  const resetMutation = useMutation({
    mutationFn: (newPassword: string) =>
      apiRequest('POST', `/api/auth/reset-password/${token}`, { newPassword }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Password reset successful. Redirecting to login...' });
      setTimeout(() => navigate('/auth'), 2000);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to reset password',
        variant: 'destructive' 
      });
    }
  });

  const onSubmit = (data: ResetPasswordForm) => {
    resetMutation.mutate(data.newPassword);
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">This password reset link is invalid or has expired.</p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Account Email</p>
            <p className="text-sm text-muted-foreground">{tokenData?.userEmail}</p>
          </div>

          <div className="space-y-2 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Temporary Password</p>
            <p className="text-sm font-mono text-muted-foreground">{tokenData?.tempPassword}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        {...field}
                        data-testid="input-new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm password"
                        {...field}
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={resetMutation.isPending}
                className="w-full"
                data-testid="button-submit-reset"
              >
                {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
