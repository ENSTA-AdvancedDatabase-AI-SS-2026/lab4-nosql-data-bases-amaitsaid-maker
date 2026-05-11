/**
 * TP2 - Exercice 3 : Pipelines d'Agrégation
 * Use Case : Statistiques médicales HealthCare DZ
 */

use("medical_db");

// ─── 3.1 : Distribution des diagnostics par wilaya ────────────────────────────
print("=== 3.1 : Top diagnostics par wilaya ===");

const diagParWilaya = db.patients.aggregate([
  { $unwind: "$consultations" },
  { 
    $group: { 
      _id: { 
        wilaya: "$adresse.wilaya", 
        diagnostic: "$consultations.diagnostic" 
      }, 
      count: { $sum: 1 } 
    } 
  },
  { $sort: { count: -1 } },
  { $limit: 20 }
]).toArray();

printjson(diagParWilaya);

// ─── 3.2 : Médicament le plus prescrit par spécialité ─────────────────────────
print("\n=== 3.2 : Top médicaments par spécialité ===");

const medsParSpecialite = db.patients.aggregate([
  { $unwind: "$consultations" },
  { $unwind: "$consultations.medicaments" },
  { 
    $group: {
      _id: {
        specialite: "$consultations.medecin.specialite",
        medicament: "$consultations.medicaments.nom"
      },
      totalPrescriptions: { $sum: 1 }
    }
  },
  { $sort: { totalPrescriptions: -1 } },
  {
    $group: {
      _id: "$_id.specialite",
      medicamentTop: { $first: "$_id.medicament" },
      nbFois: { $first: "$totalPrescriptions" }
    }
  }
]).toArray();

printjson(medsParSpecialite);

// ─── 3.3 : Évolution mensuelle des consultations ──────────────────────────────
print("\n=== 3.3 : Consultations par mois (12 derniers mois) ===");

const evolutionMensuelle = db.patients.aggregate([
  { $unwind: "$consultations" },
  { 
    $match: {
      "consultations.date": {
        $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
      }
    }
  },
  {
    $group: {
      // On utilise $dateToString pour avoir directement le format YYYY-MM
      _id: { $dateToString: { format: "%Y-%m", date: "$consultations.date" } },
      totalConsultations: { $sum: 1 }
    }
  },
  { $sort: { "_id": 1 } },
  {
    $project: {
      _id: 0,
      mois: "$_id",
      totalConsultations: 1
    }
  }
]).toArray();

printjson(evolutionMensuelle);

// ─── 3.4 : Patients à risque multiple ────────────────────────────────────────
print("\n=== 3.4 : Profil patients à risque élevé ===");

// On calcule la date d'il y a 60 ans pour le filtre
let date60Ans = new Date();
date60Ans.setFullYear(date60Ans.getFullYear() - 60);

const patientsRisque = db.patients.aggregate([
  {
    $match: {
      antecedents: { $all: ["Diabète type 2", "HTA"] },
      dateNaissance: { $lte: date60Ans }
    }
  },
  {
    $addFields: {
      age: { $dateDiff: { startDate: "$dateNaissance", endDate: new Date(), unit: "year" } },
      nbConsultations: { $size: { $ifNull: ["$consultations", []] } }
    }
  },
  {
    $group: {
      _id: null,
      totalPatientsRisque: { $sum: 1 },
      ageMoyen: { $avg: "$age" },
      moyenneConsultations: { $avg: "$nbConsultations" }
    }
  }
]).toArray();

printjson(patientsRisque);

// ─── 3.5 : Rapport médecins ───────────────────────────────────────────────────
print("\n=== 3.5 : Top 5 médecins & taux de ré-consultation ===");

const rapportMedecins = db.patients.aggregate([
  { $unwind: "$consultations" },
  {
    $group: {
      _id: "$consultations.medecin.nom",
      // $addToSet garde seulement les IDs uniques des patients
      patients_uniques: { $addToSet: "$_id" }, 
      total_consultations: { $sum: 1 }
    }
  },
  {
    $addFields: {
      nb_patients: { $size: "$patients_uniques" }
    }
  },
  {
    $addFields: {
      taux_reconsultation: {
        $multiply: [
          {
            $divide: [
              { $subtract: ["$total_consultations", "$nb_patients"] },
              "$nb_patients"
            ]
          },
          100
        ]
      }
    }
  },
  { $sort: { total_consultations: -1 } },
  { $limit: 5 },
  {
    $project: {
      patients_uniques: 0 // On cache le tableau d'IDs pour l'affichage
    }
  }
]).toArray();

printjson(rapportMedecins);