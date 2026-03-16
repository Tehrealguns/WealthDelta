import { type ReactNode } from "react"
import { ArrowRightIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className,
      )}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  description,
  href,
  cta,
  accentColor,
}: {
  name: string
  className: string
  background: ReactNode
  description: string
  href: string
  cta: string
  accentColor?: string
}) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-end overflow-hidden rounded-xl",
      "border border-white/[0.06] bg-[#0a0a0a]",
      "transform-gpu",
      className,
    )}
  >
    <div>{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-2 p-6 transition-all duration-300 group-hover:-translate-y-10">
      <div className={cn("h-px w-8 rounded-full", accentColor ?? "bg-white/20")} />
      <h3 className="text-base font-medium text-white/80 tracking-tight">
        {name}
      </h3>
      <p className="max-w-lg text-white/25 text-[13px] leading-relaxed">{description}</p>
    </div>

    <div
      className={cn(
        "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
      )}
    >
      <a
        href={href}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-white/40 hover:bg-white/5 hover:text-white transition-colors"
      >
        {cta}
        <ArrowRightIcon className="h-3 w-3" />
      </a>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-white/[0.015]" />
  </div>
)

export { BentoCard, BentoGrid }
