import Link from "next/link";
import { login } from "@/app/auth/actions";
import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <AuthCard
      title="Bentornata"
      subtitle="Zaloguj się do swojego centrum dowodzenia."
      footer={
        <>
          Nie masz jeszcze konta?{" "}
          <Link
            href="/register"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Załóż je
          </Link>
        </>
      }
    >
      <AuthForm action={login} submitLabel="Zaloguj się" />
    </AuthCard>
  );
}
