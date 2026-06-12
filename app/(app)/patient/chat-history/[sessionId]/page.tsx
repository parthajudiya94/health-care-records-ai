import { ChatHistorySessionClient } from "@/components/patient/ChatHistorySessionClient";

export default async function ChatHistorySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ChatHistorySessionClient sessionId={sessionId} />;
}

