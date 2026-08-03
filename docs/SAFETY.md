# Safety policy

Lina is educational software, **not** a diagnosis, treatment, or emergency service. Every layer of the system is designed to fail safely.

## Principles

1. **Deterministic emergency override.** Airway, breathing, circulation, neurologic, chemical eye, choking, poison, severe bleeding, or altered-consciousness phrases short-circuit the pipeline to reviewed content that begins with a call to local emergency services. No probabilistic model can override this layer.
2. **No diagnosis.** Lina never labels a condition (\"you have anaphylaxis\", \"this is a fracture\"). It describes what to do next and what would change the route.
3. **Red flags always present.** Every canned response ends with a short list of signs that would require professional assessment.
4. **Poison Control handoff.** Any possible ingestion, inhalation, splash, injection, or toxic bite is routed to Poison Control or a local poison center rather than answered with home instructions.
5. **Age branching.** Infant, child, and adult pathways diverge for choking, dental, fluids, and dosing. The system asks age before returning maneuver-specific instructions.
6. **Non-reassurance under uncertainty.** Below the routine confidence threshold, Lina asks one targeted safety question and offers escalation. It never promises that a symptom is harmless.
7. **Cited sources.** Every response references passages from Red Cross, NHS, CDC, MedlinePlus, Mayo Clinic, Poison Control, HealthyChildren, or Healthdirect.
8. **Observable decisions.** Safety gate matches, chosen intents, retrieved passages, tool calls, and generation mode are logged to `.data/telemetry.jsonl`.

## Explicit prohibitions

Lina will never:

- Diagnose an allergy, infection, fracture, burn depth, heat illness, or poisoning severity.
- Prescribe medication doses, antibiotics, or individualized antihistamine advice.
- Tell a user to induce vomiting or apply a home antidote for suspected poisoning.
- Recommend removing an embedded object from the eye.
- Instruct a caregiver to reinsert a baby tooth.
- Recommend intentionally popping a blister.
- Promise that a symptom is safe to watch at home.
- Hard-code a single national emergency number as a global instruction.

## Routing table

| Route | Trigger | Behavior |\n|---|---|---|\n| Emergency | Airway, breathing, circulation, seizure, severe allergy, heat-stroke mental change, severe eye chemical exposure, uncontrolled bleeding | Immediate call to local emergency services, minimal first-aid steps that do not delay the call |\n| Poison Control | Any swallow / inhalation / splash / injection / toxic bite of an unknown or hazardous substance | Contact Poison Control now with product, amount, time, route, age; no home antidote |\n| Urgent clinician / dentist | Knocked-out permanent tooth, deep or hand/face animal bite, worsening infection signs, concerning back red flags, persistent eye symptoms | Stop routine flow, direct to same-day professional assessment |\n| Routine self-care | Alert person, low-energy mechanism, localized mild symptoms, no exclusion criteria met | Short first-aid steps, monitoring plan, red-flag list |\n\n## Review process\n\n1. Content changes to `data/intents.json` or `data/knowledge.jsonl` require a note in the PR describing the source and review date.\n2. New patterns must include at least one negative and one age-branch variant per intent where relevant.\n3. Emergency lexicon changes trigger a full-suite safety test run.\n4. Telemetry review: false-negative emergency routing is treated as a critical failure even when the routine label is technically plausible.\n\n## What to do in a real emergency\n\nIf someone may be in immediate danger, has trouble breathing, is unconscious or hard to wake, has uncontrolled bleeding, is choking, may have been poisoned, has had a chemical splash to the eye, or is showing severe allergic symptoms, **call local emergency services or Poison Control now** and follow their instructions.\n