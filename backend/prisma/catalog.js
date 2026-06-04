// prisma/catalog.js
// Données de référence UMG (établissements + parcours), source : https://umng.cg
// Les parcours d'ENS et d'ISG ne sont pas détaillés sur le site → départements
// standards (à affiner si besoin). Tous les parcours sont rattachés au cycle Licence ;
// les variantes Master/Doctorat peuvent être ajoutées par établissement via l'admin.

const LEVELS = [
  { name: "Licence",  amount: 21000, years: 3 },
  { name: "Master",   amount: 50000, years: 2 },
  { name: "Doctorat", amount: 75000, years: 3 },
];

const ESTABLISHMENTS = [
  {
    code: "FD",
    name: "Faculté de Droit",
    parcours: [
      "Droit public", "Droit privé", "Études internationales et communautaires",
      "Administration publique", "Études judiciaires", "Droit des affaires", "Études financières",
    ],
  },
  {
    code: "FLASH",
    name: "Faculté des Lettres, Arts et Sciences Humaines",
    parcours: [
      "Lettres modernes", "Histoire", "Géographie", "Anglais", "Philosophie",
      "Sociologie", "Psychologie", "Sciences de l'information et de la communication",
    ],
  },
  {
    code: "FSE",
    name: "Faculté des Sciences Économiques",
    parcours: ["Économie du développement", "Économie internationale", "Économie quantitative"],
  },
  {
    code: "FSSa",
    name: "Faculté des Sciences de la Santé",
    parcours: ["Médecine", "Sciences biomédicales", "Santé publique", "Sciences infirmières"],
  },
  {
    code: "FST",
    name: "Faculté des Sciences et Techniques",
    parcours: ["Mathématiques", "Physique", "Chimie", "Biologie", "Géologie"],
  },
  {
    code: "ENSP",
    name: "École Nationale Supérieure Polytechnique",
    parcours: ["Génie civil", "Génie électrique", "Génie mécanique", "Sciences et technologies alimentaires"],
  },
  {
    code: "ENS",
    name: "École Normale Supérieure",
    parcours: [
      "Lettres modernes", "Anglais", "Histoire-Géographie", "Mathématiques",
      "Sciences physiques", "Sciences de la vie et de la terre", "Philosophie",
    ],
  },
  {
    code: "ENAM",
    name: "École Nationale d'Administration et de Magistrature",
    parcours: [
      "Administration générale", "Administration financière", "Administration économique",
      "Administration sociale", "Magistrature", "Barreau", "Affaires étrangères",
    ],
  },
  {
    code: "ENSAF",
    name: "École Nationale Supérieure d'Agronomie et de Foresterie",
    parcours: ["Agriculture", "Élevage", "Forêt", "Environnement"],
  },
  {
    code: "ISG",
    name: "Institut Supérieur de Gestion",
    parcours: [
      "Gestion des entreprises", "Comptabilité et finance", "Marketing",
      "Gestion des ressources humaines", "Banque et assurance",
    ],
  },
  {
    code: "ISEPS",
    name: "Institut Supérieur d'Éducation Physique et Sportive",
    parcours: ["Éducation physique et sportive", "Jeunesse, loisirs et sports", "Administration sportive"],
  },
];

module.exports = { LEVELS, ESTABLISHMENTS };
