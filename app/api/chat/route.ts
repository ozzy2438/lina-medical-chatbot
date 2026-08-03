import { handleChat, type ChatMessage } from '@/lib/pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const raw = body?.messages;
    let messages: ChatMessage[] = [];

    if (Array.isArray(raw)) {
      messages = raw
        .filter((m) => m && typeof m.role === 'string' && typeof m.content === 'string')
        .map((m) => ({ role: m.role as ChatMessage['role'], content: m.content }));
    } else if (typeof body?.message === 'string') {
      // Legacy single-message body used by earlier UI versions.
      messages = [{ role: 'user', content: body.message }];
    }

    if (messages.length === 0) {
      return Response.json(
        { error: 'Please describe what happened in a short message.' },
        { status: 400 },
      );
    }

    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : undefined;
    return await handleChat(messages, sessionId);
  } catch (err) {
    console.error('[api/chat] error', err);
    return Response.json(
      { error: 'Something went wrong. If this is an emergency, contact local emergency services now.' },
      { status: 500 },
    );
  }
}
