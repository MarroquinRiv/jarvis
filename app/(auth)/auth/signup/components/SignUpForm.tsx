import Link from "next/link";

// Legacy signup form — redirect users to the new /register page
export function SignUpForm() {
  return (
    <div className="mx-auto max-w-sm p-6">
      <p className="text-center">This auth UI has moved. <Link href="/register" className="underline">Go to the new register page</Link>.</p>
    </div>
  );
}