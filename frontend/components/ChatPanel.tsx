"use client";

import { useEffect, useRef, useState } from "react";
import { ChatRequestError, sendChatMessage, type ChatMessage } from "@/lib/api";
import type { NdaFormData } from "@/lib/mnda";

interface ChatPanelProps {
  onFields: (patch: Partial<NdaFormData>) => void;
}

const GREETING =
  "Hi! I'll help you draft your Mutual NDA. Which two companies are signing this agreement?";

// Mirrors the server's ChatRequest bounds; exceeding either is a permanent 422.
const MAX_HISTORY = 40;
const MAX_MESSAGE_LENGTH = 8000;

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <p
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-blue-600 text-white"
            : "border border-neutral-200 bg-white text-neutral-800"
        }`}
      >
        {message.content}
      </p>
    </div>
  );
}

export default function ChatPanel({ onFields }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, pending]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || pending) {
      return;
    }
    const history: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(history);
    setInput("");
    setError(null);
    setPending(true);
    try {
      const result = await sendChatMessage(history.slice(-MAX_HISTORY));
      const reply = result.reply.trim();
      if (reply) {
        setMessages((previous) => [
          ...previous,
          { role: "assistant", content: reply },
        ]);
      }
      if (Object.keys(result.nda_fields).length > 0) {
        onFields(result.nda_fields);
      }
    } catch (caught) {
      setError(
        caught instanceof ChatRequestError && caught.status === 503
          ? "Chat isn't configured on the server. Add an API key and restart the backend."
          : "The assistant couldn't respond. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      aria-label="AI chat"
      className="flex h-full min-h-0 flex-col gap-4"
    >
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}
        {pending && (
          <div className="flex justify-start">
            <p
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500"
              role="status"
            >
              Thinking…
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <textarea
          aria-label="Message"
          className="min-h-[72px] w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Answer in your own words…"
          maxLength={MAX_MESSAGE_LENGTH}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || input.trim() === ""}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          Send
        </button>
      </form>
    </section>
  );
}
