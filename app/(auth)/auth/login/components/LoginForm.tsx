import Link from "next/link"

// Legacy component: redirect users to the new /login route
export function LoginForm() {
  return (
    <div className="mx-auto max-w-sm p-6">
      <p className="text-center">This auth UI has moved. <Link href="/login" className="underline">Go to the new login page</Link>.</p>
    </div>
  )
}