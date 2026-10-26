/**
 * toolLogos.tsx — marques des outils, dessinées en SVG.
 *
 * Les favicons des sites sont volontairement écartées : la CSP n'autorise que
 * les images du domaine, et une salle sans accès Internet afficherait des
 * carrés vides. Ces marques évoquent l'outil sans copier son logo officiel.
 */

type LogoProps = { className?: string };

function Frame({
  children,
  tint,
  className,
}: {
  children: React.ReactNode;
  tint: string;
  className?: string;
}) {
  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${className ?? ""}`}
      style={{ backgroundColor: tint + "22" }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke={tint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

/** Toque et recette : des transformations enchaînées. */
export function CyberChefLogo({ className }: LogoProps) {
  return (
    <Frame tint="#f59e0b" className={className}>
      <path d="M9 14a4 4 0 1 1 2-7.5 4 4 0 0 1 10 0A4 4 0 1 1 23 14z" />
      <path d="M9 14h14v5H9z" />
      <path d="M11 23h10M11 27h10" />
    </Frame>
  );
}

/** Calques superposés : une image qui en cache une autre. */
export function AperiSolveLogo({ className }: LogoProps) {
  return (
    <Frame tint="#ec4899" className={className}>
      <rect x="4" y="9" width="18" height="14" rx="2" />
      <path d="M10 5h18v14" />
      <circle cx="10" cy="14" r="1.6" />
      <path d="M4 20l5-4 4 3 3-2 6 5" />
    </Frame>
  );
}

/** Empreinte brisée : le hachage qui cède. */
export function CrackStationLogo({ className }: LogoProps) {
  return (
    <Frame tint="#10b981" className={className}>
      <rect x="6" y="14" width="20" height="13" rx="2" />
      <path d="M11 14V9a5 5 0 0 1 8.5-3.5" />
      <path d="M16 18l-2 3h4l-2 3" />
    </Frame>
  );
}

/** Roue de chiffrement : les alphabets qui tournent. */
export function DcodeLogo({ className }: LogoProps) {
  return (
    <Frame tint="#8b5cf6" className={className}>
      <circle cx="16" cy="16" r="11" />
      <circle cx="16" cy="16" r="5" />
      <path d="M16 5v6M16 21v6M5 16h6M21 16h6" />
    </Frame>
  );
}

/** Ondes capturées : le trafic réseau. */
export function WiresharkLogo({ className }: LogoProps) {
  return (
    <Frame tint="#14b8a6" className={className}>
      <path d="M3 16h5l3-7 4 14 3-9 2 4h9" />
    </Frame>
  );
}

/** Puce et loupe : lire un binaire. */
export function GhidraLogo({ className }: LogoProps) {
  return (
    <Frame tint="#ef4444" className={className}>
      <rect x="8" y="8" width="16" height="16" rx="2" />
      <path d="M12 4v4M20 4v4M12 24v4M20 24v4M4 12h4M4 20h4M24 12h4M24 20h4" />
      <path d="M13 16h6" />
    </Frame>
  );
}

/** Étiquette de métadonnées accrochée à un fichier. */
export function ExifToolLogo({ className }: LogoProps) {
  return (
    <Frame tint="#06b6d4" className={className}>
      <path d="M17 4H9a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V12z" />
      <path d="M17 4v8h8" />
      <path d="M11 17h10M11 22h7" />
    </Frame>
  );
}

/** Empreinte digitale : retrouver quelqu'un à partir de ses traces. */
export function OsintLogo({ className }: LogoProps) {
  return (
    <Frame tint="#3b82f6" className={className}>
      <circle cx="14" cy="14" r="9" />
      <path d="M21 21l6 6" />
      <path d="M10 14a4 4 0 0 1 8 0M12 18a6 6 0 0 0 5-1" />
    </Frame>
  );
}
