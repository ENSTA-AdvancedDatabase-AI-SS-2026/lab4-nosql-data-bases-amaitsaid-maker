# README

## 1. Justification du choix : Embedding vs Referencing

Pour chaque collection, le choix entre **embedding** et **referencing** a été réalisé selon :

- La fréquence d’accès aux données
- La taille des documents
- Le besoin de mise à jour
- Les performances des requêtes

### Embedding
Utilisé lorsque :
- Les données sont fortement liées
- Les informations sont souvent lues ensemble
- Le volume reste limité

### Referencing
Utilisé lorsque :
- Les données sont volumineuses
- Les relations sont multiples
- Les mises à jour doivent être indépendantes

---

## 2. Résultats `explain()` avant/après indexation

| Requête | Avant indexation | Après indexation |
|----------|------------------|------------------|
| Temps d’exécution | Plus lent | Plus rapide |
| Type de scan | COLLSCAN | IXSCAN |
| Documents parcourus | Élevé | Réduit |
| Performance globale | Faible | Améliorée |

---

## 3. Requête la plus complexe : Explication du pipeline

### Étape 1 : `$match`
Filtrer les documents selon les critères demandés.

### Étape 2 : `$lookup`
Joindre les données provenant d’une autre collection.

### Étape 3 : `$unwind`
Décomposer les tableaux en plusieurs documents.

### Étape 4 : `$group`
Regrouper les données et effectuer les calculs nécessaires.

### Étape 5 : `$project`
Sélectionner uniquement les champs utiles dans le résultat final.

### Étape 6 : `$sort`
Trier les résultats selon un critère précis.

---
