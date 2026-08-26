import Link from "next/link";
import { register } from "@/app/auth/actions";
import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";
import { getI18n } from "@/lib/i18n/server";

export default async function RegisterPage() {
  const { t } = await getI18n();
  return (
    <AuthCard
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      backLabel={t("auth.backHome")}
      footer={
        <>
          {t("auth.haveAccount")} {" "}
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            {t("auth.loginLink")}
          </Link>
        </>
      }
    >
      <AuthForm action={register} submitLabel={t("auth.registerSubmit")} />
    </AuthCard>
  );
}
