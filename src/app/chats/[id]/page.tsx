import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Chat } from "@/components/Chat";
import { connectionFor, displayName } from "@/lib/circle";
import { currentUser } from "@/lib/session";

export default async function ChatPage(props: PageProps<"/chats/[id]">) {
  const user = await currentUser();
  if (!user) redirect("/");
  const { id } = await props.params;
  const conn = await connectionFor(user.id, id);
  if (!conn) notFound();

  return (
    <Shell back={{ href: "/home", label: "Home" }}>
      <div className="mb-3">
        <h1 className="font-serif text-2xl">{displayName(conn.other)}</h1>
        <p className="text-sm text-ink-soft">
          You both said hi in {conn.cafe.name}&apos;s circle. {conn.other.ageVerified ? "" : "Their age is unverified."}
        </p>
      </div>
      <Chat
        connectionId={conn.connection.id}
        otherName={displayName(conn.other)}
        cafes={{ [conn.cafe.id]: conn.cafe.name }}
      />
    </Shell>
  );
}
