from collections import OrderedDict
from copy import deepcopy
from threading import RLock
from time import monotonic

_TTL_SECONDS = 30
_MAX_ENTRIES = 128
_cache: OrderedDict[tuple, tuple[float, dict]] = OrderedDict()
_lock = RLock()


def get_cached_reports(key: tuple) -> dict | None:
    with _lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        created_at, value = entry
        if monotonic() - created_at >= _TTL_SECONDS:
            del _cache[key]
            return None
        _cache.move_to_end(key)
        return deepcopy(value)


def cache_reports(key: tuple, value: dict) -> None:
    if not value.get("items"):
        return
    with _lock:
        _cache[key] = (monotonic(), deepcopy(value))
        _cache.move_to_end(key)
        while len(_cache) > _MAX_ENTRIES:
            _cache.popitem(last=False)


def invalidate_reports_cache() -> None:
    with _lock:
        _cache.clear()
