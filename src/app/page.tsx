import { redirect } from "next/navigation"

// Root — middleware redirects unauthenticated users to /login
// Authenticated users land at /dashboard (D-01)
export default function RootPage() {
  redirect("/dashboard")
}
