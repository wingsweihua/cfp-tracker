#!/usr/bin/env python3
"""Fetch open funding opportunities from grants.gov for target agencies and write per-agency JSON files."""

import json
import os
import sys
import time
from datetime import datetime

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# grants.gov REST API
GRANTS_API = "https://api.grants.gov/v1/api/search2"

# Agency configs: key = tab id, agency_codes = grants.gov agency codes
AGENCIES = {
    "nsf": {
        "name": "National Science Foundation",
        "codes": ["NSF"],
    },
    "doe": {
        "name": "Department of Energy",
        "codes": ["DOE-GFO"],
    },
    "usda": {
        "name": "U.S. Department of Agriculture",
        "codes": ["USDA-NIFA-ERA", "USDA-RBCS", "USDA-NIFA"],
    },
    "dod": {
        "name": "Department of Defense",
        "codes": ["DOD-DARPA-DSO", "DOD-COE-FW", "DOD-COE-PORT"],
    },
}

ROWS_PER_PAGE = 100
MAX_PAGES = 3  # up to 300 results per agency


def _session():
    s = requests.Session()
    retries = Retry(total=5, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504])
    s.mount("https://", HTTPAdapter(max_retries=retries))
    return s


def fetch_agency(session, agency_key, cfg):
    """Fetch open opportunities for one agency from grants.gov search API."""
    items = []
    seen = set()
    for page in range(1, MAX_PAGES + 1):
        payload = {
            "keyword": "",
            "oppStatuses": "forecasted|posted",
            "agencies": "|".join(cfg["codes"]),
            "sortBy": "openDate|desc",
            "rows": ROWS_PER_PAGE,
            "offset": (page - 1) * ROWS_PER_PAGE,
        }
        try:
            resp = session.post(GRANTS_API, json=payload, timeout=60)
            resp.raise_for_status()
            body = resp.json()
            data = body.get("data", body)
        except Exception as e:
            print(f"  [WARN] page {page} failed: {e}", file=sys.stderr)
            break

        hits = data.get("oppHits", [])
        if not hits:
            break

        for opp in hits:
            opp_id = str(opp.get("id", ""))
            if not opp_id or opp_id in seen:
                continue
            seen.add(opp_id)

            close_date = opp.get("closeDate", "")
            open_date = opp.get("openDate", "")
            # Format dates from "MMddyyyy" to "YYYY-MM-DD"
            close_fmt = _fmt_date(close_date)
            open_fmt = _fmt_date(open_date)

            items.append({
                "id": opp.get("number", opp_id),
                "title": opp.get("title", ""),
                "agency": opp.get("agency", cfg["name"]),
                "open_date": open_fmt,
                "close_date": close_fmt,
                "status": opp.get("oppStatus", ""),
                "link": f"https://www.grants.gov/search-results-detail/{opp_id}",
                "description": opp.get("description", "") or "",
                "opp_number": opp.get("number", ""),
            })

        if len(hits) < ROWS_PER_PAGE:
            break
        time.sleep(1)  # be polite

    return items


def _fmt_date(raw):
    """Convert grants.gov date to YYYY-MM-DD, or return as-is."""
    if not raw:
        return ""
    raw = str(raw).strip()
    for fmt in ("%m/%d/%Y", "%m%d%Y"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return raw


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    session = _session()
    now = datetime.now(tz=__import__('datetime').timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    for key, cfg in AGENCIES.items():
        print(f"Fetching {cfg['name']} ...")
        items = fetch_agency(session, key, cfg)
        out = {"updated": now, "agency": cfg["name"], "opportunities": items}
        path = os.path.join(DATA_DIR, f"{key}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(f"  Wrote {len(items)} opportunities to {path}")

    print("Done.")


if __name__ == "__main__":
    main()
