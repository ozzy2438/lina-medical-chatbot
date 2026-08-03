'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

type Role = 'user' | 'assistant';
type Message = { id: string; role: Role; content: string; mode?: string };

const starterMessages: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Hi, I am Lina. I can offer calm, evidence-based first-aid guidance for everyday home injuries. I use a layered safety gate, an intent classifier, and a retrieval-augmented knowledge base sourced from Red Cross, NHS, CDC, Mayo Clinic, and MedlinePlus. What happened?',
  },
];

const prompts = [
  'I cut my finger while cooking',
  'I burned my hand on the stove',
  'I twisted my ankle',
  'My nose is bleeding',
  'I got dust in my eye',
  'My child has a small friction blister',
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [health, setHealth] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then(setHealth).catch(() => {});
  }, []);

  async function sendMessage(rawText = input) {
    const text = rawText.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: makeId(), role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    const assistantId = makeId();
    setMessages((current) => [...current, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const receivedMode = response.headers.get('x-lina-mode') ?? '';
      setMode(receivedMode);
      const receivedSession = response.headers.get('x-lina-session');
      if (receivedSession) setSessionId(receivedSession);

      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((m) => (m.id === assistantId ? { ...m, content: acc, mode: receivedMode } : m)),
        );
      }
    } catch (err) {
      setMessages((current) =>
        current.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  'I ran into a technical hiccup. Please try again in a moment. If this is an emergency, contact local emergency services now.',
              }
            : m,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  const modeLabel = mode
    ? mode.startsWith('llm')
      ? 'LLM + RAG'
      : mode.startsWith('deterministic')
      ? 'Deterministic + RAG'
      : mode
    : health?.llm?.enabled
    ? 'LLM ready'
    : 'Deterministic mode';

  return (
    <main>
      <section className="chat-card" aria-label="Lina injury helper">
        <header className="header">
          <div className="avatar" aria-hidden="true">L</div>
          <div className="header-text">
            <p className="eyebrow">Everyday injury helper \u00b7 v2</p>
            <h1>Lina</h1>
            <p className="status">
              <span /> {modeLabel}
              {health?.intents ? ` \u00b7 ${health.intents.count} intents` : ''}
              {health?.corpus ? ` \u00b7 ${health.corpus.chunks} passages` : ''}
            </p>
          </div>
        </header>

        <aside className="safety-note" aria-label="Important safety note">
          <strong>For emergencies:</strong> call local emergency services now for trouble breathing, choking, unconsciousness, possible poisoning, chemical splash to the eye, or bleeding that will not stop. This chatbot is educational, not a diagnosis.
        </aside>

        <div className="conversation" aria-live="polite" aria-label="Chat conversation">
          {messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <span className="speaker">{message.role === 'assistant' ? 'Lina' : 'You'}</span>
              <p>{message.content || (message.role === 'assistant' && loading ? 'Thinking\u2026' : '')}</p>
            </article>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="quick-prompts" aria-label="Example questions">
          {prompts.map((prompt) => (
            <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} disabled={loading}>
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="composer">
          <label htmlFor="message">Describe what happened</label>
          <div className="input-row">
            <textarea
              id="message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="For example: I cut my finger while cooking"
              rows={2}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
          <p className="hint">
            Press Enter to send, Shift + Enter for a new line. Lina gives general first-aid information sourced from Red Cross, NHS, CDC, Mayo Clinic, and MedlinePlus. It is not a diagnosis.
          </p>
        </form>
      </section>
    </main>
  );
}
