/**
 * tools.ts — catalogue des outils présentés sur la page Aide.
 *
 * Données pures : la page se contente de les afficher. Pour en ajouter un,
 * il suffit d'une entrée ici.
 */

import type { ComponentType } from "react";
import {
  AperiSolveLogo,
  CrackStationLogo,
  CyberChefLogo,
  DcodeLogo,
  ExifToolLogo,
  GhidraLogo,
  OsintLogo,
  WiresharkLogo,
} from "./toolLogos";

export interface Tool {
  name: string;
  url: string;
  /** Domaine affiché sous le nom, pour reconnaître le site d'un coup d'œil. */
  host: string;
  /** Ce que fait l'outil, en une phrase. */
  what: string;
  /** Quand y penser pendant une épreuve. */
  when: string;
  /** Catégories du CTF où il sert le plus. */
  tags: string[];
  Logo: ComponentType<{ className?: string }>;
}

export const TOOLS: Tool[] = [
  {
    name: "CyberChef",
    url: "https://gchq.github.io/CyberChef/",
    host: "gchq.github.io/CyberChef",
    what: "Un atelier d'opérations à enchaîner : base64, hexadécimal, XOR, ROT, gzip, AES, expressions régulières…",
    when: "Dès qu'une chaîne a l'air encodée ou chiffrée et que vous voulez essayer plusieurs transformations à la suite.",
    tags: ["Cryptographie", "Stéganographie", "Forensic"],
    Logo: CyberChefLogo,
  },
  {
    name: "Aperi'Solve",
    url: "https://www.aperisolve.com/",
    host: "aperisolve.com",
    what: "Passe une image dans plusieurs outils de stéganographie d'un coup : plans de bits, zsteg, steghide, exiftool, binwalk.",
    when: "Première chose à tenter sur une image suspecte, avant de sortir les outils un par un.",
    tags: ["Stéganographie", "Forensic"],
    Logo: AperiSolveLogo,
  },
  {
    name: "CrackStation",
    url: "https://crackstation.net/",
    host: "crackstation.net",
    what: "Retrouve le mot de passe derrière une empreinte courante (MD5, SHA-1, SHA-256) à partir de tables précalculées.",
    when: "Quand vous tombez sur un hash qui ressemble à un mot de passe classique. Inutile si le hash est salé.",
    tags: ["Cryptographie", "Web"],
    Logo: CrackStationLogo,
  },
  {
    name: "dCode",
    url: "https://www.dcode.fr/",
    host: "dcode.fr",
    what: "Des centaines de déchiffreurs et de solveurs : César, Vigenère, substitution, Morse, braille, suites, anagrammes.",
    when: "Pour les chiffrements classiques et les énigmes à la main, là où CyberChef s'arrête.",
    tags: ["Cryptographie", "OSINT"],
    Logo: DcodeLogo,
  },
  {
    name: "Wireshark",
    url: "https://www.wireshark.org/",
    host: "wireshark.org",
    what: "Analyse une capture de trafic : filtre les paquets, reconstitue les échanges, extrait les fichiers transportés.",
    when: "Dès qu'un challenge fournit un fichier .pcap ou .pcapng.",
    tags: ["Réseau", "Forensic"],
    Logo: WiresharkLogo,
  },
  {
    name: "Ghidra",
    url: "https://ghidra-sre.org/",
    host: "ghidra-sre.org",
    what: "Décompile un binaire et affiche un équivalent lisible en C, avec le graphe des fonctions.",
    when: "Pour comprendre un exécutable fourni sans son code source.",
    tags: ["Reverse Engineering", "Pwn"],
    Logo: GhidraLogo,
  },
  {
    name: "ExifTool",
    url: "https://exiftool.org/",
    host: "exiftool.org",
    what: "Lit toutes les métadonnées d'un fichier : appareil, date, position GPS, commentaires oubliés.",
    when: "Sur toute image ou tout document : le flag est parfois simplement écrit dans un champ de métadonnées.",
    tags: ["Forensic", "OSINT", "Stéganographie"],
    Logo: ExifToolLogo,
  },
  {
    name: "OSINT Framework",
    url: "https://osintframework.com/",
    host: "osintframework.com",
    what: "Un arbre de ressources en sources ouvertes, classées par type de piste : pseudo, adresse, image, domaine.",
    when: "Quand vous avez un indice et que vous ne savez pas par quel service commencer.",
    tags: ["OSINT"],
    Logo: OsintLogo,
  },
];
