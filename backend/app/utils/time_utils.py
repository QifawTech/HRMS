from datetime import datetime, timedelta, timezone

# India Standard Time = UTC + 5:30
IST = timezone(timedelta(hours=5, minutes=30))


def now_ist():
    """Return current IST time as naive datetime."""
    return datetime.now(IST).replace(tzinfo=None)


def utc_to_ist(dt):
    """Convert UTC datetime → IST naive datetime."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt + timedelta(hours=5, minutes=30)
    return dt.astimezone(IST).replace(tzinfo=None)


def to_ist_iso(dt):
    """Convert datetime → IST ISO string."""
    if dt is None:
        return None
    ist_dt = utc_to_ist(dt) if dt.tzinfo is None else dt.astimezone(IST).replace(tzinfo=None)
    return ist_dt.isoformat()