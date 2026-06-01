// Curated list of countries with currency + dial code metadata for the
// first-time profile setup. Add more as needed.
export type Country = {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  flag: string;
  dial: string;
  currency: string; // ISO 4217
  currencyName: string;
  currencySymbol: string;
};

export const COUNTRIES: Country[] = [
  { name: "Kenya", code: "KE", flag: "🇰🇪", dial: "+254", currency: "KES", currencyName: "Kenyan Shilling", currencySymbol: "KSh" },
  { name: "Uganda", code: "UG", flag: "🇺🇬", dial: "+256", currency: "UGX", currencyName: "Ugandan Shilling", currencySymbol: "USh" },
  { name: "Tanzania", code: "TZ", flag: "🇹🇿", dial: "+255", currency: "TZS", currencyName: "Tanzanian Shilling", currencySymbol: "TSh" },
  { name: "Rwanda", code: "RW", flag: "🇷🇼", dial: "+250", currency: "RWF", currencyName: "Rwandan Franc", currencySymbol: "FRw" },
  { name: "Ethiopia", code: "ET", flag: "🇪🇹", dial: "+251", currency: "ETB", currencyName: "Ethiopian Birr", currencySymbol: "Br" },
  { name: "Nigeria", code: "NG", flag: "🇳🇬", dial: "+234", currency: "NGN", currencyName: "Nigerian Naira", currencySymbol: "₦" },
  { name: "Ghana", code: "GH", flag: "🇬🇭", dial: "+233", currency: "GHS", currencyName: "Ghanaian Cedi", currencySymbol: "₵" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦", dial: "+27", currency: "ZAR", currencyName: "South African Rand", currencySymbol: "R" },
  { name: "Egypt", code: "EG", flag: "🇪🇬", dial: "+20", currency: "EGP", currencyName: "Egyptian Pound", currencySymbol: "E£" },
  { name: "United States", code: "US", flag: "🇺🇸", dial: "+1", currency: "USD", currencyName: "US Dollar", currencySymbol: "$" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", dial: "+44", currency: "GBP", currencyName: "British Pound", currencySymbol: "£" },
  { name: "Canada", code: "CA", flag: "🇨🇦", dial: "+1", currency: "CAD", currencyName: "Canadian Dollar", currencySymbol: "C$" },
  { name: "Eurozone", code: "EU", flag: "🇪🇺", dial: "+", currency: "EUR", currencyName: "Euro", currencySymbol: "€" },
  { name: "India", code: "IN", flag: "🇮🇳", dial: "+91", currency: "INR", currencyName: "Indian Rupee", currencySymbol: "₹" },
  { name: "UAE", code: "AE", flag: "🇦🇪", dial: "+971", currency: "AED", currencyName: "UAE Dirham", currencySymbol: "د.إ" },
];

export const CURRENCIES = Array.from(
  new Map(COUNTRIES.map((c) => [c.currency, c])).values(),
);

export function findCountry(name: string | null | undefined) {
  if (!name) return COUNTRIES[0];
  return COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? COUNTRIES[0];
}

export function formatCurrencyExample(currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(1234.56);
  } catch {
    return `${currency} 1,234.56`;
  }
}
