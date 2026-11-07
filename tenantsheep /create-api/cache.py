import os
import json
import redis

r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)

# CHALLENGE 5 -- cross-tenant cache leak. The key should be namespaced
# per-org (e.g. f"projects:{org_id}") but is a single shared key instead.
# Log in as org A, list projects (populates the cache), then log in as org B
# and list projects within the 30s TTL window -- you'll get org A's data back.

def get_cached_project_list(org_id: int):
    raw = r.get("projects:list")  # BUG: no org_id in the key
    return json.loads(raw) if raw else None


def set_cached_project_list(org_id: int, data):
    r.setex("projects:list", 30, json.dumps(data))
