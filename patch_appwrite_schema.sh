#!/usr/bin/env bash
set -euo pipefail

# ===== Config (override in your shell if needed) =====
APPWRITE_ENDPOINT="${APPWRITE_ENDPOINT:-https://nyc.cloud.appwrite.io/v1}"
APPWRITE_PROJECT_ID="${APPWRITE_PROJECT_ID:-68962c5c0016ec249775}"
: "${APPWRITE_API_KEY:?Set APPWRITE_API_KEY in your shell before running}"

DB_ID="${DB_ID:-689a13b20029824fedb5}"       # REAL Database ID
VENDORS_COL="${VENDORS_COL:-vendors}"        # collection ID
USERPROFILES_COL="${USERPROFILES_COL:-user_profiles}"

ok(){ [[ "$1" == "200" || "$1" == "201" || "$1" == "202" || "$1" == "204" || "$1" == "409" ]]; }

# --- HTTP helpers (no jq required) ---
http_post() {
  local path="$1" body="$2"
  curl -sS -w "\n%{http_code}" -X POST \
    -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
    -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
    -H "Content-Type: application/json" \
    "$APPWRITE_ENDPOINT$path" -d "$body"
}
http_get() {
  local path="$1"
  curl -sS -w "\n%{http_code}" -X GET \
    -H "X-Appwrite-Project: $APPWRITE_PROJECT_ID" \
    -H "X-Appwrite-Key: $APPWRITE_API_KEY" \
    -H "Content-Type: application/json" \
    "$APPWRITE_ENDPOINT$path"
}

# --- Poll until attribute is available (or failed) ---
wait_attr() {
  local col="$1" key="$2" tries="${3:-30}"
  echo "  … waiting for attribute '$key' in '$col' to be available"
  for ((i=1;i<=tries;i++)); do
    local out body code flat
    out=$(http_get "/databases/$DB_ID/collections/$col/attributes")
    body=$(printf "%s" "$out" | sed '$d'); code=$(printf "%s" "$out" | tail -n1)
    if [[ "$code" != "200" ]]; then
      echo "    (GET attributes HTTP $code) retrying…"; sleep 1; continue
    fi
    flat=$(printf "%s" "$body" | tr -d '\n' | tr -d '\r')
    # Rough match: ensure same JSON blob mentions this key + available
    if [[ "$flat" == *"\"key\":\"$key\""* && "$flat" == *"\"key\":\"$key\""*"status\":\"available\""* ]]; then
      echo "    ✓ '$key' is available"
      return 0
    fi
    if [[ "$flat" == *"\"key\":\"$key\""*"status\":\"failed\""* ]]; then
      echo "    ✗ '$key' creation failed"; return 1
    fi
    sleep 1
  done
  echo "    ✗ timeout waiting for '$key'"; return 1
}

# --- Poll until index is available (or failed) ---
wait_index() {
  local col="$1" idx_key="$2" tries="${3:-30}"
  echo "  … waiting for index '$idx_key' on '$col' to be available"
  for ((i=1;i<=tries;i++)); do
    local out body code flat
    out=$(http_get "/databases/$DB_ID/collections/$col/indexes")
    body=$(printf "%s" "$out" | sed '$d'); code=$(printf "%s" "$out" | tail -n1)
    if [[ "$code" != "200" ]]; then
      echo "    (GET indexes HTTP $code) retrying…"; sleep 1; continue
    fi
    flat=$(printf "%s" "$body" | tr -d '\n' | tr -d '\r')
    if [[ "$flat" == *"\"key\":\"$idx_key\""*"status\":\"available\""* ]]; then
      echo "    ✓ index '$idx_key' is available"
      return 0
    fi
    if [[ "$flat" == *"\"key\":\"$idx_key\""*"status\":\"failed\""* ]]; then
      echo "    ✗ index '$idx_key' failed"; return 1
    fi
    sleep 1
  done
  echo "    ✗ timeout waiting for index '$idx_key'"; return 1
}

add_string_attr() {
  local col="$1" key="$2" size="$3" required="$4"
  local payload
  payload=$(printf '{"key":"%s","size":%s,"required":%s}' "$key" "$size" "$required")
  local out body code
  out=$(http_post "/databases/$DB_ID/collections/$col/attributes/string" "$payload")
  body=$(printf "%s" "$out" | sed '$d'); code=$(printf "%s" "$out" | tail -n1)
  if ok "$code"; then
    echo "  ✓ request to create attr $col.$key accepted (HTTP $code)"
    wait_attr "$col" "$key"
  else
    echo "  ✗ $col.$key creation failed (HTTP $code)"; printf "%s\n" "$body"; exit 1
  fi
}

add_unique_index_on_slug() {
  local col="$1" idx="uniq_slug"
  local payload='{"key":"'"$idx"'","type":"unique","attributes":["slug"],"orders":["ASC"]}'
  local out body code
  out=$(http_post "/databases/$DB_ID/collections/$col/indexes" "$payload")
  body=$(printf "%s" "$out" | sed '$d'); code=$(printf "%s" "$out" | tail -n1)
  if ok "$code"; then
    echo "  ✓ request to create unique index on slug accepted (HTTP $code)"
    wait_index "$col" "$idx"
  else
    echo "  ✗ unique index creation failed (HTTP $code)"; printf "%s\n" "$body"; exit 1
  fi
}

echo "==> Patching schema on DB: $DB_ID"

echo "==> Vendors: add required string attributes"
add_string_attr "$VENDORS_COL" "status" 32 true
add_string_attr "$VENDORS_COL" "team_id" 64 true

echo "==> User Profiles: add required string attribute"
add_string_attr "$USERPROFILES_COL" "role" 32 true

echo "==> Vendors: ensure unique index on slug"
add_unique_index_on_slug "$VENDORS_COL"

echo "==> Done."
echo "If onboarding still says 'not authorized to create', in Console enable:"
echo "Database → $DB_ID → ($VENDORS_COL & $USERPROFILES_COL) → Settings → Permissions → **Create → users**."
