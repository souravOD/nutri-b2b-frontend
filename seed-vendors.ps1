#Requires -Version 5.1
param(
  [string]$VendorsJson = ".\vendors.json"
)

$ErrorActionPreference = "Stop"

# ---------- CONFIG ----------
$endpoint = $env:APPWRITE_ENDPOINT   # e.g. https://nyc.cloud.appwrite.io/v1
$project  = $env:APPWRITE_PROJECT
$apiKey   = $env:APPWRITE_API_KEY
$dbId     = $env:DB_ID
$colId    = $env:VENDORS_COL_ID      # e.g. vendors
# ----------------------------

if (-not $endpoint -or -not $project -or -not $apiKey -or -not $dbId -or -not $colId) {
  throw "Set APPWRITE_ENDPOINT, APPWRITE_PROJECT, APPWRITE_API_KEY, DB_ID, VENDORS_COL_ID environment variables."
}
if (-not (Test-Path $VendorsJson)) {
  throw "Vendors json not found: $VendorsJson"
}

$Headers = @{
  "X-Appwrite-Project" = $project
  "X-Appwrite-Key"     = $apiKey
  "Content-Type"       = "application/json"
}

function Get-Collection {
  Invoke-RestMethod -Uri "$endpoint/databases/$dbId/collections/$colId" -Headers $Headers -Method Get
}

function Get-AttrStatus([string]$key) {
  $c = Get-Collection
  $attr = ($c.attributes | Where-Object { $_.key -eq $key })
  if ($null -eq $attr) { return "absent" }
  return $attr.status
}

function Get-IndexStatus([string]$key) {
  $c = Get-Collection
  $idx = ($c.indexes | Where-Object { $_.key -eq $key })
  if ($null -eq $idx) { return "absent" }
  return $idx.status
}

function Wait-AttrAvailable([string]$key) {
  for ($i=0; $i -lt 30; $i++) {
    $s = Get-AttrStatus $key
    if ($s -eq "available") { return }
    if ($s -eq "absent") { break }
    Write-Host ("   ... attribute '{0}' status={1} (waiting)" -f $key, $s)
    Start-Sleep -Seconds 2
  }
}

function Wait-IndexAvailable([string]$key) {
  for ($i=0; $i -lt 30; $i++) {
    $s = Get-IndexStatus $key
    if ($s -eq "available") { return }
    if ($s -eq "absent") { break }
    Write-Host ("   ... index '{0}' status={1} (waiting)" -f $key, $s)
    Start-Sleep -Seconds 2
  }
}

function Ensure-StringAttr([string]$key, [int]$size, [bool]$required, [bool]$array) {
  $s = Get-AttrStatus $key
  if ($s -in @("available","processing")) {
    Write-Host (" - attribute '{0}' already {1}" -f $key, $s)
    Wait-AttrAvailable $key
    return
  }
  Write-Host (" - creating attribute '{0}'" -f $key)
  $body = @{ key=$key; size=$size; required=$required; array=$array } | ConvertTo-Json
  Invoke-RestMethod -Uri "$endpoint/databases/$dbId/collections/$colId/attributes/string" -Headers $Headers -Method Post -Body $body | Out-Null
  Wait-AttrAvailable $key
}

function Ensure-Index([string]$key, [string[]]$attrs) {
  $s = Get-IndexStatus $key
  if ($s -in @("available","processing")) {
    Write-Host (" - index '{0}' already {1}" -f $key, $s)
    Wait-IndexAvailable $key
    return
  }
  Write-Host (" - creating index '{0}' on: {1}" -f $key, ($attrs -join ", "))
  $orders = @()
  foreach ($a in $attrs) { $orders += "ASC" }
  $body = @{ key=$key; type="key"; attributes=$attrs; orders=$orders } | ConvertTo-Json -Depth 5
  Invoke-RestMethod -Uri "$endpoint/databases/$dbId/collections/$colId/indexes" -Headers $Headers -Method Post -Body $body | Out-Null
  Wait-IndexAvailable $key
}

function Lookup-TeamId([string]$teamName) {
  # Use ?search= for Teams (NOT queries[]=)
  $encoded = [System.Uri]::EscapeDataString($teamName)
  $res = Invoke-RestMethod -Uri "$endpoint/teams?search=$encoded&limit=100" -Headers $Headers -Method Get

  # exact (case-insensitive) name match first
  $match = $res.teams | Where-Object { $_.name -ieq $teamName } | Select-Object -First 1
  if ($match) { return $match.'$id' }

  # fallback: first partial match (useful if the team is 'Walmart Inc' and your JSON says 'Walmart')
  $partial = $res.teams | Where-Object { $_.name -like "*$teamName*" } | Select-Object -First 1
  return $partial.'$id'
}


Write-Host "==> Ensuring Vendors schema"
Ensure-StringAttr "team_id" 64 $true  $false
Ensure-StringAttr "domains" 128 $false $true
Ensure-Index "idx_domains" @("domains")

Write-Host "==> Seeding vendors from $VendorsJson"
$vendors = Get-Content $VendorsJson -Raw | ConvertFrom-Json

function Get-Document([string]$id) {
  try {
    return Invoke-RestMethod -Uri "$endpoint/databases/$dbId/collections/$colId/documents/$id" `
      -Headers $Headers -Method Get
  } catch {
    return $null
  }
}

# Load schema and build a quick lookup of attributes
$schema   = Get-Collection
$attrsMap = @{}
foreach ($a in $schema.attributes) { $attrsMap[$a.key] = $a }

# Helper: does attribute exist?
function Has-Attr([string]$key) { return $attrsMap.ContainsKey($key) }

# Helper: fill any required string attrs we didn't set
function Fill-RequiredFields([hashtable]$data, [string]$name, [string]$slug) {
  foreach ($a in $schema.attributes) {
    if (-not $a.required) { continue }
    if ($data.ContainsKey($a.key)) { continue }

    switch ($a.type) {
      "string" {
        if ($a.key -match 'slug')       { $data[$a.key] = $slug }
        elseif ($a.key -match 'name')   { $data[$a.key] = $name }
        elseif ($a.key -match 'vendor') { $data[$a.key] = $name }
        else                            { $data[$a.key] = $name }
      }
      "datetime" {
        # RFC3339 / ISO 8601 in UTC (Appwrite-compatible)
        $data[$a.key] = (Get-Date).ToUniversalTime().ToString("o")
      }
      "boolean" { $data[$a.key] = $false }
      "integer" { $data[$a.key] = 0 }
      "double"  { $data[$a.key] = 0 }
      "float"   { $data[$a.key] = 0 }
      default {
        Write-Warning ("   !! Required attribute '{0}' of type '{1}' not auto-filled; set a default or make it optional." -f $a.key, $a.type)
      }
    }
  }
}


foreach ($v in $vendors) {
  $name     = $v.name
  $slug     = $v.slug
  $teamName = $v.team_name
  $domains  = $v.domains

  Write-Host ("-- {0} ({1})" -f $name, $slug)

  # Prefer explicit team_id in JSON; else look up by team name
  if ($v.PSObject.Properties.Name -contains 'team_id' -and $v.team_id) {
    $teamId = $v.team_id
  } else {
    $teamId = Lookup-TeamId $teamName
  }

  if (-not $teamId) {
    Write-Warning ("   !! No team found named '{0}'. Create it in Console -> Auth -> Teams, or add team_id to vendors.json." -f $teamName)
    continue
  }

  # Build data ONLY with attributes that exist in your schema.
  $data = @{}
  if (Has-Attr "name")     { $data["name"]     = $name }
  if (Has-Attr "team_id")  { $data["team_id"]  = $teamId }
  if (Has-Attr "domains")  { $data["domains"]  = $domains }
  if (Has-Attr "slug")     { $data["slug"]     = $slug }        # include slug only if the attribute actually exists
  if (Has-Attr "vendor")   { $data["vendor"]   = $name }        # common alternate key
  if (Has-Attr "company")  { $data["company"]  = $name }        # another common key

  # Auto-fill any remaining required string fields using name/slug
  Fill-RequiredFields -data $data -name $name -slug $slug

  $existing = Get-Document $slug

  if ($existing) {
    $patchBody = @{ data = $data } | ConvertTo-Json -Depth 10
    Invoke-RestMethod -Uri "$endpoint/databases/$dbId/collections/$colId/documents/$slug" `
      -Headers $Headers -Method Patch -Body $patchBody | Out-Null
    Write-Host ("   OK updated existing doc id={0}" -f $slug)
  } else {
    $createBody = @{ documentId = $slug; data = $data } | ConvertTo-Json -Depth 10
    try {
      Invoke-RestMethod -Uri "$endpoint/databases/$dbId/collections/$colId/documents" `
        -Headers $Headers -Method Post -Body $createBody | Out-Null
      Write-Host ("   OK created new doc id={0}" -f $slug)
    } catch {
      # Show the exact API error body if available
      try {
        $respStream = $_.Exception.Response.GetResponseStream()
        if ($respStream) {
          $reader   = New-Object System.IO.StreamReader($respStream)
          $bodyText = $reader.ReadToEnd()
          throw "Create failed for '$slug': $bodyText"
        } else {
          throw "Create failed for '$slug' (no response body)."
        }
      } catch {
        throw "Create failed for '$slug': $($_.Exception.Message)"
      }
    }
  }
}

Write-Host "==> Done."