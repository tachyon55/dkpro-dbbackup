// Auth layout — no sidebar, centered content, light mode only (D-25)
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      {children}
    </div>
  )
}
