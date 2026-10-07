from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId

def to_oid(value):
    """Convert string to ObjectId safely. Returns None if invalid."""
    if isinstance(value, ObjectId):
        return value
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None

def serialize(doc):
    """Convert MongoDB document to JSON-safe dict."""
    if doc is None:
        return None

    if isinstance(doc, list):
        return [serialize(d) for d in doc]

    if not isinstance(doc, dict):
        return doc

    out = {}
    for k, v in doc.items():
        if v is None:
            out[k] = None
        elif isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = serialize(v)
        elif isinstance(v, list):
            out[k] = []
            for item in v:
                if isinstance(item, ObjectId):
                    out[k].append(str(item))
                elif isinstance(item, datetime):
                    out[k].append(item.isoformat())
                elif isinstance(item, dict):
                    out[k].append(serialize(item))
                else:
                    out[k].append(item)
        else:
            out[k] = v
    return out

def serialize_list(docs):
    return [serialize(d) for d in docs]