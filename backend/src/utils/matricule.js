// src/utils/matricule.js

/**
 * Génère un matricule interne unique au format :
 * UMG-{YY}-{RANDOM}
 * ex: UMG-26-7F3A9C
 *
 * Le matricule n'est PAS saisi par l'étudiant : c'est un identifiant interne
 * fabriqué côté backend pour chaque étudiant (jamais affiché dans le formulaire).
 */
const generateMatricule = () => {
  const yy   = new Date().getFullYear().toString().slice(-2);
  const rand = Array.from({ length: 6 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
  ).join("");
  return `UMG-${yy}-${rand}`;
};

module.exports = { generateMatricule };
