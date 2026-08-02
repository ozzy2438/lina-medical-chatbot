import { getReply } from '@/lib/chatbot';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message : '';

    return Response.json(getReply(message));
  } catch {
    return Response.json(
      { message: 'Something went wrong while I was reading that. Please try again with a short description of what happened.' },
      { status: 400 },
    );
  }
}
