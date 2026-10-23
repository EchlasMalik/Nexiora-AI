// Shared decorative background for the sign-in / sign-up / password pages,
// echoing the landing hero so leaving the marketing site doesn't feel like a
// context switch.
export function AuthBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <div className="bg-grid absolute inset-0" />
      <div className="absolute -top-48 left-1/2 h-96 w-3xl -translate-x-1/2 rounded-full bg-violet-400/25 blur-[100px]" />
    </div>
  )
}
