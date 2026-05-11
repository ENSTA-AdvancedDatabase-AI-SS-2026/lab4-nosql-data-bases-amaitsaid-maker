from cassandra.cluster import Cluster
from cassandra.query import BatchStatement, BatchType
from cassandra.io.asyncioreactor import AsyncioConnection
import uuid
import random
from datetime import datetime, timedelta
import time

# Configuration
CASSANDRA_HOST = '127.0.0.1' # Utilise l'IP locale pour Docker
KEYSPACE = 'smartgrid'
NB_CAPTEURS = 10000
MINUTES_HISTORIQUE = 5

WILAYAS = ["Alger", "Oran", "Constantine", "Annaba", "Blida"]
COMMUNES = {
    "Alger": ["Bab Ezzouar", "Hydra", "El Harrach", "Dar El Beida"],
    "Oran": ["Bir El Djir", "Es Senia", "Arzew"],
    "Constantine": ["El Khroub", "Ain Smara", "Hamma Bouziane"],
    "Annaba": ["El Bouni", "El Hadjar", "Seraidi"],
    "Blida": ["Bougara", "Boufarik", "Larbaa"],
}

def connect():
    """Connexion au cluster Cassandra en utilisant le moteur Asyncio"""
    cluster = Cluster(
        [CASSANDRA_HOST],
        connection_class=AsyncioConnection  # <--- On force l'utilisation d'Asyncio
    )
    session = cluster.connect(KEYSPACE)
    return session, cluster

def generate_mesure(capteur_id, wilaya, commune, timestamp):
    tension_base = 220 
    return {
        "capteur_id": capteur_id,
        "date_jour": timestamp.date(),
        "timestamp": timestamp,
        "wilaya": wilaya,
        "commune": commune,
        "tension_v": round(tension_base + random.gauss(0, 5), 2),
        "courant_a": round(random.uniform(0.5, 15.0), 2),
        "puissance_kw": round(random.uniform(0.1, 3.3), 3),
        "frequence_hz": round(50 + random.gauss(0, 0.1), 2),
        "temperature": round(random.uniform(20, 65), 1),
        "alerte": random.random() < 0.05,
    }

# On prépare la requête une seule fois globalement pour la réutiliser
INSERT_QUERY = """
    INSERT INTO mesures_par_capteur (
        capteur_id, date_jour, timestamp, wilaya, commune, 
        tension_v, courant_a, puissance_kw, frequence_hz, temperature, alerte
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

def insert_batch(session, prepared_stmt, mesures: list):
    """
    Insère un batch de mesures. 
    On utilise UNLOGGED car on ne cherche pas l'atomicité sur plusieurs partitions,
    mais juste à réduire le nombre d'allers-retours réseau.
    """
    batch = BatchStatement(batch_type=BatchType.UNLOGGED)
    for m in mesures:
        batch.add(prepared_stmt, (
            m['capteur_id'], m['date_jour'], m['timestamp'], m['wilaya'], m['commune'],
            m['tension_v'], m['courant_a'], m['puissance_kw'], m['frequence_hz'], 
            m['temperature'], m['alerte']
        ))
    session.execute(batch)

def run_ingestion(session):
    print(f"🚀 Préparation de l'ingestion pour {NB_CAPTEURS} capteurs...")
    prepared = session.prepare(INSERT_QUERY)
    
    # 1. Génération du parc de capteurs
    capteurs = []
    for _ in range(NB_CAPTEURS):
        w = random.choice(WILAYAS)
        capteurs.append({
            "id": uuid.uuid4(),
            "wilaya": w,
            "commune": random.choice(COMMUNES[w])
        })

    start_time = time.time()
    total_inserted = 0
    now = datetime.now()

    # 2. Boucle sur le temps (dernières X minutes)
    for i in range(MINUTES_HISTORIQUE):
        ts = now - timedelta(minutes=i)
        print(f"   Traitement minute T-{i}...")
        
        # On traite les capteurs par blocs de 50 pour le batching
        for j in range(0, len(capteurs), 50):
            batch_data = []
            for capteur in capteurs[j:j+50]:
                mesure = generate_mesure(capteur['id'], capteur['wilaya'], capteur['commune'], ts)
                batch_data.append(mesure)
            
            insert_batch(session, prepared, batch_data)
            total_inserted += len(batch_data)

    elapsed = time.time() - start_time
    print(f"\n✅ {total_inserted:,} mesures insérées en {elapsed:.2f}s")
    print(f"📊 Débit : {total_inserted/elapsed:,.0f} mesures/seconde")

if __name__ == "__main__":
    try:
        session, cluster = connect()
        run_ingestion(session)
    except Exception as e:
        print(f"❌ Erreur : {e}")
    finally:
        if 'cluster' in locals():
            cluster.shutdown()