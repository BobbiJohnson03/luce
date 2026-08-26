import Link from "next/link";
import { login } from "@/app/auth/actions";
import { AuthCard } from "@/components/AuthCard";
import { AuthForm } from "@/components/AuthForm";
import { getI18n } from "@/lib/i18n/server";

export default async function LoginPage() {
  const { t } = await getI18n();
  return (
    <AuthCard
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      backLabel={t("auth.backHome")}
      footer={
        <>
          {t("auth.noAccount")} {" "}
          <Link
            href="/register"
            className="text-foreground underline-offset-4 hover:underline"
          >
            {t("auth.createAccountLink")}
          </Link>
        </>
      }
    >
      <AuthForm action={login} submitLabel={t("auth.loginSubmit")} />
    </AuthCard>
  );
}
