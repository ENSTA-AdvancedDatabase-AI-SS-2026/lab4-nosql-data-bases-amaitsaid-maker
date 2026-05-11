-- ─── 1.1 : Créer le Keyspace ──────────────────────────────────────────────────
-- Pour le TP local, on utilise SimpleStrategy. 
-- NetworkTopologyStrategy est réservé aux clusters multi-datacenters.

CREATE KEYSPACE IF NOT EXISTS smartgrid
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE smartgrid;

-- ─── 1.2 : Table mesures_par_capteur ──────────────────────────────────────────
-- Requête cible : "Mesures du capteur X entre T1 et T2"
-- Optimisation : On partitionne par (capteur_id, jour) pour éviter qu'une 
-- partition ne devienne trop grosse au fil des mois (Hot Partition).

CREATE TABLE IF NOT EXISTS mesures_par_capteur (
    capteur_id    UUID,
    date_jour     DATE,      -- Bucket pour limiter la taille de la partition
    timestamp     TIMESTAMP,
    wilaya        TEXT,
    commune       TEXT,
    tension_v     FLOAT,
    courant_a     FLOAT,
    puissance_kw  FLOAT,
    frequence_hz  FLOAT,
    temperature   FLOAT,
    alerte        BOOLEAN,
    code_alerte   TEXT,
    -- Partition Key: (capteur_id, date_jour) 
    -- Clustering Key: timestamp (trié par défaut pour les requêtes d'intervalle)
    PRIMARY KEY ((capteur_id, date_jour), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND default_time_to_live = 7776000; -- 90 jours


-- ─── 1.3 : Table alertes_par_wilaya ───────────────────────────────────────────
-- Requête cible : "Alertes de la wilaya X le jour Y"

CREATE TABLE IF NOT EXISTS alertes_par_wilaya (
    wilaya       TEXT,
    date_jour    DATE,
    timestamp    TIMESTAMP,
    capteur_id   UUID,
    code_alerte  TEXT,
    description  TEXT,
    gravite      INT,
    resolue      BOOLEAN,
    -- Partition Key: wilaya + jour pour un accès direct
    -- Clustering Key: timestamp pour voir les plus récentes d'abord
    PRIMARY KEY ((wilaya, date_jour), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND default_time_to_live = 31536000; -- 1 an


-- ─── 1.4 : Table agregats_horaires ────────────────────────────────────────────
-- Requête cible : "Consommation moyenne par heure pour le dashboard wilaya"

CREATE TABLE IF NOT EXISTS agregats_horaires (
    wilaya            TEXT,
    date_heure        TIMESTAMP, -- ex: 2026-05-11 14:00:00
    nb_capteurs       INT,
    puissance_moy_kw  FLOAT,
    puissance_max_kw  FLOAT,
    puissance_min_kw  FLOAT,
    nb_alertes        INT,
    -- Partition Key: wilaya (Dashboard par Wilaya)
    -- Clustering Key: date_heure (Série temporelle pour le graphique)
    PRIMARY KEY (wilaya, date_heure)
) WITH CLUSTERING ORDER BY (date_heure DESC)
  AND default_time_to_live = 157680000; -- 5 ans


-- Vérification
DESCRIBE TABLES;