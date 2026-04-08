'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UserPlus, FileText, CheckCircle2, Send, PenTool, CreditCard, Users,
  ArrowRight, Mail, Upload, StickyNote, Settings, LayoutDashboard, Sparkles, Eye, Bell,
  MessageSquare, Globe
} from 'lucide-react';

const SECTIONS = [
  {
    id: 'overview',
    title: 'Platform Overview',
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <p>
          Your Client Onboarding Portal automates the entire process of bringing new clients into
          The Lotus Program Experience. Instead of sending documents back and forth over email,
          everything happens in one place.
        </p>
        <p>
          The portal has two main areas:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-[#F5EDF1] border border-[#E8D8E0]/50">
            <div className="flex items-center gap-2 mb-2">
              <LayoutDashboard size={16} className="text-[#B5648A]" />
              <span className="font-medium text-[#6B3A5E] text-sm">Dashboard</span>
            </div>
            <p className="text-xs text-[#8B7080]">
              Where you add new clients and track them through the onboarding process (documents, contract, payment).
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F5EDF1] border border-[#E8D8E0]/50">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-[#B5648A]" />
              <span className="font-medium text-[#6B3A5E] text-sm">Clients</span>
            </div>
            <p className="text-xs text-[#8B7080]">
              Where all your active clients live. View their profiles, upload documents, and keep notes.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'new-client',
    title: 'Adding a New Client (Onboarding)',
    icon: UserPlus,
    content: (
      <div className="space-y-4">
        <p>
          When you have a new client who needs to go through the full onboarding process:
        </p>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#B5648A] text-white text-xs font-semibold flex items-center justify-center">1</span>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Go to Dashboard and click &quot;Add New Client&quot;</p>
              <p className="text-xs text-[#8B7080]">Enter their name, email, and phone number. A welcome email is automatically sent to them with a link to their personal portal.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#B5648A] text-white text-xs font-semibold flex items-center justify-center">2</span>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Client fills out and signs their intake documents</p>
              <p className="text-xs text-[#8B7080]">They open the link from the email, verify their email, then fill out the intake form and sign all documents. You get a notification email when they submit.</p>
              <div className="mt-2 flex gap-2 p-2.5 rounded-xl bg-[#F5EDF1] border border-[#E8D8E0]/60">
                <Eye size={13} className="text-[#B5648A] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#8B7080]">
                  You can track when your client opens their portal and how many times they&apos;ve visited.
                  This information appears on the client&apos;s page under <strong className="text-[#6B3A5E]">Portal Activity</strong>.
                </p>
              </div>
              <div className="mt-2 flex gap-2 p-2.5 rounded-xl bg-[#F5EDF1] border border-[#E8D8E0]/60">
                <Bell size={13} className="text-[#B5648A] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#8B7080]">
                  If a client hasn&apos;t completed a step, click <strong className="text-[#6B3A5E]">Send Reminder</strong> on their profile to send them a friendly nudge email.
                </p>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#B5648A] text-white text-xs font-semibold flex items-center justify-center">3</span>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">You review and approve their documents</p>
              <p className="text-xs text-[#8B7080]">Click on the client in your Dashboard, review their signed documents, and click &quot;Approve Packet 1&quot;.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#B5648A] text-white text-xs font-semibold flex items-center justify-center">4</span>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Select the service type and send the contract</p>
              <p className="text-xs text-[#8B7080]">Choose Birth Doula, Postpartum Doula, or Death Doula. Enter the payment amount. Click &quot;Send Contract&quot;. The client gets an email with a link to sign their contract.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#B5648A] text-white text-xs font-semibold flex items-center justify-center">5</span>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Client signs the contract</p>
              <p className="text-xs text-[#8B7080]">They open their portal, review the contract for their service, and sign it electronically.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#B5648A] text-white text-xs font-semibold flex items-center justify-center">6</span>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Send a Square invoice and confirm payment</p>
              <p className="text-xs text-[#8B7080]">Send them a Square invoice from your Square app for the agreed amount. When they pay, the system will try to detect it automatically. You can also click &quot;Confirm Payment&quot; on the client&apos;s page to confirm manually.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-600] text-white text-xs font-semibold flex items-center justify-center">
              <CheckCircle2 size={14} />
            </span>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Client is now Active!</p>
              <p className="text-xs text-[#8B7080]">They automatically move to your Clients tab with a full profile. Their signed documents and all onboarding history come with them.</p>
            </div>
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: 'existing-client',
    title: 'Adding an Existing Client',
    icon: Users,
    content: (
      <div className="space-y-4">
        <p>
          If you already have clients who went through onboarding before this system was set up:
        </p>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#B5648A] text-white text-xs font-semibold flex items-center justify-center">1</span>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Go to the Clients tab and click &quot;Add Client&quot;</p>
              <p className="text-xs text-[#8B7080]">This adds them directly as an active client (skips the onboarding pipeline).</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#B5648A] text-white text-xs font-semibold flex items-center justify-center">2</span>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Fill in their details</p>
              <p className="text-xs text-[#8B7080]">Enter name, email, phone, service type, and any notes. No email is sent to the client.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#B5648A] text-white text-xs font-semibold flex items-center justify-center">3</span>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Upload their documents and add notes</p>
              <p className="text-xs text-[#8B7080]">Click on the client to open their profile. Use the Documents tab to upload any existing paperwork and the Notes tab to add any important information.</p>
            </div>
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: 'client-profile',
    title: 'Managing Client Profiles',
    icon: FileText,
    content: (
      <div className="space-y-4">
        <p>
          Every active client has a full profile with four tabs:
        </p>
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-[#E8D8E0]/50 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-[#B5648A]" />
              <span className="font-medium text-[#6B3A5E] text-sm">Info Tab</span>
            </div>
            <p className="text-xs text-[#8B7080]">
              View and edit their personal information (phone, address, date of birth, emergency contact) and
              service details (service type, payment amount). Click &quot;Edit&quot; on any card to make changes.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[#E8D8E0]/50 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Upload size={16} className="text-[#B5648A]" />
              <span className="font-medium text-[#6B3A5E] text-sm">Documents Tab</span>
            </div>
            <p className="text-xs text-[#8B7080]">
              See all documents the client signed during onboarding. Click the <strong>eye icon</strong> on any document
              to preview it. You can <strong>print or save as PDF</strong> from the viewer. Upload additional documents by clicking
              &quot;Upload&quot;. Uploaded documents are <strong>private by default</strong> — click the bell icon to
              toggle visibility so the client can see it in their portal.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[#E8D8E0]/50 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote size={16} className="text-[#B5648A]" />
              <span className="font-medium text-[#6B3A5E] text-sm">Notes Tab (Private)</span>
            </div>
            <p className="text-xs text-[#8B7080]">
              Keep a running log of private notes about the client. These are <strong>only visible to you</strong> and
              never shown in the client portal. Great for tracking conversations, preferences, and internal details.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[#E8D8E0]/50 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={16} className="text-[#B5648A]" />
              <span className="font-medium text-[#6B3A5E] text-sm">Messages (Two-Way Chat)</span>
            </div>
            <p className="text-xs text-[#8B7080]">
              A real-time conversation thread with the client. You send messages, and clients can reply from their portal.
              You&apos;ll see a notification bell when clients send new messages. You can share payment links and
              other info directly in the chat.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'payments',
    title: 'How Payments Work',
    icon: CreditCard,
    content: (
      <div className="space-y-4">
        <p>
          Payments are handled through your existing Square account. You can now paste a Square payment link
          directly into the portal so clients can pay with one click.
        </p>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#F5EDF1] flex items-center justify-center">
              <CreditCard size={14} className="text-[#B5648A]" />
            </div>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Paste the Square payment link</p>
              <p className="text-xs text-[#8B7080]">After the client signs their contract, paste their Square payment link into the &quot;Square Payment Link&quot; field on the client&apos;s page. Click &quot;Save & Notify&quot; to save it and send an email to the client.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#F5EDF1] flex items-center justify-center">
              <Globe size={14} className="text-[#B5648A]" />
            </div>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Client pays through their portal</p>
              <p className="text-xs text-[#8B7080]">The client receives an email and sees a &quot;Pay Now&quot; button in their portal that opens the Square payment page.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-green-600" />
            </div>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Payment is detected automatically</p>
              <p className="text-xs text-[#8B7080]">When Square sends you a payment confirmation email, the system detects it and automatically moves the client to Active status.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <PenTool size={14} className="text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-[#5C4A42] text-sm">Manual fallback</p>
              <p className="text-xs text-[#8B7080]">If the auto-detection misses a payment, just click the &quot;Confirm Payment&quot; button on the client&apos;s page in the Dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'emails',
    title: 'Email Notifications',
    icon: Mail,
    content: (
      <div className="space-y-4">
        <p>
          The portal sends emails automatically at key moments. Make sure Gmail is connected in Settings.
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
            <ArrowRight size={14} className="text-[#B5648A] flex-shrink-0" />
            <p className="text-xs text-[#5C4A42]"><strong>Welcome email</strong> sent when you add a new client with their portal link</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
            <ArrowRight size={14} className="text-[#B5648A] flex-shrink-0" />
            <p className="text-xs text-[#5C4A42]"><strong>Contract ready email</strong> sent when you approve documents and send the contract</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
            <ArrowRight size={14} className="text-[#B5648A] flex-shrink-0" />
            <p className="text-xs text-[#5C4A42]"><strong>Notification to you</strong> when a client submits their intake documents</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
            <Bell size={14} className="text-[#B5648A] flex-shrink-0" />
            <p className="text-xs text-[#5C4A42]"><strong>Reminder email</strong> sent when you click &quot;Send Reminder&quot; on a client&apos;s profile, nudging them to complete their current step</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
            <MessageSquare size={14} className="text-[#B5648A] flex-shrink-0" />
            <p className="text-xs text-[#5C4A42]"><strong>Portal update email</strong> (optional) sent when you send a message, upload a document, or set a payment link, if you choose &quot;Yes, Notify&quot;</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
            <CreditCard size={14} className="text-[#B5648A] flex-shrink-0" />
            <p className="text-xs text-[#5C4A42]"><strong>Payment link email</strong> sent automatically when you save a payment link for a client</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'portal',
    title: 'Client Portal',
    icon: Globe,
    content: (
      <div className="space-y-4">
        <p>
          Clients have access to their portal from day one — not just after payment. During onboarding, they see their
          progress steps plus quick links to Documents, Messages, and Payment. Once active, the progress steps go away
          and the portal becomes their ongoing hub.
        </p>
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-[#E8D8E0]/50 bg-white">
            <p className="font-medium text-[#6B3A5E] text-sm mb-1">What clients see:</p>
            <ul className="text-xs text-[#8B7080] space-y-1.5 list-disc list-inside">
              <li><strong>Home</strong> with onboarding progress (if still onboarding) + quick links</li>
              <li><strong>Documents</strong> showing their signed intake docs + any files you&apos;ve shared (toggled visible)</li>
              <li><strong>Messages</strong> two-way chat where clients can message you and you can reply</li>
              <li><strong>Payment</strong> with a &quot;Pay Now&quot; button (only visible if you set a payment link)</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl border border-[#E8D8E0]/50 bg-white">
            <p className="font-medium text-[#6B3A5E] text-sm mb-1">Notes vs Messages:</p>
            <ul className="text-xs text-[#8B7080] space-y-1.5 list-disc list-inside">
              <li><strong>Notes</strong> are private and only visible to you</li>
              <li><strong>Messages</strong> are visible to the client in their portal — you can share payment links directly in messages</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl border border-[#E8D8E0]/50 bg-white">
            <p className="font-medium text-[#6B3A5E] text-sm mb-1">Document visibility:</p>
            <ul className="text-xs text-[#8B7080] space-y-1.5 list-disc list-inside">
              <li>Uploaded documents are <strong>private by default</strong></li>
              <li>Click the <strong>eye icon</strong> to preview a document</li>
              <li>Click the <strong>bell icon</strong> to share it with the client</li>
              <li>Toggle the bell off again to hide it from the client&apos;s portal</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    content: (
      <div className="space-y-4">
        <p>
          The Settings page lets you configure your portal:
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
            <Mail size={14} className="text-[#B5648A] flex-shrink-0" />
            <p className="text-xs text-[#5C4A42]"><strong>Gmail Integration</strong> connects your Gmail so the portal can send emails on your behalf. Click &quot;Connect Gmail&quot; and sign in with your Google account.</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
            <Settings size={14} className="text-[#B5648A] flex-shrink-0" />
            <p className="text-xs text-[#5C4A42]"><strong>Business Name &amp; Notification Email</strong> control what name appears on emails and where you receive notifications.</p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#6B3A5E]">How Your Portal Works</h1>
        <p className="text-sm text-[#8B7080] mt-1">
          A step-by-step guide to managing your client onboarding
        </p>
      </div>

      {/* Section Nav */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-[#B5648A] text-white shadow-md shadow-[#B5648A]/20'
                  : 'bg-white text-[#8B7080] border border-[#E8D8E0] hover:bg-[#F5EDF1]'
              }`}
            >
              <Icon size={14} />
              {section.title}
            </button>
          );
        })}
      </div>

      {/* Active Section Content */}
      {SECTIONS.map((section) => {
        if (section.id !== activeSection) return null;
        const Icon = section.icon;
        return (
          <Card key={section.id} className="rounded-2xl border-[#E8D8E0]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#6B3A5E] text-lg flex items-center gap-2">
                <Icon size={20} className="text-[#B5648A]" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[#5C4A42] leading-relaxed">
              {section.content}
            </CardContent>
          </Card>
        );
      })}

      {/* Quick Reference */}
      <Card className="rounded-2xl border-[#E8D8E0]/50 shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-[#6B3A5E] text-base">Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
              <p className="font-medium text-[#6B3A5E] mb-1">New client onboarding</p>
              <p className="text-[#8B7080]">Dashboard → Add New Client</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
              <p className="font-medium text-[#6B3A5E] mb-1">Add existing client</p>
              <p className="text-[#8B7080]">Clients → Add Client</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
              <p className="font-medium text-[#6B3A5E] mb-1">View client profile</p>
              <p className="text-[#8B7080]">Clients → click on a client</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FDF8F5] border border-[#E8D8E0]/50">
              <p className="font-medium text-[#6B3A5E] mb-1">Connect Gmail</p>
              <p className="text-[#8B7080]">Settings → Connect Gmail</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
