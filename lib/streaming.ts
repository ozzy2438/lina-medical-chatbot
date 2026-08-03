/** Wraps a plain string as a text/plain streaming Response the UI can consume chunk by chunk. */
export function streamTextResponse(text: string): Response {
  const encoder = new TextEncoder();
  // Split by sentence-ish boundaries to give a natural streaming feel.
  const parts = text.match(/[^\s]+\s?/g) ?? [text];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const p of parts) {
        controller.enqueue(encoder.encode(p));
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** Compose the deterministic fallback answer when no LLM is available. */
export function renderDeterministic(input: {
  header?: string;
  bodyLines: string[];
  redFlags?: string[];
  sources?: { title: string; url: string }[];
}): string {
  const { header, bodyLines, redFlags, sources } = input;
  const out: string[] = [];
  if (header) out.push(header, '');
  out.push(...bodyLines);
  if (redFlags && redFlags.length > 0) {
    out.push('', 'When to get help now:');
    for (const r of redFlags) out.push(`- ${r}`);
  }
  if (sources && sources.length > 0) {
    out.push('', 'Sources:');
    for (const s of sources) out.push(`- ${s.title}${s.url ? ` \u2014 ${s.url}` : ''}`);
  }
  out.push(
    '',
    'This is general first-aid information. It is not a diagnosis. If symptoms are severe or worsening, contact local emergency services.',
  );
  return out.join('\n');
}
