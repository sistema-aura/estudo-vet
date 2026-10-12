import type { SVGProps } from "react";

/** Símbolo vetorial VetEstudo: pata branca sobre azul, desenhada para legibilidade a 16 px. */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="VetEstudo" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="64" height="64" rx="17" fill="#081b33" />
      <circle cx="32" cy="32" r="27" fill="#2879ed" />
      <ellipse cx="18.5" cy="24.5" rx="4.1" ry="6.1" transform="rotate(-23 18.5 24.5)" fill="#ffffff" />
      <ellipse cx="28" cy="18.5" rx="4.2" ry="6.3" transform="rotate(-8 28 18.5)" fill="#ffffff" />
      <ellipse cx="39" cy="20" rx="4.2" ry="6.3" transform="rotate(13 39 20)" fill="#ffffff" />
      <ellipse cx="47.8" cy="27.1" rx="4.1" ry="5.8" transform="rotate(28 47.8 27.1)" fill="#ffffff" />
      <path d="M16.4 43.8c0-4.1 3.6-7.1 7.4-10.5 2.5-2.2 4.5-4 8.1-4s5.8 1.8 8.2 4c3.8 3.4 7.4 6.4 7.4 10.5 0 5.2-4.5 8.6-9.4 7.2-3.5-1-8.4-1-11.9 0-4.8 1.4-9.8-1.9-9.8-7.2Z" fill="#ffffff" />
    </svg>
  );
}
