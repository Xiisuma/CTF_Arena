
/**
 * seedCategories.ts
 * Script à exécuter une seule fois pour initialiser les 6 catégories CTF.
 * Usage : importer et appeler seedCategories() au démarrage (admin only).
 */

import { addCategory, getCategories } from "../db";

const CATEGORIES_SEED = [
  {
    id: "steganographie",
    name: "Stéganographie",
    icon: "🖼️",
    color: "#ec4899",
    description: "Retrouvez des messages cachés dans des images, sons ou fichiers.",
    descriptionMd: `## Stéganographie\n\nL'art de **dissimuler un message** à l'intérieur d'un fichier anodin (image, audio, vidéo, texte…) sans que sa présence soit détectable au premier regard.\n\n### Techniques courantes\n- LSB (Least Significant Bit) dans les images PNG/BMP\n- Stéganographie audio (spectrogramme, phase coding)\n- Fichiers dans des fichiers (binwalk, steghide)\n- Métadonnées EXIF cachées\n- Texte invisible (caractères unicode, espaces)\n\n### Outils utiles\n- **steghide**, **stegsolve**, **binwalk**, **exiftool**, **zsteg**, **Audacity**`,
  },
  {
    id: "cryptographie",
    name: "Cryptographie",
    icon: "🔐",
    color: "#8b5cf6",
    description: "Déchiffrez des messages, cassez des algorithmes et trouvez les failles cryptographiques.",
    descriptionMd: `## Cryptographie\n\nLa cryptographie consiste à **protéger l'information** par le chiffrement. En CTF, il s'agit souvent de casser des implémentations défaillantes.\n\n### Techniques courantes\n- Chiffrement classique (César, Vigenère, ROT13, Base64)\n- RSA (factorisation, faibles exposants, padding oracle)\n- AES (ECB, CBC bit-flipping)\n- Hachage et collisions (MD5, SHA)\n- One-Time Pad mal implémenté\n\n### Outils utiles\n- **CyberChef**, **hashcat**, **openssl**, **SageMath**, **RsaCtfTool**`,
  },
  {
    id: "osint",
    name: "OSINT",
    icon: "🌍",
    color: "#06b6d4",
    description: "Enquêtez sur des personnes, lieux ou organisations via des sources ouvertes.",
    descriptionMd: `## OSINT\n\n**Open Source Intelligence** — collecter et analyser des informations accessibles publiquement pour répondre à une question précise.\n\n### Techniques courantes\n- Géolocalisation d'images (Google Street View, SunCalc)\n- Investigation réseaux sociaux (Twitter/X, Instagram, LinkedIn)\n- Recherche inversée d'images (TinEye, Google Images)\n- Métadonnées de fichiers (EXIF, PDF)\n- WHOIS, certificats SSL, archives web (Wayback Machine)\n\n### Outils utiles\n- **Maltego**, **Sherlock**, **theHarvester**, **exiftool**, **Shodan**`,
  },
  {
    id: "web",
    name: "Web",
    icon: "🌐",
    color: "#10b981",
    description: "Exploitez des vulnérabilités dans des applications web : injections, XSS, SSRF…",
    descriptionMd: `## Web\n\nLes challenges Web ciblent les **vulnérabilités des applications web** modernes, des injections classiques aux failles logiques avancées.\n\n### Techniques courantes\n- Injection SQL (SQLi), NoSQL injection\n- Cross-Site Scripting (XSS réfléchi, stocké, DOM)\n- CSRF, SSRF, Open Redirect\n- LFI / RFI, Path Traversal\n- Contournement d'authentification, JWT forgé\n- Désérialisation PHP/Python/Java\n\n### Outils utiles\n- **Burp Suite**, **sqlmap**, **ffuf**, **curl**, **nikto**, **wfuzz**`,
  },
  {
    id: "forensics",
    name: "Forensics",
    icon: "🔬",
    color: "#f59e0b",
    description: "Analysez des dumps mémoire, fichiers corrompus, captures réseau et artefacts numériques.",
    descriptionMd: `## Forensics\n\nL'investigation numérique consiste à **analyser des artefacts** (fichiers, mémoire, réseau) pour reconstituer des événements ou retrouver des données cachées.\n\n### Techniques courantes\n- Analyse de captures réseau PCAP (Wireshark)\n- Forensics mémoire (Volatility)\n- Récupération de fichiers supprimés (foremost, photorec)\n- Analyse de systèmes de fichiers (FTK, Autopsy)\n- Logs système, registre Windows\n\n### Outils utiles\n- **Wireshark**, **Volatility**, **foremost**, **binwalk**, **Autopsy**, **strings**`,
  },
  {
    id: "misc",
    name: "Misc",
    icon: "🧩",
    color: "#64748b",
    description: "Challenges inclassables : programmation, logique, pyjails, encodages surprenants…",
    descriptionMd: `## Misc\n\nLa catégorie **Miscellaneous** regroupe tout ce qui ne rentre pas dans les autres cases — souvent des challenges créatifs qui testent la débrouillardise.\n\n### Exemples typiques\n- Pyjails et sandboxes (échapper à un interpréteur Python restreint)\n- Défis de programmation et algorithmie\n- Encodages exotiques (Brainfuck, Morse, Base85, UUencode…)\n- Puzzles logiques, QR codes, chasses au trésor\n- Interaction avec des services (netcat, protocoles custom)\n\n### Outils utiles\n- **CyberChef**, **pwntools**, **Python**, **dcode.fr**`,
  },
];

export async function seedCategories(): Promise<void> {
  const existing = await getCategories();

  if (existing.length > 0) {
    console.log(`[Seed] ${existing.length} catégorie(s) déjà présente(s), abandon.`);
    return;
  }

  console.log("[Seed] Insertion des catégories...");
  for (const cat of CATEGORIES_SEED) {
    const result = await addCategory(cat);
    if (result.ok) {
      console.log(`[Seed] ✅ ${cat.name}`);
    } else {
      console.error(`[Seed] ❌ ${cat.name} — ${result.error}`);
    }
  }
  console.log("[Seed] Terminé.");
}

