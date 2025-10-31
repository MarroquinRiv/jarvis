import { redirect } from 'next/navigation'

export default function OldSignUpPage() {
  // Redirect legacy grouped signup page to the new /register route
  redirect('/register')
}