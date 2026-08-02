'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

type Message = {
  id: number;
  sender: 'lina' | 'user';
  text: string;
  urgent?: boolean;
};

const starterMessages: Message[] = [
  {
    id: 1,
    sender: 'lina',
    text: 'Hi, I’m Lina. I can offer calm, simple first-aid guidance for everyday minor injuries. What happened?',
  },
];

const prompts = ['I cut my finger', 'I burned my hand', 'I twisted my ankle', 'My nose is bleeding'];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(rawText = input) {
    const text = rawText.trim();
    if (!text || loading) return;

    const userMessage: Message = { id: Date.now(), sender: 'user', text };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, sender: 'lina', text: data.message, urgent: data.urgent },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          sender: 'lina',
          text: 'I’m having a small technical hiccup. Please try again. If this is an emergency, call local emergency services now.',
          urgent: true,
        },
      ]);
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

  return (
    <main>
      <section className="chat-card" aria-label="Lina injury helper">
        <header className="header">
          <div className="avatar" aria-hidden="true">L</div>
          <div>
            <p className="eyebrow">Everyday injury helper</p>
            <h1>Lina</h1>
            <p className="status"><span /> Here to help</p>
          </div>
        </header>

        <aside className="safety-note" aria-label="Important safety note">
          <strong>For emergencies:</strong> call local emergency services now for trouble breathing, choking, unconsciousness, possible poisoning, or bleeding that will not stop.
        </aside>

        <div className="conversation" aria-live="polite" aria-label="Chat conversation">
          {messages.map((message) => (
            <article key={message.id} className={`message ${message.sender} ${message.urgent ? 'urgent' : ''}`}>
              <span className="speaker">{message.sender === 'lina' ? 'Lina' : 'You'}</span>
              <p>{message.text}</p>
            </article>
          ))}
          {loading && <article className="message lina typing"><span className="speaker">Lina</span><p>Thinking…</p></article>}
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
          <p className="hint">Press Enter to send, or Shift + Enter for a new line. Lina gives general first-aid information, not a medical diagnosis.</p>
        </form>
      </section>
    </main>
  );
}
