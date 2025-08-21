#!/usr/bin/env bash
set -euo pipefail

# ========= CONFIG (defaults set to YOUR project) =========
APPWRITE_ENDPOINT="${APPWRITE_ENDPOINT:-https://nyc.cloud.appwrite.io/v1}"
APPWRITE_PROJECT_ID="${APPWRITE_PROJECT_ID:-68962c5c0016ec249775}"
APPWRITE_API_KEY="${APPWRITE_API_KEY:-standard_d7324c9a223f3ac680bef52e1d2b28c3e7620dc9c75ffb6e76558f652b9acfb47c8753329a7a45885e09eb92c429293578c125eedf3a8c50f1926b7d910c4ddabb2146df693cc3764002947de8eae7ce1aaea6997e8a0f2e8a60471eaa1b2213860fac1ee77b0b620a209562b290a2ae9af74df6202309835c6c73da33dd5152}"

DB_ID="${DB_ID:-689a13b20029824fedb5}"
VENDORS_COL="${VENDORS_COL:-vendors}"
USERPROFILES_COL="${USERPROFILES_COL:-user_profiles}"
# =========================================================

# ---- helpers ----
req() {
  local method="$1"; shift
  local path="$1"; shift
  local data="${1:-}"
  if [ -n "$data" ]; then
    curl -sS -X "$method" \
      -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
      -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
      -H "Content-Type: application/json" \
      "$APPWRITE_ENDPOINT$path" \
      -d "$data"
  else
    curl -sS -X "$method" \
      -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
      -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
      -H "Content-Type: application/json" \
      "$APPWRITE_ENDPOINT$path"
  fi
}

exists_db() {
  code=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
    -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
    -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
    "$APPWRITE_ENDPOINT/databases/$DB_ID")
  [ "$code" = "200" ]
}

pause() { sleep "${1:-2}"; }

# ---- start ----
echo "==> Checking database '$DB_ID' exists…"
if exists_db; then
  echo "    OK: Database '$DB_ID' found."
else
  echo "    Not found. Creating database '$DB_ID'…"
  req POST "/databases" "{\"databaseId\":\"$DB_ID\",\"name\":\"$DB_ID\"}" >/dev/null || true
fi

echo "==> Creating/ensuring collection '$VENDORS_COL'…"
req POST "/databases/$DB_ID/collections" "{
  \"collectionId\":\"$VENDORS_COL\",
  \"name\":\"Vendors\",
  \"documentSecurity\":true,
  \"permissions\":[],
  \"enabled\":true
}" >/dev/null || true

echo "==> Creating/ensuring collection '$USERPROFILES_COL'…"
req POST "/databases/$DB_ID/collections" "{
  \"collectionId\":\"$USERPROFILES_COL\",
  \"name\":\"User Profiles\",
  \"documentSecurity\":true,
  \"permissions\":[],
  \"enabled\":true
}" >/dev/null || true

# -------- Vendors attributes --------
echo "==> Vendors: attributes"
req POST "/databases/$DB_ID/collections/$VENDORS_COL/attributes/string" '{
  "key":"name","size":128,"required":true
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$VENDORS_COL/attributes/string" '{
  "key":"slug","size":64,"required":true
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$VENDORS_COL/attributes/string" '{
  "key":"billing_email","size":254,"required":true
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$VENDORS_COL/attributes/string" '{
  "key":"owner_user_id","size":64,"required":true
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$VENDORS_COL/attributes/enumeration" '{
  "key":"status","elements":["active","suspended"],"required":true,"default":"active"
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$VENDORS_COL/attributes/datetime" '{
  "key":"created_at","required":true
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$VENDORS_COL/attributes/string" '{
  "key":"phone","size":32,"required":false
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$VENDORS_COL/attributes/string" '{
  "key":"country","size":2,"required":false
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$VENDORS_COL/attributes/string" '{
  "key":"timezone","size":64,"required":false
}' >/dev/null || true

pause 3

echo "==> Vendors: indexes"
req POST "/databases/$DB_ID/collections/$VENDORS_COL/indexes" '{
  "key":"uniq_slug","type":"unique","attributes":["slug"],"orders":["ASC"]
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$VENDORS_COL/indexes" '{
  "key":"idx_owner","type":"key","attributes":["owner_user_id"],"orders":["ASC"]
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$VENDORS_COL/indexes" '{
  "key":"idx_status","type":"key","attributes":["status"],"orders":["ASC"]
}' >/dev/null || true

# -------- User Profiles attributes --------
echo "==> User Profiles: attributes"
req POST "/databases/$DB_ID/collections/$USERPROFILES_COL/attributes/string" '{
  "key":"user_id","size":64,"required":true
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$USERPROFILES_COL/attributes/string" '{
  "key":"vendor_id","size":64,"required":true
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$USERPROFILES_COL/attributes/string" '{
  "key":"full_name","size":80,"required":true
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$USERPROFILES_COL/attributes/enumeration" '{
  "key":"role","elements":["admin","operator"],"required":true,"default":"admin"
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$USERPROFILES_COL/attributes/datetime" '{
  "key":"created_at","required":true
}' >/dev/null || true

pause 3

echo "==> User Profiles: indexes"
req POST "/databases/$DB_ID/collections/$USERPROFILES_COL/indexes" '{
  "key":"idx_user","type":"key","attributes":["user_id"],"orders":["ASC"]
}' >/dev/null || true

req POST "/databases/$DB_ID/collections/$USERPROFILES_COL/indexes" '{
  "key":"idx_vendor","type":"key","attributes":["vendor_id"],"orders":["ASC"]
}' >/dev/null || true

echo "==> Done. DB: $DB_ID, Collections: $VENDORS_COL, $USERPROFILES_COL"
