import type { ComponentType, HTMLAttributes } from "react";

export type RotatingTextProps = HTMLAttributes<HTMLSpanElement> & {
  texts: string[];
  transition?: unknown;
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  animatePresenceMode?: "wait" | "sync" | "popLayout" | string;
  animatePresenceInitial?: boolean;
  rotationInterval?: number;
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center" | "random" | number | string;
  loop?: boolean;
  auto?: boolean;
  splitBy?: "characters" | "words" | "lines" | string;
  onNext?: (index: number) => void;
  mainClassName?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
};

declare const RotatingText: ComponentType<RotatingTextProps>;
export default RotatingText;
