// Types used by UI and backend payload
export type FieldType = "text" | "number" | "array" | "json" | "enum" | "date" | "char";
export type FieldDef = {
  key: string;                // target column key
  label: string;
  required: boolean;
  type: FieldType;
  synonyms: string[];         // header synonyms for auto-map (lowercase)
  enumValues?: string[];
  delimiter?: string;         // default for arrays
  help?: string;
};
export type MappingItem = {
  column?: string;            // CSV header selected; absent => skip
  type: FieldType;
  optional?: boolean;         // UI may set true for non-required fields to skip missing values
  delimiter?: string;         // used for arrays
};
export type MappingPayload = {
  mode: "products" | "customers";
  fields: Record<string, MappingItem>;
};

// ---------- PRODUCTS ----------
export const PRODUCT_FIELDS: FieldDef[] = [
  { key:"external_id", label:"External ID", required:true,  type:"text",
    synonyms:["external_id","sku","id","product_id","upc","ean","barcode"] },
  { key:"name",        label:"Name",        required:true,  type:"text",
    synonyms:["name","product_name","title"] },
  { key:"brand",       label:"Brand",       required:false, type:"text",
    synonyms:["brand","manufacturer"] },
  { key:"description", label:"Description", required:false, type:"text",
    synonyms:["description","desc","details"] },
  { key:"price",       label:"Price",       required:false, type:"number",
    synonyms:["price","mrp","amount"] },
  { key:"currency",    label:"Currency (3-char)", required:false, type:"char",
    synonyms:["currency","curr","iso_currency"] },
  { key:"barcode",     label:"Barcode",     required:false, type:"text",
    synonyms:["barcode","upc","ean"] },
  { key:"gtin_type",   label:"GTIN Type",   required:false, type:"enum",
    enumValues:["ean","upc","isbn","other"], synonyms:["gtin_type","gtin","code_type"] },
  { key:"category_id", label:"Category Id", required:false, type:"text",
    synonyms:["category_id","category"] },
  { key:"sub_category_id", label:"Sub-Category Id", required:false, type:"text",
    synonyms:["sub_category_id","subcategory","sub_category"] },
  { key:"cuisine_id",  label:"Cuisine Id",  required:false, type:"text",
    synonyms:["cuisine_id","cuisine"] },
  { key:"market_id",   label:"Market Id",   required:false, type:"text",
    synonyms:["market_id","market"] },
  { key:"nutrition",   label:"Nutrition (JSON)", required:false, type:"json",
    synonyms:["nutrition","nutrients","nutrition_json"] },
  { key:"serving_size", label:"Serving Size", required:false, type:"text",
    synonyms:["serving_size","serving","portion"] },
  { key:"package_weight", label:"Package Weight", required:false, type:"text",
    synonyms:["package_weight","net_weight","weight"] },
  { key:"dietary_tags", label:"Dietary Tags (| separated)", required:false, type:"array", delimiter:"|",
    synonyms:["dietary_tags","diet","tags","diet_tags"] },
  { key:"allergens",   label:"Allergens (| separated)", required:false, type:"array", delimiter:"|",
    synonyms:["allergens","allergen"] },
  { key:"certifications", label:"Certifications (| separated)", required:false, type:"array", delimiter:"|",
    synonyms:["certifications","certs"] },
  { key:"regulatory_codes", label:"Regulatory Codes (| separated)", required:false, type:"array", delimiter:"|",
    synonyms:["regulatory_codes","reg_codes","regs"] },
  { key:"ingredients", label:"Ingredients (| separated)", required:false, type:"array", delimiter:"|",
    synonyms:["ingredients","ingredient_list"] },
  { key:"source_url",  label:"Source URL", required:false, type:"text",
    synonyms:["source_url","url","link"] },
];

// ---------- CUSTOMERS (core) ----------
export const CUSTOMER_FIELDS_CORE: FieldDef[] = [
  { key:"external_id", label:"External ID", required:true,  type:"text",
    synonyms:["external_id","id","customer_id","user_id","uuid"] },
  { key:"full_name",   label:"Full Name",   required:false, type:"text",
    synonyms:["full_name","name","customer_name"] },
  { key:"email",       label:"Email",       required:false, type:"text",
    synonyms:["email","email_address"] },
  { key:"dob",         label:"Date of Birth", required:false, type:"date",
    synonyms:["dob","date_of_birth","birthdate","birth_date"] },
  { key:"age",         label:"Age",         required:false, type:"number",
    synonyms:["age"] },
  { key:"gender",      label:"Gender",      required:false, type:"enum",
    enumValues:["male","female","other","unknown"], synonyms:["gender","sex"] },
  { key:"phone",       label:"Phone",       required:false, type:"text",
    synonyms:["phone","phone_number","mobile"] },
  { key:"location",    label:"Location (JSON)", required:false, type:"json",
    synonyms:["location","address","geo","location_json"] },
  { key:"custom_tags", label:"Custom Tags (| separated)", required:false, type:"array", delimiter:"|",
    synonyms:["custom_tags","tags"] },
];

// ---------- HEALTH PROFILE (attached to customer) ----------
export const HEALTH_FIELDS: FieldDef[] = [
  { key:"height_cm",      label:"Height (cm)",   required:false, type:"number",
    synonyms:["height_cm","height"] },
  { key:"weight_kg",      label:"Weight (kg)",   required:false, type:"number",
    synonyms:["weight_kg","weight"] },
  { key:"age",            label:"Age (override)",required:false, type:"number",
    synonyms:["age_health","age"] },
  { key:"gender",         label:"Gender (override)", required:false, type:"enum",
    enumValues:["male","female","other","unknown"], synonyms:["gender_health","gender"] },
  { key:"activity_level", label:"Activity Level", required:false, type:"enum",
    enumValues:["sedentary","light","moderate","active","athlete"], synonyms:["activity_level","activity"] },
  { key:"conditions",     label:"Conditions (| separated)", required:false, type:"array", delimiter:"|",
    synonyms:["conditions","health_conditions","medical_conditions"] },
  { key:"diet_goals",     label:"Diet Goals (| separated)", required:false, type:"array", delimiter:"|",
    synonyms:["diet_goals","goals"] },
  { key:"macro_targets",  label:"Macro Targets (JSON)", required:false, type:"json",
    synonyms:["macro_targets","macros"] },
  { key:"avoid_allergens",label:"Avoid Allergens (| separated)", required:false, type:"array", delimiter:"|",
    synonyms:["avoid_allergens","allergens_avoid"] },
];

export const FIELD_DEFS_BY_MODE: Record<"products"|"customers", FieldDef[]> = {
  products: PRODUCT_FIELDS,
  customers: [...CUSTOMER_FIELDS_CORE, ...HEALTH_FIELDS],
};

// Auto-map: choose best header for each field using synonyms
export function guessMappingFromHeaders(
  headers: string[],
  defs: FieldDef[]
): Record<string, MappingItem> {
  const lower = headers.map(h => h.toLowerCase());
  const map: Record<string, MappingItem> = {};
  for (const def of defs) {
    const idx = lower.findIndex(h => def.synonyms.includes(h));
    if (idx >= 0) {
      map[def.key] = {
        column: headers[idx],
        type: def.type,
        optional: !def.required,
        delimiter: def.type === "array" ? (def.delimiter || "|") : undefined,
      };
    } else if (!def.required) {
      // still record optional defaults (no column selected yet)
      map[def.key] = {
        type: def.type,
        optional: true,
        delimiter: def.type === "array" ? (def.delimiter || "|") : undefined,
      };
    }
  }
  return map;
}
