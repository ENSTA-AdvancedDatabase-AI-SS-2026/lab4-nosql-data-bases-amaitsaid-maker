# ⚡ TP3 : Architecture et Stratégies Cassandra - SmartGrid DZ

## 📋 Présentation du Projet
Ce projet implémente un système de monitoring IoT pour le réseau électrique (**SmartGrid DZ**). L'architecture repose sur **Apache Cassandra**, choisie pour sa capacité à gérer des séries temporelles massives avec une haute disponibilité.

---

## 🏗️ 1. Modélisation et Justification des Clés de Partition

Dans Cassandra, la **Partition Key** détermine la distribution physique des données sur les nœuds du cluster. Un mauvais choix peut créer des **Hot Partitions** (nœuds surchargés).

### Analyse des tables :

| Table | Partition Key | Justification & Risques |
| :--- | :--- | :--- |
| **mesures_par_capteur** | `((capteur_id, date_jour))` | **Bucketing :** L'ajout de `date_jour` est vital. Si on utilisait seulement `capteur_id`, toutes les données historiques d'un capteur finiraient sur un seul nœud, créant une partition géante (Hot Partition). Le bucket journalier garantit des partitions de taille optimale (~100 Mo). |
| **alertes_par_wilaya** | `((wilaya, date_jour))` | **Localité :** Permet de répondre instantanément à la requête "Alertes d'Alger aujourd'hui". Le partitionnement géographique couplé au temps assure que les données liées à un événement régional sont regroupées physiquement. |
| **agregats_horaires** | `wilaya` | **Dashboarding :** Puisque les agrégats sont déjà calculés par heure, la granularité par Wilaya est suffisante pour ne pas saturer une partition tout en permettant des lectures rapides pour les graphiques. |

---

## ⚠️ 2. Le danger de "ALLOW FILTERING" en Production

La clause `ALLOW FILTERING` est souvent perçue comme une solution de facilité, mais elle est **proscrite en environnement de production** pour les raisons suivantes :

1. **Scan Global :** Cassandra est une base distribuée. Sans clé de partition précise, `ALLOW FILTERING` force la base à scanner **tous les nœuds** du cluster.
2. **Latence Imprévisible :** Sur un petit dataset (TP), cela semble rapide. Sur des téraoctets de données, cela transforme une lecture O(1) en un scan O(N), provoquant des timeouts et des pics de latence.
3. **Consommation de Ressources :** Cela sature le CPU et les entrées/sorties (I/O) de tous les nœuds inutilement, pouvant entraîner une instabilité du cluster.
   * *Règle d'or : Si vous avez besoin de FILTERING, c'est que votre modèle de données (table) n'est pas adapté à votre requête.*

---

## 📉 3. Stratégies de Compaction (SSTable Compaction)

Le choix de la stratégie de compaction impacte directement les performances en lecture/écriture et l'utilisation du disque.

| Stratégie | Cas d'Utilisation (Quand l'utiliser ?) | Fonctionnement |
| :--- | :--- | :--- |
| **STCS** (Size Tiered) | **Write-Heavy** (Bases orientées écriture uniquement). | Regroupe les SSTables de tailles similaires. Problème : provoque une fragmentation des données (SSTable sprawl) et nécessite beaucoup d'espace disque temporaire. |
| **LCS** (Leveled) | **Read-Heavy** (Bases avec beaucoup de lectures/mises à jour). | Organise les données en niveaux (Levels). Garantit que 90% des lectures se font sur une seule SSTable. Très efficace pour les lectures, mais coûteux en I/O lors de l'écriture. |
| **TWCS** (Time Window) | **Time-Series / IoT** (Le choix idéal pour ce TP). | Regroupe les données par fenêtres temporelles (ex: toutes les heures). C'est la stratégie la plus performante pour les données avec un **TTL**, car elle permet de supprimer des fichiers entiers dès que la fenêtre expire. |

---

## 🚀 4. Ingestion et Performance

L'ingestion de 50 000 mesures a été optimisée via :
* **Prepared Statements** : Réduction du parsing CPU.
* **Unlogged Batches (taille 50)** : Optimisation du débit réseau sans surcharge de log transactionnel.
* **TTL natif** : Gestion automatique de la rétention (90 jours pour les mesures).
