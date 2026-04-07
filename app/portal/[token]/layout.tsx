import Image from 'next/image';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F5] via-white to-[#F5EDF1]">
      {/* Header */}
      <header className="border-b border-[#E8D8E0]/50 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Image src="/logo.png" alt="The Lotus Program Experience" width={48} height={48} />
          <div>
            <h1 className="text-base font-semibold text-[#6B3A5E]">The Lotus Program Experience</h1>
            <p className="text-xs text-[#B5648A]">Client Onboarding Portal</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8D8E0]/50 bg-white/50 mt-auto">
        <div className="max-w-3xl mx-auto px-6 py-4 text-center">
          <p className="text-xs text-[#8B7080]">
            &copy; {new Date().getFullYear()} The Lotus Program Experience. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
