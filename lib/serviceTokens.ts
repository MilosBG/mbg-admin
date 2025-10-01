const serviceTokenVarOrder = [
  "STOREFRONT_SERVICE_TOKEN",
  "ADMIN_SERVICE_TOKEN",
  "MBG_STOREFRONT_SERVICE_TOKEN",
];

function readEnv(varName: string) {
  const value = process.env[varName];
  return typeof value === "string" ? value.trim() : "";
}

export function getStorefrontServiceToken(): string {
  for (const key of serviceTokenVarOrder) {
    const value = readEnv(key);
    if (value) return value;
  }
  return "";
}

export function isValidStorefrontToken(candidate: string | null | undefined): boolean {
  const expected = getStorefrontServiceToken();
  if (!expected) return false;
  return !!candidate && candidate.trim() === expected;
}
