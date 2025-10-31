import { redirect } from 'next/navigation'

export default function OldLoginPage() {
  // Redirect legacy/auth grouped route to the new /login page
  redirect('/login')
}