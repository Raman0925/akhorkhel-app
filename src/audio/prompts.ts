/**
 * Voice prompts (frozen list, owner A3). Each id is recorded by a native voice artist as
 * src/audio/prompts/<as|en>/<id>.m4a. The text here is the recording script and the on-screen
 * caption. `npm run gen:assets` picks up recorded files; until a file exists, the prompt is silent.
 *
 * Add new ids at the end; never rename an id (file names depend on it).
 * The Assamese text must be reviewed by a native speaker before recording.
 */
export const PROMPTS = {
  welcome: { as: 'আখৰ খেললৈ স্বাগতম!', en: 'Welcome to Akhor Khel!' },
  chooseLanguage: { as: 'কোনটো ভাষা শিকিবা?', en: 'Which language shall we learn?' },
  chooseProfile: { as: 'তুমি কোন?', en: 'Who is playing?' },
  home: { as: 'কি খেলিবা?', en: 'What shall we play?' },
  letterGrid: { as: 'এটা আখৰ বাছি লোৱা।', en: 'Pick a letter.' },
  traceStart: {
    as: 'সেউজীয়া বিন্দুৰ পৰা আঙুলিৰে আঁকা।',
    en: 'Start at the green dot and trace with your finger.',
  },
  traceAgain: { as: 'আকৌ এবাৰ আঁকা।', en: 'Trace it once more.' },
  traceWatch: { as: 'চোৱা, এনেকৈ লিখে।', en: 'Watch how it is written.' },
  traceMemory: { as: 'এতিয়া নিজে লিখা।', en: 'Now write it by yourself.' },
  great: { as: 'বঢ়িয়া!', en: 'Great!' },
  wellDone: { as: 'বহুত ভাল!', en: 'Well done!' },
  tryAgain: { as: 'আকৌ চেষ্টা কৰা।', en: "Let's try again." },
  setComplete: { as: 'তুমি পাঁচটা আখৰ শিকিলা!', en: 'You learned five letters!' },
  signs: { as: 'আখৰত চিহ্ন লগালে নতুন শব্দ হয়।', en: 'Add a sign to a letter to make a new sound.' },
  gameHear: { as: 'যিটো আখৰ শুনিছা, সেইটো টিপা।', en: 'Tap the letter you hear.' },
  gamePicture: { as: 'কোনটো ছবি এই শব্দেৰে আৰম্ভ হয়?', en: 'Which picture starts with this sound?' },
  words: { as: 'ছবিটো টিপি শব্দটো শুনা।', en: 'Tap a picture to hear the word.' },
  numbers: { as: 'এটা সংখ্যা বাছি লোৱা।', en: 'Pick a number.' },
  count: { as: 'গণি চোৱা।', en: "Let's count." },
  askParent: { as: 'ডাঙৰ কাৰোবাক মাতা।', en: 'Please ask a grown-up.' },
} as const satisfies Record<string, { as: string; en: string }>;

export type PromptId = keyof typeof PROMPTS;
