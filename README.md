# Lina — Everyday Injury Helper

Lina is a small, friendly chatbot that gives clear first-aid guidance for everyday minor injuries at home. It uses a lightweight intent classifier trained from the project’s local training examples and replies with reviewed canned responses.

> **Safety note:** Lina is educational guidance, not a diagnosis or emergency service. The interface always shows emergency escalation guidance and routes potentially urgent phrases to a dedicated urgent-care response.

## What it covers

- Small cuts and scrapes
- Minor burns
- Bruises
- Sprains and strains
- Nosebleeds
- Bumps to the head
- Splinters
- Insect bites and stings
- Choking safety
- A warm fallback for questions outside its trained topics

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test the classifier

```bash
npm test
```

## Retrain / refresh intent data

Training examples and responses live in `data/intents.json`. The runtime classifier builds its keyword model from that file, so edits take effect automatically after restarting the development server. Run the test suite after modifying examples:

```bash
npm test
```

## Design and safety choices

- **No diagnosis claims:** responses are concise first-aid suggestions and clear “get help now” red flags.
- **Emergency override:** messages mentioning danger signals such as trouble breathing, severe bleeding, loss of consciousness, poisoning, or choking are never treated as routine topics.
- **Friendly fallback:** unknown questions receive a reassuring message, an invitation to rephrase, and emergency instructions.
- **Accessible UI:** labelled controls, keyboard-friendly quick prompts, live chat updates, strong contrast, and visible focus states.

## Project structure

```text
app/             Next.js user interface and API route
lib/             Intent recognition and response selection
data/            Training examples and canned responses
__tests__/       Classifier behavior tests
```

## Deployment

This is a standard Next.js application. Push to GitHub and import the repository into Vercel, or run `npm run build` followed by `npm start` on any Node.js hosting provider.

## Important

If someone may be in immediate danger, has trouble breathing, is unconscious, has uncontrolled bleeding, is choking, or may have been poisoned, call local emergency services immediately.
