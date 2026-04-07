'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, CreditCard, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import type { OnboardingSettings } from '@/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<OnboardingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('onboarding_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setSettings(data);
      setNotificationEmail(data.notification_email || '');
      setBusinessName(data.business_name || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('onboarding_settings')
      .update({
        notification_email: notificationEmail,
        business_name: businessName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings?.id);

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved!');
      loadSettings();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[#8B7080]">Loading settings...</p>
      </div>
    );
  }

  const gmailConnected = !!settings?.google_access_token;
  const squareConnected = !!settings?.square_access_token;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#6B3A5E]">Settings</h1>
        <p className="text-sm text-[#8B7080] mt-1">Configure your onboarding portal</p>
      </div>

      <div className="space-y-6">
        {/* Business Info */}
        <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#6B3A5E] text-base">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[#5C4A42] text-sm">Business Name</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#5C4A42] text-sm">Notification Email</Label>
              <Input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="your@email.com"
                className="rounded-xl border-[#E8D8E0] focus:border-[#B5648A]"
              />
              <p className="text-xs text-[#8B7080]">You&apos;ll receive notifications at this address</p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-[#B5648A] to-[#9B4D73] text-white gap-2"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Email Integration */}
        <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
              <Mail size={18} />
              Email (Gmail)
            </CardTitle>
            <Badge className={`rounded-full text-xs px-2.5 py-0.5 border-0 ${
              gmailConnected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {gmailConnected ? (
                <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Connected</span>
              ) : (
                <span className="flex items-center gap-1"><AlertCircle size={12} /> Not Connected</span>
              )}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#8B7080] mb-4">
              Connect your Gmail account to send onboarding emails directly from your email address.
            </p>
            <Button
              variant="outline"
              className="rounded-xl border-[#E8D8E0] text-[#6B3A5E] hover:bg-[#F5EDF1] gap-2"
              onClick={() => window.location.href = '/api/integrations/authorize/google'}
            >
              <Mail size={16} />
              {gmailConnected ? 'Reconnect Gmail' : 'Connect Gmail'}
            </Button>
          </CardContent>
        </Card>

        {/* Square Integration */}
        <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#6B3A5E] text-base flex items-center gap-2">
              <CreditCard size={18} />
              Payment (Square)
            </CardTitle>
            <Badge className={`rounded-full text-xs px-2.5 py-0.5 border-0 ${
              squareConnected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {squareConnected ? (
                <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Connected</span>
              ) : (
                <span className="flex items-center gap-1"><AlertCircle size={12} /> Not Connected</span>
              )}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#8B7080] mb-4">
              Connect your Square account to accept payments from clients after they sign their contract.
            </p>
            <Button
              variant="outline"
              className="rounded-xl border-[#E8D8E0] text-[#6B3A5E] hover:bg-[#F5EDF1] gap-2"
              onClick={() => window.location.href = '/api/integrations/authorize/square'}
            >
              <CreditCard size={16} />
              {squareConnected ? 'Reconnect Square' : 'Connect Square'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
