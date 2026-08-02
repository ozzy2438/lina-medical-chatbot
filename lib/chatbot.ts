import intents from '../data/intents.json';

export type ChatReply = {
  intent: string;
  message: string;
  urgent: boolean;
};

type Intent = {
  tag: string;
  patterns: string[];
  responses: string[];
};

const emergencyPattern = /\b(trouble breathing|can'?t breathe|cannot breathe|unconscious|passed out|seizure|severe bleeding|bleeding won'?t stop|bleeding will not stop|poison|overdose|swallow(ed)? cleaner|choking)\b/i;

const emergencyReply = "This may need emergency help. Please call your local emergency number now, especially if there is trouble breathing, choking, unconsciousness, possible poisoning, severe bleeding, or a rapidly worsening condition. If it is safe, stay with the person while help is on the way.";

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text: string) {
  return new Set(normalize(text).split(' ').filter((word) => word.length > 2));
}

function scoreIntent(message: string, intent: Intent) {
  const messageWords = words(message);
  let score = 0;

  for (const pattern of intent.patterns) {
    const normalizedPattern = normalize(pattern);
    if (normalize(message).includes(normalizedPattern)) score += 8;

    for (const token of words(pattern)) {
      if (messageWords.has(token)) score += 1;
    }
  }

  return score;
}

export function getReply(message: string): ChatReply {
  const cleanMessage = normalize(message);

  if (!cleanMessage) {
    return {
      intent: 'fallback',
      message: 'Please type a little more about what happened, and I’ll do my best to help with a common minor injury.',
      urgent: false,
    };
  }

  if (emergencyPattern.test(message)) {
    return { intent: 'urgent', message: emergencyReply, urgent: true };
  }

  let bestIntent: Intent | null = null;
  let bestScore = 0;

  for (const intent of intents.intents as Intent[]) {
    const score = scoreIntent(cleanMessage, intent);
    if (score > bestScore) {
      bestIntent = intent;
      bestScore = score;
    }
  }

  if (!bestIntent || bestScore < 2) {
    return { intent: 'fallback', message: intents.fallback, urgent: false };
  }

  return {
    intent: bestIntent.tag,
    message: bestIntent.responses[0],
    urgent: false,
  };
}
