import { redirect } from "next/navigation";
import { Brand } from "@/components/Shell";
import { CardForm } from "@/components/CardForm";
import { currentUser } from "@/lib/session";

export default async function Onboarding() {
  const user = await currentUser();
  if (!user) redirect("/");
  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      <Brand small />
      <h1 className="mt-8 font-serif text-3xl leading-tight">Make your card</h1>
      <p className="mt-2 text-ink-soft">
        You write it once, and it goes with you to every café. No photo and no age shown: just a nickname and three
        lines about you.
      </p>
      <div className="mt-8">
        <CardForm
          from="onboarding"
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
      </div>
    </div>
  );
}
