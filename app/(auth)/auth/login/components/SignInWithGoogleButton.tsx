"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const SignInWithGoogleButton = () => {
  return (
    <Link href="/login" className="block">
      <Button type="button" variant="outline" className="w-full">
        Continue with Google
      </Button>
    </Link>
  )
}

export default SignInWithGoogleButton;