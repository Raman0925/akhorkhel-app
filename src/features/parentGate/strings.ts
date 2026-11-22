import { defineStrings } from '@/i18n';

export const strings = defineStrings({
  as: {
    title: 'অভিভাৱকৰ বাবে',
    askGrownUp: 'এই অংশ ডাঙৰসকলৰ বাবে।',
    instruction: 'উত্তৰটো লিখি ✓ টিপক:',
    question: '{a} × {b} = ?',
    answerLabel: 'উত্তৰ',
    erase: 'মচক',
    submit: 'ঠিক আছে',
    wrong: 'উত্তৰটো শুদ্ধ নহয়। এইটো নতুন প্ৰশ্ন।',
    locked: 'বহুবাৰ ভুল হ’ল। {s} ছেকেণ্ড ৰৈ আকৌ চেষ্টা কৰক।',
    close: 'বন্ধ কৰক',
  },
  en: {
    title: 'For grown-ups',
    askGrownUp: 'This part is for grown-ups.',
    instruction: 'Type the answer, then tap ✓:',
    question: '{a} × {b} = ?',
    answerLabel: 'Answer',
    erase: 'Erase',
    submit: 'OK',
    wrong: 'That is not right. Here is a new question.',
    locked: 'Too many wrong answers. Please wait {s} seconds and try again.',
    close: 'Close',
  },
});
