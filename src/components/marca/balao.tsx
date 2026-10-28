"use client"

import { useId } from "react"

// O balão da Di Boni: aparece na tela de entrar e comemora quando não há avisos.
export function Balao({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 120 176" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}g`} cx=".36" cy=".28" r=".8">
          <stop offset="0" stopColor="#ef9ade" />
          <stop offset=".45" stopColor="#bb3ba4" />
          <stop offset="1" stopColor="#6e1a63" />
        </radialGradient>
      </defs>
      <path d="M60 6 C95 6 114 34 114 64 C114 97 88 124 60 128 C32 124 6 97 6 64 C6 34 25 6 60 6 Z" fill={`url(#${id}g)`} />
      <ellipse cx="36" cy="40" rx="13" ry="22" fill="#fff" opacity=".28" transform="rotate(28 36 40)" />
      <ellipse cx="33" cy="31" rx="5" ry="9" fill="#fff" opacity=".85" transform="rotate(28 33 31)" />
      <circle cx="36" cy="82" r="7" fill="#ff9fdc" opacity=".55" />
      <circle cx="84" cy="82" r="7" fill="#ff9fdc" opacity=".55" />
      <path d="M39 70 q7 -9 14 0 M67 70 q7 -9 14 0" stroke="#111a53" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M47 86 q13 13 26 0" stroke="#111a53" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M53 127 L67 127 L64 138 L56 138 Z" fill="#7a1d6c" />
      <path d="M60 138 C49 150 71 157 58 172" stroke="#111a53" strokeOpacity=".75" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}
