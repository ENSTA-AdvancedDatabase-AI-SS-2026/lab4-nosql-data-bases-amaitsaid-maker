/**
 * TP2 - Exercice 1 : Modélisation MongoDB
 * Use Case : HealthCare DZ - Dossiers Médicaux
 */

// Se connecter à la base médicale
use("medical_db");

// On nettoie pour pouvoir relancer le script plusieurs fois
db.patients.drop();
db.analyses.drop();

// ─── 1.1 : Créer la collection avec validation ────────────────────────────────
db.createCollection("patients", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["cin", "nom", "prenom", "dateNaissance", "sexe"],
      properties: {
        cin: { bsonType: "string", description: "CIN obligatoire" },
        nom: { bsonType: "string" },
        prenom: { bsonType: "string" },
        dateNaissance: { bsonType: "date" },
        sexe: { enum: ["M", "F"], description: "Doit être M ou F" }
      }
    }
  }
});

// ─── 1.2 : Insérer des patients avec données algériennes ──────────────────────
let patients = [
  {
    cin: "198001012300",
    nom: "Bensalem",
    prenom: "Ahmed",
    dateNaissance: new Date("1980-01-01"),
    sexe: "M",
    adresse: { wilaya: "Alger", commune: "Bab Ezzouar" },
    groupeSanguin: "O+",
    antecedents: ["Diabète type 2", "HTA"],
    allergies: ["Pénicilline"],
    consultations: [
      {
        id: UUID(),
        date: new Date("2024-01-15"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "Hypertension artérielle",
        tension: { systolique: 145, diastolique: 92 },
        medicaments: [{ nom: "Amlodipine", dosage: "5mg", duree: "30 jours" }],
        notes: "Surveillance tensionnelle recommandée"
      },
      {
        id: UUID(),
        date: new Date("2024-02-20"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "Suivi HTA",
        tension: { systolique: 130, diastolique: 85 },
        medicaments: [],
        notes: "Tension stabilisée"
      }
    ]
  },
  {
    cin: "199505140022",
    nom: "Saidi",
    prenom: "Meriem",
    dateNaissance: new Date("1995-05-14"),
    sexe: "F",
    adresse: { wilaya: "Oran", commune: "Es Senia" },
    groupeSanguin: "A-",
    antecedents: ["Asthme"],
    allergies: ["Pollen"],
    consultations: [
      {
        id: UUID(),
        date: new Date("2023-11-10"),
        medecin: { nom: "Dr. Kaci", specialite: "Pneumologie" },
        diagnostic: "Crise d'asthme sévère",
        medicaments: [{ nom: "Ventoline", dosage: "100µg", duree: "Au besoin" }]
      }
    ]
  },
  {
    cin: "197512300055",
    nom: "Haddad",
    prenom: "Karim",
    dateNaissance: new Date("1975-12-30"),
    sexe: "M",
    adresse: { wilaya: "Constantine", commune: "El Khroub" },
    groupeSanguin: "B+",
    antecedents: [],
    allergies: [],
    consultations: [
      {
        id: UUID(),
        date: new Date("2024-03-01"),
        medecin: { nom: "Dr. Lamine", specialite: "Généraliste" },
        diagnostic: "Angine",
        medicaments: [{ nom: "Amoxicilline", dosage: "1g", duree: "6 jours" }]
      }
    ]
  }
];

// Petite boucle pour générer les 17 autres patients sans avoir un code de 1000 lignes
let noms = ["Bouzid", "Meziani", "Djabou", "Ziani", "Boudiaf"];
let prenoms = ["Fatima", "Yacine", "Amina", "Riad", "Sarah"];
let wilayas = ["Annaba", "Blida", "Tizi Ouzou", "Sétif", "Bejaia"];

for (let i = 0; i < 17; i++) {
  patients.push({
    cin: "2000" + i + "112233",
    nom: noms[i % noms.length],
    prenom: prenoms[i % prenoms.length],
    dateNaissance: new Date(`199${i%9}-0${(i%8)+1}-15`),
    sexe: i % 2 === 0 ? "F" : "M",
    adresse: { wilaya: wilayas[i % wilayas.length], commune: "Centre" },
    groupeSanguin: "O+",
    antecedents: [],
    allergies: [],
    consultations: [
      {
        id: UUID(),
        date: new Date("2024-02-15"),
        medecin: { nom: "Dr. Touati", specialite: "Généraliste" },
        diagnostic: "Bilan de routine",
        medicaments: []
      }
    ]
  });
}

db.patients.insertMany(patients);

// ─── 1.3 : Collection analyses (référencée) ───────────────────────────────────

// On récupère quelques patients de la base pour avoir leurs vrais ObjectIds
let patientsDB = db.patients.find().limit(4).toArray();

const analyses = [
  {
    patient_id: patientsDB[0]._id, // Référence Ahmed Bensalem
    type: "Glycémie",
    resultat: "1.20 g/L",
    date: new Date("2024-02-01"),
    laboratoire: "Labo Central Alger"
  },
  {
    patient_id: patientsDB[0]._id,
    type: "Lipidogramme",
    resultat: "Cholestérol légèrement élevé",
    date: new Date("2024-02-01"),
    laboratoire: "Labo Central Alger"
  },
  {
    patient_id: patientsDB[1]._id, // Référence Meriem Saidi
    type: "NFS",
    resultat: "Normal",
    date: new Date("2023-11-12"),
    laboratoire: "Labo Oran El Bahia"
  },
  {
    patient_id: patientsDB[2]._id, // Référence Karim
    type: "ECG",
    resultat: "Rythme sinusal régulier",
    date: new Date("2024-03-02")
  }
];

db.analyses.insertMany(analyses);

print("✅ Modélisation terminée. Patients insérés:", db.patients.countDocuments());
print("✅ Analyses insérées:", db.analyses.countDocuments());