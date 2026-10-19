"use client";

import { cn } from "@/libs/style/style.util.helpers";
import { IconUserFilled } from "@tabler/icons-react";
import React, { useState } from "react";

export interface AvatarProps {
  /** Picture URL. Missing, or failing to load, falls back to the initial. */
  src?: string | null;
  /** For the initial, its colour, and the accessible name. */
  name?: string | null;
  /** Size and shape — `size-9`, `rounded-xl`… Round unless overridden. */
  className?: string;
  /**
   * Set when nothing next to the avatar names the person; otherwise it's
   * decorative and screen readers skip it.
   */
  labelled?: boolean;
}

const TONES = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
];

/** Same name, same colour — on every screen. */
function toneOf(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) | 0;
  return TONES[Math.abs(hash) % TONES.length];
}

/**
 * A person's picture, used wherever someone is shown. Plain `<img>`, not
 * `next/image`: uploads live on the storage host, whose address differs per
 * environment. One letter for the fallback — two Persian letters side by
 * side join into what reads as a word.
 */
export const Avatar: React.FC<AvatarProps> = ({ src, name, className, labelled }) => {
  // Remember which URL failed, so a new one gets its own chance to load.
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = Boolean(src) && failed !== src;
  const label = name?.trim() || "";
  const initial = label ? Array.from(label)[0].toUpperCase() : "";

  return (
    <span
      role={labelled ? "img" : undefined}
      aria-label={labelled ? label || "کاربر" : undefined}
      aria-hidden={labelled ? undefined : true}
      style={{ containerType: "inline-size" }}
      className={cn(
        "relative inline-flex size-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-full",
        showImage ? "bg-slate-100" : label ? toneOf(label) : "bg-slate-100 text-slate-400",
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- see above: storage host varies
        <img
          src={src!}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(src!)}
          className="size-full object-cover"
        />
      ) : initial ? (
        <span className="text-[42cqw] font-semibold leading-none">{initial}</span>
      ) : (
        <IconUserFilled className="size-1/2" />
      )}
    </span>
  );
};
