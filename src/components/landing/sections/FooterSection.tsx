import Link from 'next/link';

export function FooterSection() {
  return (
    <footer className="relative border-t border-white/[0.04] bg-black/40 py-8 px-6 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-4 rounded bg-gradient-to-br from-[#CA8A04] to-[#a16c03]" />
          <span className="text-[11px] text-white/20">
            &copy; {new Date().getFullYear()} WealthDelta
          </span>
        </div>
        <div className="flex items-center gap-6 text-[11px] text-white/20">
          <Link href="/login" className="cursor-pointer transition-colors hover:text-white/40">
            Sign In
          </Link>
          <Link href="/signup" className="cursor-pointer transition-colors hover:text-white/40">
            Get Started
          </Link>
        </div>
      </div>
    </footer>
  );
}
