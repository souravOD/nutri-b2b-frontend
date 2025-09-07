#!/usr/bin/env bash
set -euo pipefail

# --------- CONFIG (edit) ----------
APPWRITE_ENDPOINT="${APPWRITE_ENDPOINT:-https://nyc.cloud.appwrite.io/v1}"
APPWRITE_PROJECT="${APPWRITE_PROJECT:-68962c5c0016ec249775}"
APPWRITE_API_KEY="${APPWRITE_API_KEY:-standard_d7324c9a223f3ac680bef52e1d2b28c3e7620dc9c75ffb6e76558f652b9acfb47c8753329a7a45885e09eb92c429293578c125eedf3a8c50f1926b7d910c4ddabb2146df693cc3764002947de8eae7ce1aaea6997e8a0f2e8a60471eaa1b2213860fac1ee77b0b620a209562b290a2ae9af74df6202309835c6c73da33dd5152}"

DB_ID="${DB_ID:-689a13b20029824fedb5}"
VENDORS_COL_ID="${VENDORS_COL_ID:-vendors}"

# Optional: path to JSON like the sample above
VENDORS_JSON="${VENDORS_JSON:-./vendors.json}"
# ----------------------------------

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq not found. Install jq and re-run."; exit 1
fi

HDR=(-H "X-Appwrite-Project: ${APPWRITE_PROJECT}"
     -H "X-Appwrite-Key: ${APPWRITE_API_KEY}"
     -H "Content-Type: application/json")

api_get()  { curl -fsS  "$@" ; }
api_post() { curl -fsS -X POST "$@" ; }
api_patch(){ curl -fsS -X PATCH "$@" ; }

echo "==> Ensuring Vendors schema (team_id + domains + index)"

# --- helpers to poll collection state for attribute/index availability ---
get_collection_json() {
  api_get "${APPWRITE_ENDPOINT}/databases/${DB_ID}/collections/${VENDORS_COL_ID}" "${HDR[@]}"
}

attr_status() {
  local key="$1"
  get_collection_json | jq -r --arg k "$key" '
    (.attributes // []) | map(select(.key==$k)) | (.[0].status // "absent")'
}

index_status() {
  local key="$1"
  get_collection_json | jq -r --arg k "$key" '
    (.indexes // []) | map(select(.key==$k)) | (.[0].status // "absent")'
}

wait_attr_available() {
  local key="$1"
  local s
  for i in {1..30}; do
    s="$(attr_status "$key")"
    if [[ "$s" == "available" ]]; then return 0; fi
    if [[ "$s" == "absent" ]]; then break; fi
    echo "   … attribute '$key' status=$s (waiting)"
    sleep 2
  done
  # if still not available, let caller decide
}

wait_index_available() {
  local key="$1"
  local s
  for i in {1..30}; do
    s="$(index_status "$key")"
    if [[ "$s" == "available" ]]; then return 0; fi
    if [[ "$s" == "absent" ]]; then break; fi
    echo "   … index '$key' status=$s (waiting)"
    sleep 2
  done
}

ensure_string_attr() {
  local key="$1" size="$2" required="$3" array="$4"
  local s
  s="$(attr_status "$key")"
  if [[ "$s" == "available" || "$s" == "processing" ]]; then
    echo " - attribute '$key' already $s"
    wait_attr_available "$key" || true
    return 0
  fi
  echo " - creating attribute '$key'"
  api_post "${APPWRITE_ENDPOINT}/databases/${DB_ID}/collections/${VENDORS_COL_ID}/attributes/string" \
    "${HDR[@]}" \
    -d "$(jq -nc --arg k "$key" --argjson size "$size" --argjson req "$required" --argjson arr "$array" \
      '{key:$k,size:$size,required:$req,array:$arr}')" >/dev/null
  wait_attr_available "$key"
}

ensure_index() {
  local key="$1"; shift
  local attrs=("$@")  # array of attribute names
  local s
  s="$(index_status "$key")"
  if [[ "$s" == "available" || "$s" == "processing" ]]; then
    echo " - index '$key' already $s"
    wait_index_available "$key" || true
    return 0
  fi
  echo " - creating index '$key' on: ${attrs[*]}"
  # orders all ASC
  local orders="$(printf '"ASC",' | sed 's/,$//')" # not used; we build via jq
  api_post "${APPWRITE_ENDPOINT}/databases/${DB_ID}/collections/${VENDORS_COL_ID}/indexes" \
    "${HDR[@]}" \
    -d "$(jq -nc --arg key "$key" --arg type "key" \
          --argjson attrs "$(printf '%s\n' "${attrs[@]}" | jq -R . | jq -s .)" \
          --argjson orders "$(printf '%s\n' "${attrs[@]}" | sed 's/.*/"ASC"/' | jq -R . | jq -s .)" \
          '{key:$key,type:$type,attributes:$attrs,orders:$orders}')" >/dev/null
  wait_index_available "$key"
}

# 1) ensure attributes
ensure_string_attr "team_id" 64 true  false
ensure_string_attr "domains" 128 false true

# 2) ensure index on domains
ensure_index "idx_domains" "domains"

echo "==> Seeding vendors from ${VENDORS_JSON}"
if [[ ! -f "$VENDORS_JSON" ]]; then
  echo "ERROR: $VENDORS_JSON not found"; exit 1
fi

# Lookup team id by name (case-insensitive) using queries[]=search("..")
lookup_team_id() {
  local name="$1"
  local res
  res="$(curl -fsS -G "${APPWRITE_ENDPOINT}/teams" \
        -H "X-Appwrite-Project: ${APPWRITE_PROJECT}" \
        -H "X-Appwrite-Key: ${APPWRITE_API_KEY}" \
        --data-urlencode "queries[]=$(jq -nc --arg q "$name" ' "search(\""+$q+"\")" ' | jq -r .)" \
        --data-urlencode "limit=100")"
  echo "$res" | jq -r --arg n "${name,,}" '.teams[] | select((.name|ascii_downcase)==$n) | .$id' | head -n1
}

# Iterate and upsert
jq -c '.[]' "$VENDORS_JSON" | while read -r row; do
  name=$(jq -r '.name'      <<<"$row")
  slug=$(jq -r '.slug'      <<<"$row")
  tname=$(jq -r '.team_name'<<<"$row")
  domains=$(jq -c '.domains'<<<"$row")

  echo "-- ${name} (${slug})"
  team_id="$(lookup_team_id "$tname" || true)"
  if [[ -z "${team_id:-}" ]]; then
    echo "   !! No team found named '${tname}'. Create it first in Console → Auth → Teams."
    continue
  fi

  # Try create with custom id = slug
  if ! api_post "${APPWRITE_ENDPOINT}/databases/${DB_ID}/collections/${VENDORS_COL_ID}/documents" \
       "${HDR[@]}" \
       -d "$(jq -nc --arg id "$slug" --arg name "$name" --arg slug "$slug" --arg team "$team_id" --argjson dom "$domains" \
            '{documentId:$id, data:{name:$name, slug:$slug, team_id:$team, domains:$dom}}')" >/dev/null 2>&1; then
    # If exists, PATCH
    api_patch "${APPWRITE_ENDPOINT}/databases/${DB_ID}/collections/${VENDORS_COL_ID}/documents/${slug}" \
      "${HDR[@]}" \
      -d "$(jq -nc --arg name "$name" --arg team "$team_id" --argjson dom "$domains" \
           '{data:{name:$name, team_id:$team, domains:$dom}}')" >/dev/null
  fi

  echo "   ✓ upserted vendor with team_id=${team_id}"
done

echo "==> All done."