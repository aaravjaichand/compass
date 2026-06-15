"use client";

import { useEffect, useState } from "react";

const WORDS = [
  "Working",
  "Thinking",
  "Reading",
  "Checking",
  "Looking things up",
  "Putting it together",
];

export function WorkingIndicator() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % WORDS.length), 1900);
    return () => clearInterval(id);
  }, []);

  return (
    <span role="status" className="text-sm">
      <span className="sr-only">Working</span>
      <span aria-hidden className="shimmer font-medium">
        {WORDS[i]}…
      </span>
    </span>
  );
}
