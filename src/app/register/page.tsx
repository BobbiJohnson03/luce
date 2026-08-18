import Link from "next/link";
import { register } from "@/app/auth/actions";
import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Crea la tua Luce"
      subtitle="Załóż konto i zbuduj swoje centrum dowodzenia."
      footer={
        <>
          Masz już konto?{" "}
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Zaloguj się
          </Link>
        </>
      }
    >
      <AuthForm action={register} submitLabel="Załóż konto" />
    </AuthCard>
  );
}
