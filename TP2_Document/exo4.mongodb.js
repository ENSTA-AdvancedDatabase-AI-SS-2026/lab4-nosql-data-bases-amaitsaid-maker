/**
 * TP2 - Exercice 4 : Index et Optimisation
 */

use("medical_db");

// ─── 4.1 : Créer les index appropriés ────────────────────────────────────────

// Index 1 : Recherche fréquente par wilaya + antécédents
db.patients.createIndex({ "adresse.wilaya": 1, "antecedents": 1 });

// Index 2 : Recherche par date de consultation (souvent on cherche les plus récentes donc -1)
db.patients.createIndex({ "consultations.date": -1 });

// Index 3 : Texte sur diagnostics pour recherche full-text
db.patients.createIndex({ "consultations.diagnostic": "text" });

// Index 4 : Analyses par patient (lookup)
db.analyses.createIndex({ patient_id: 1 });


// ─── 4.2 : Comparer avec explain() ────────────────────────────────────────────

const requeteTest = {
  "adresse.wilaya": "Alger",
  antecedents: "Diabète type 2"
};

// Pour simuler l'état "avant", on supprime temporairement l'index qu'on vient de créer
db.patients.dropIndex({ "adresse.wilaya": 1, "antecedents": 1 });

print("=== AVANT index ===");
let statsAvant = db.patients.find(requeteTest).explain("executionStats");
print("Docs retournés  :", statsAvant.executionStats.nReturned);
print("Docs examinés   :", statsAvant.executionStats.totalDocsExamined);
print("Temps (ms)      :", statsAvant.executionStats.executionTimeMillis);

// On le recrée pour voir la différence
db.patients.createIndex({ "adresse.wilaya": 1, "antecedents": 1 });

print("\n=== APRÈS index ===");
let statsApres = db.patients.find(requeteTest).explain("executionStats");
print("Docs retournés  :", statsApres.executionStats.nReturned);
print("Docs examinés   :", statsApres.executionStats.totalDocsExamined);
print("Temps (ms)      :", statsApres.executionStats.executionTimeMillis);


// ─── 4.4 : Index TTL pour archivage ───────────────────────────────────────────

// 5 ans = 5 * 365 * 24 * 60 * 60 = 157680000 secondes
db.analyses.createIndex(
  { date: 1 },
  { expireAfterSeconds: 157680000 }
);

print("\n✅ Création des index et tests terminés.");