import redis
import json
import time
from typing import Optional

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def slow_db_get_product(product_id: int) -> Optional[dict]:
    """Simule une requête PostgreSQL lente (2 secondes)"""
    time.sleep(2)
    products = {
        1: {"id": 1, "name": "Samsung Galaxy A54", "price": 65000, "stock": 15},
        2: {"id": 2, "name": "Laptop HP 15-inch", "price": 120000, "stock": 8},
        3: {"id": 3, "name": "Casque JBL Bluetooth", "price": 12000, "stock": 50},
        4: {"id": 4, "name": "Clavier Mécanique", "price": 8000, "stock": 30},
    }
    return products.get(product_id)

def get_product_cached(r, product_id: int, ttl: int = 600) -> Optional[dict]:
    """
    Pattern Cache-Aside :
    1. Chercher dans Redis (clé: "product_cache:{product_id}")
    2. Si MISS → chercher dans slow_db → stocker dans Redis avec TTL
    3. Retourner le produit
    4. Afficher si c'est un HIT ou MISS avec la latence
    """
    start = time.time()
    key = f"product_cache:{product_id}"
    
    cached = r.get(key)
    
    if cached:
        elapsed = int((time.time() - start) * 1000)
        print(f"CACHE HIT ({elapsed}ms)")
        return json.loads(cached)
        
    product = slow_db_get_product(product_id)
    if product:
        r.set(key, json.dumps(product), ex=ttl)
        
    elapsed = int((time.time() - start) * 1000)
    print(f"CACHE MISS ({elapsed}ms)")
    return product

def invalidate_product_cache(r, product_id: int):
    """Supprimer le cache d'un produit (après mise à jour en DB)"""
    r.delete(f"product_cache:{product_id}")

def benchmark_cache(r, product_id: int, iterations: int = 20):
    """
    Effectuer 'iterations' appels à get_product_cached
    Afficher :
    - Temps moyen cache HIT
    - Temps moyen cache MISS
    - Taux de cache hit (%)
    """
    invalidate_product_cache(r, product_id)
    
    hits = 0
    misses = 0
    hit_time = 0
    miss_time = 0
    
    for _ in range(iterations):
        start = time.time()
        get_product_cached(r, product_id)
        elapsed = (time.time() - start) * 1000
        
        if elapsed > 1000:
            misses += 1
            miss_time += elapsed
        else:
            hits += 1
            hit_time += elapsed
            
    avg_hit = hit_time / hits if hits > 0 else 0
    avg_miss = miss_time / misses if misses > 0 else 0
    hit_rate = (hits / iterations) * 100
    
    print("\n--- Benchmark ---")
    print(f"Temps moyen HIT: {avg_hit:.2f} ms")
    print(f"Temps moyen MISS: {avg_miss:.2f} ms")
    print(f"Taux de hit: {hit_rate}%")

if __name__ == "__main__":
    r.flushdb()
    
    print("=== Test Cache-Aside ===")
    print("\nPremier appel (MISS attendu):")
    get_product_cached(r, 1)
    
    print("\nDeuxième appel (HIT attendu):")
    get_product_cached(r, 1)
    
    print("\n=== Benchmark ===")
    benchmark_cache(r, 1, iterations=10)