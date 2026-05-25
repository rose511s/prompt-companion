import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X, Send, Sparkles, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { sendChat } from "@/lib/chat.functions";
import {
  loadChatHistory,
  saveChatMessages,
  clearChatHistory,
} from "@/lib/chat-history.functions";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "👋 Hi! I'm your Prompt Directory assistant. Ask me how to use the app, how CO-STAR / Few-Shot / Chain-of-Thought work, or paste a prompt and I'll help you refine it.",
};

export function HelpChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const send = useServerFn(sendChat);
  const loadHistory = useServerFn(loadChatHistory);
  const saveMsgs = useServerFn(saveChatMessages);
  const clearHistory = useServerFn(clearChatHistory);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Load persisted history the first time the chat opens for a signed-in user.
  useEffect(() => {
    if (!open || !user || hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await loadHistory();
        if (cancelled) return;
        const persisted = (res.messages ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        setMessages(persisted.length > 0 ? [GREETING, ...persisted] : [GREETING]);
      } catch (e) {
        console.error("chat history load failed", e);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user, hydrated, loadHistory]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const payload = next.filter((m) => m !== GREETING).slice(-20);
      const res = await send({ data: { messages: payload } });
      if (res.ok) {
        const assistantMsg: Msg = { role: "assistant", content: res.reply || "..." };
        setMessages((m) => [...m, assistantMsg]);
        // Persist the exchange (user + assistant)
        saveMsgs({ data: { messages: [userMsg, assistantMsg] } }).catch((e) => {
          console.error("chat persist failed", e);
        });
      } else {
        toast.error(res.error);
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${res.error}` }]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to reach assistant");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (loading) return;
    try {
      await clearHistory();
      setMessages([GREETING]);
      toast.success("Conversation cleared");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear");
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 size-14 rounded-full gradient-primary text-primary-foreground shadow-elegant hover:shadow-glow transition-all flex items-center justify-center",
          open && "scale-90",
        )}
        aria-label={open ? "Close help chat" : "Open help chat"}
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(600px,calc(100vh-8rem))] bg-card border border-border rounded-2xl shadow-card flex flex-col overflow-hidden">
          <header className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="size-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Prompt Assistant</div>
              <div className="text-xs text-muted-foreground">
                {user ? "Conversation saved across sessions" : "Sign in to save conversation"}
              </div>
            </div>
            {user && messages.length > 1 && (
              <button
                onClick={handleClear}
                className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-muted"
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {user && !hydrated && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Loading conversation…
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_pre]:my-2 [&_pre]:text-xs [&_code]:text-xs">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-2.5">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void handleSend(); }}
            className="p-3 border-t border-border flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="size-9 rounded-lg gradient-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
