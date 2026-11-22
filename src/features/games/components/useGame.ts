import { useCallback, useEffect, useRef, useState } from 'react';

import { audio } from '@/audio';
import { useCurrentProfile, useProgress, type Stars } from '@/progress';
import { usePack } from '@/ui';

import { gameStars } from '../logic/rounds';

/** Wait for the screen's voice prompt before the first sound; later rounds start quickly. */
const FIRST_SOUND_DELAY_MS = 1800;
const NEXT_SOUND_DELAY_MS = 400;
const AFTER_CORRECT_MS = 1000;

type Phase = 'play' | 'celebrate' | 'done';

/**
 * Shared round flow for the sound games: play the round's sound, accept answers (wrong = wiggle +
 * replay, never a fail screen), move on after a correct answer, record stars at the end.
 */
export function useGame<R>(
  makeRounds: () => R[],
  itemKey: `game:${string}`,
  playSound: (round: R) => void,
) {
  const pack = usePack();
  const profile = useCurrentProfile();
  const record = useProgress(s => s.record);
  const [rounds, setRounds] = useState(makeRounds);
  const [index, setIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState<string | null>(null);
  const [wrong, setWrong] = useState({ id: '', n: 0 });
  const [phase, setPhase] = useState<Phase>('play');
  const [stars, setStars] = useState<Stars>(0);
  const play = useRef(playSound);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    play.current = playSound;
  }, [playSound]);

  const round = rounds[index];

  useEffect(() => {
    if (phase !== 'play' || !round) {
      return;
    }
    const t = setTimeout(
      () => play.current(round),
      index === 0 ? FIRST_SOUND_DELAY_MS : NEXT_SOUND_DELAY_MS,
    );
    return () => clearTimeout(t);
  }, [round, index, phase]);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const answer = useCallback(
    (id: string, correct: boolean) => {
      if (phase !== 'play' || solved !== null || !round) {
        return;
      }
      if (!correct) {
        setMistakes(m => m + 1);
        setWrong(w => ({ id, n: w.n + 1 }));
        play.current(round);
        return;
      }
      audio.sfx('star');
      setSolved(id);
      timer.current = setTimeout(() => {
        setSolved(null);
        if (index + 1 < rounds.length) {
          setIndex(index + 1);
          return;
        }
        const earned = gameStars(mistakes);
        if (profile) {
          record(profile.id, pack.id, itemKey, 1, earned);
        }
        setStars(earned);
        setPhase('celebrate');
      }, AFTER_CORRECT_MS);
    },
    [phase, solved, round, index, rounds.length, mistakes, profile, record, pack.id, itemKey],
  );

  const replay = useCallback(() => {
    if (round) {
      play.current(round);
    }
  }, [round]);

  const endCelebration = useCallback(() => setPhase('done'), []);

  const restart = useCallback(() => {
    setRounds(makeRounds());
    setIndex(0);
    setMistakes(0);
    setWrong({ id: '', n: 0 });
    setPhase('play');
  }, [makeRounds]);

  return {
    round,
    index,
    total: rounds.length,
    solved,
    wrong,
    phase,
    stars,
    answer,
    replay,
    endCelebration,
    restart,
  };
}
