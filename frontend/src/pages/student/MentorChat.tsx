import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { useToast, extractErrorMessage } from "../../lib/toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button, Card, Input, PageHeader, Spinner } from "../../components/ui";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function StudentMentorChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your AI career mentor. Ask me about career paths, skills to learn, or interview prep." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const { push } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const { data } = await api.post("/ai/chat", { sessionId, message: text });
      const result = data.data;
      if (result.sessionId) setSessionId(result.sessionId);
      const reply = result.reply ?? result.message ?? "…";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      push(extractErrorMessage(err), "error");
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Mentor Chat" subtitle="Get personalized career guidance from your AI mentor." />
      <Card className="flex h-[65vh] flex-col p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user" ? "bg-brand-600 text-white" : "bg-surface-3 text-ink"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-surface-3 px-4 py-2.5 text-ink-muted">
                <Spinner size={14} /> thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-stroke p-4">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask your mentor anything…" />
          <Button type="submit" loading={sending}>Send</Button>
        </form>
      </Card>
    </DashboardLayout>
  );
}
