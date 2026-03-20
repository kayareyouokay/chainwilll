"use client";

import { useState, useEffect, useRef } from "react";

interface CountdownParts {
  days:    number;
  hours:   number;
  minutes: number;
  seconds: number;
  total:   number;
  urgent:  boolean;
  expired: boolean;
}

export function useCountdown(secondsRemaining: number, frozen?: boolean): CountdownParts {
  const [elapsed, setElapsed] = useState(0);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;

  useEffect(() => {
    setElapsed(0); // reset when secondsRemaining changes (e.g. after check-in)
  }, [secondsRemaining]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!frozenRef.current) {
        setElapsed((e) => e + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const total = Math.max(0, secondsRemaining - elapsed);

  const days    = Math.floor(total / 86400);
  const hours   = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return {
    days, hours, minutes, seconds, total,
    urgent:  total <= 7 * 86400 && total > 0,
    expired: total === 0,
  };
}
