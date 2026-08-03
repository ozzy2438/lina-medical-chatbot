import { config } from './config';

export type SafetyRoute = 'routine' | 'emergency' | 'poison' | 'urgent';

export type SafetyDecision = {
  route: SafetyRoute;
  matches: string[];
  message?: string;
};

const EMERGENCY_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'not_breathing', re: /\b(not breathing|cannot breathe|can'?t breathe|stopped breathing|no breathing)\b/i },
  { name: 'choking_severe', re: /\b(choking and (?:cannot|can'?t) (?:breathe|speak|cough)|silent choking|turning blue|going blue)\b/i },
  { name: 'unresponsive', re: /\b(unconscious|unresponsive|passed out|will not wake|cannot wake|hard to wake|not waking up|collapsed|fainted and (?:still|not) responding)\b/i },
  { name: 'seizure', re: /\b(seizure|convulsion|fit(?:ting)?|shaking uncontrollably)\b/i },
  { name: 'severe_bleeding', re: /\b(severe bleeding|blood everywhere|bleeding (?:won'?t|will not|does not|doesn'?t) stop|spurting blood|arterial bleeding|gushing blood)\b/i },
  { name: 'anaphylaxis', re: /\b(throat (?:closing|tight|swelling)|tongue swelling|lips swelling|swollen tongue|swollen lips|wheezing|hives and (?:trouble breathing|swelling|dizziness)|anaphylaxis)\b/i },
  { name: 'stroke', re: /\b(face drooping|slurred speech|sudden weakness on one side|numb (?:on|down) one side|stroke symptoms)\b/i },
  { name: 'chest_pain', re: /\b(crushing chest pain|chest pain (?:with|and) sweating|chest pain radiating|heart attack)\b/i },
  { name: 'head_injury_severe', re: /\b(head injury (?:with|and) (?:vomiting|seizure|confusion|loss of consciousness)|skull fracture|blood from (?:the )?ears)\b/i },
];

const POISON_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'ingested_substance', re: /\b(swallowed|ingested|drank|ate) (?:some |a |an |the )?(?:bleach|cleaner|detergent|pesticide|medicine|pills?|tablets?|chemical|antifreeze|kerosene|petrol|gasoline|button battery|magnet|unknown (?:substance|liquid|pill))/i },
  { name: 'wrong_medicine_dose', re: /\b(?:took|gave) (?:too much|the wrong (?:dose|medicine|pill)|extra (?:dose|pills?)|double dose)\b/i },
  { name: 'child_ingestion', re: /\b(?:my )?(?:child|toddler|baby|kid|son|daughter) (?:swallowed|ate|drank|got into)\b/i },
  { name: 'laundry_pod', re: /\b(laundry pod|detergent pod|dishwasher tablet)\b/i },
  { name: 'inhaled_fumes', re: /\b(breathed in|inhaled) (?:fumes|smoke|gas|carbon monoxide|cleaner|chemical)/i },
  { name: 'skin_chemical', re: /\b(pesticide|acid|caustic|drain cleaner|oven cleaner) (?:on|got on|splashed on) (?:my |the )?skin/i },
];

const EYE_CHEMICAL_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'eye_chemical', re: /\b(bleach|oven cleaner|drain cleaner|detergent|shampoo|chemical|cleaner|pesticide|acid|fertilizer|cement) (?:in|splashed in|got in|splashed into) (?:my |the )?eye/i },
  { name: 'eye_chemical_generic', re: /\bchemical (?:splash|exposure) (?:to|in|near) (?:my |the )?eye/i },
];

const URGENT_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'bat_exposure', re: /\b(bat (?:bit|scratched|touched|in the room)|possible bat exposure)\b/i },
  { name: 'wild_animal_bite', re: /\b(wild animal (?:bite|attack)|rabid|unknown animal bit)\b/i },
  { name: 'permanent_tooth', re: /\b(permanent tooth|adult tooth) (?:knocked out|fell out|came out)\b/i },
  { name: 'back_neuro', re: /\bback pain (?:with|and) (?:new )?(?:bowel|bladder|leg weakness|numb saddle|numbness)\b/i },
];

function scanPatterns(input: string, patterns: { name: string; re: RegExp }[]): string[] {
  const matches: string[] = [];
  for (const p of patterns) if (p.re.test(input)) matches.push(p.name);
  return matches;
}

export function checkSafety(userText: string): SafetyDecision {
  const text = userText || '';

  const emergency = scanPatterns(text, EMERGENCY_PATTERNS);
  if (emergency.length > 0) {
    return {
      route: 'emergency',
      matches: emergency,
      message: buildEmergencyMessage(emergency),
    };
  }

  const eyeChemical = scanPatterns(text, EYE_CHEMICAL_PATTERNS);
  if (eyeChemical.length > 0) {
    return {
      route: 'emergency',
      matches: ['eye_chemical', ...eyeChemical],
      message: buildEyeChemicalMessage(),
    };
  }

  const poison = scanPatterns(text, POISON_PATTERNS);
  if (poison.length > 0) {
    return {
      route: 'poison',
      matches: poison,
      message: buildPoisonMessage(),
    };
  }

  const urgent = scanPatterns(text, URGENT_PATTERNS);
  if (urgent.length > 0) {
    return {
      route: 'urgent',
      matches: urgent,
      message: buildUrgentMessage(urgent),
    };
  }

  return { route: 'routine', matches: [] };
}

function buildEmergencyMessage(matches: string[]): string {
  const num = config.emergencyNumber;
  return [
    `This sounds like it could be an emergency. Please call ${num} now and follow the dispatcher's instructions.`,
    '',
    'While waiting for help:',
    '- Stay with the person and keep them calm.',
    '- If they are not breathing normally and you are trained, begin CPR and follow dispatcher guidance.',
    '- If there is severe bleeding, press firmly on the wound with a clean cloth.',
    '- Do not give food, drink, or medicine to someone who is confused, drowsy, or hard to wake.',
    '',
    `Signals detected: ${matches.join(', ')}.`,
    '',
    'This chatbot cannot replace emergency medical services.',
  ].join('\n');
}

function buildEyeChemicalMessage(): string {
  const num = config.emergencyNumber;
  return [
    'This is a chemical eye exposure and needs urgent care.',
    '',
    '1. Start rinsing the eye immediately with clean, lukewarm running water. Hold the eyelid open.',
    '2. Keep rinsing for at least 15 to 20 minutes without stopping.',
    '3. If contact lenses come out during rinsing, let them go. Do not delay to look up the product.',
    '4. Do not rub the eye or use drops.',
    '5. While rinsing, arrange emergency medical assessment.',
    `6. Take the container or product name with you, and if in doubt call ${num} or your local poison center.`,
    '',
    'Sources: Chemical splash in the eye - Mayo Clinic; Eye emergencies - MedlinePlus; CDC NIOSH first aid.',
  ].join('\n');
}

function buildPoisonMessage(): string {
  const num = config.emergencyNumber;
  return [
    'A possible poisoning or exposure needs professional guidance right now.',
    '',
    '- Do NOT make the person vomit and do NOT give food, drink, or a home antidote unless Poison Control or a health professional tells you to.',
    '- If it is safe, move away from fumes and get fresh air.',
    '- Contact your local poison center (in the US, Poison Help: 1-800-222-1222; webPOISONCONTROL at poison.org).',
    '- Have ready: the product or container, the amount, the time, the route (swallowed, inhaled, skin, eye), age, weight if known, and any symptoms.',
    `- Call ${num} immediately for trouble breathing, seizure, collapse, or if the person cannot be woken.`,
    '',
    'Sources: Poisoning first aid - MedlinePlus; Poison Control (poison.org); Red Cross poison exposure.',
  ].join('\n');
}

function buildUrgentMessage(matches: string[]): string {
  if (matches.includes('permanent_tooth')) {
    return [
      'A knocked-out permanent tooth is a same-day dental emergency.',
      '',
      '- Handle the tooth by the crown (chewing surface), not the root.',
      '- If it is clearly a permanent tooth and you are comfortable, gently rinse it with milk or saline and try to place it back in the socket right away.',
      '- If reinserting is not possible, keep the tooth in milk or a recommended tooth-preservation solution and go straight to urgent dental care.',
      '- Do NOT reinsert a baby tooth.',
      '',
      'Sources: Knocked-out tooth - NHS; First aid for a knocked-out permanent tooth - HealthyChildren.',
    ].join('\n');
  }
  if (matches.includes('bat_exposure') || matches.includes('wild_animal_bite')) {
    return [
      'This kind of exposure needs prompt medical and public-health assessment because of rabies and infection risk.',
      '',
      '- Wash and flush the wound thoroughly with soap and running water for several minutes.',
      '- Cover with a clean dressing.',
      '- Contact your local health service or emergency department today to discuss rabies post-exposure care and tetanus.',
      '',
      'Source: Rabies prevention - CDC; Animal bites - American Red Cross.',
    ].join('\n');
  }
  return [
    'Some of what you described suggests this needs same-day professional assessment, not home care.',
    '',
    'Please contact your local health service or urgent care today, and use emergency services if symptoms are worsening quickly.',
  ].join('\n');
}
