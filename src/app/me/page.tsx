import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { CardForm } from "@/components/CardForm";
import { currentUser } from "@/lib/session";

export default async function Me() {
  const user = await currentUser();
  if (!user) redirect("/");
  return (
    <Shell active="me">
      <h1 className="font-serif text-3xl">Your card</h1>
      <p className="mb-6 mt-1 text-ink-soft">The same card goes with you to every café.</p>
      <CardForm
        from="me"
        initial={{
          nickname: user.nickname ?? "",
          realName: user.realName,
          showRealName: user.showRealName,
          promptInto: user.promptInto ?? "",
          promptAsk: user.promptAsk ?? "",
          promptMeet: user.promptMeet ?? "",
          birthdate: user.birthdate,
          ageVerified: user.ageVerified,
          ageMin: user.ageMin,
          ageMax: user.ageMax,
          onlyVerified: user.onlyVerified,
        }}
      />
      <form action="/api/auth/logout" method="post" className="mt-10">
        <button className="w-full rounded-full border border-line px-6 py-3 text-sm text-ink-soft hover:text-ink">
          Sign out
        </button>
      </form>
    </Shell>
  );
}
