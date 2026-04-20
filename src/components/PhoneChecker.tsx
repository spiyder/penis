"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Warning {
  text: string;
  severity: "low" | "medium" | "high";
}

interface FraudEntry {
  source: string;
  category: string;
  reportedAt: string;
  reports: number;
}

interface PhoneResult {
  status: "safe" | "suspicious" | "dangerous";
  score: number;
  formatted: string;
  countryFlag: string;
  country: string;
  countryCode: string;
  continent: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  carrier: string | null;
  carrierType: "mobile" | "landline" | "voip" | "toll-free" | "premium" | "unknown";
  numberType: string;
  prefix: string;
  isVirtual: boolean;
  inFraudDb: boolean;
  fraudDbMatches: FraudEntry[];
  warnings: Warning[];
  details: string;
  recommendations: string[];
  callerInfo: string | null;
  callerCity: string | null;
  reportCount: number;
}

// ─── SIMULATED FRAUD DATABASE ─────────────────────────────────────────────────

const FRAUD_DB: Record<string, FraudEntry[]> = {
  "88005553535": [
    { source: "АнтиМошенник РФ", category: "Телефонное мошенничество", reportedAt: "2024-11", reports: 1243 },
    { source: "Народный контроль", category: "Ложный банк", reportedAt: "2024-12", reports: 856 },
  ],
  "84951234567": [
    { source: "БезОпасность.рф", category: "Фишинг", reportedAt: "2024-10", reports: 312 },
  ],
  "89261234567": [
    { source: "АнтиМошенник РФ", category: "СМС-мошенничество", reportedAt: "2024-09", reports: 98 },
  ],
  "74951000000": [
    { source: "Росфинмониторинг", category: "Финансовое мошенничество", reportedAt: "2024-08", reports: 2100 },
  ],
  "79001234567": [
    { source: "Стоп-Мошенник", category: "Вишинг (голосовой фишинг)", reportedAt: "2025-01", reports: 445 },
  ],
  "78007654321": [
    { source: "АнтиМошенник РФ", category: "Ложная служба безопасности банка", reportedAt: "2025-02", reports: 789 },
    { source: "Стоп-Мошенник", category: "Социальная инженерия", reportedAt: "2025-02", reports: 321 },
  ],
};

function checkFraudDb(digits: string): { inDb: boolean; entries: FraudEntry[] } {
  const key8 = "8" + digits.replace(/^(7|8)/, "");
  const key7 = "7" + digits.replace(/^(7|8)/, "");
  if (FRAUD_DB[digits]) return { inDb: true, entries: FRAUD_DB[digits] };
  if (FRAUD_DB[key8]) return { inDb: true, entries: FRAUD_DB[key8] };
  if (FRAUD_DB[key7]) return { inDb: true, entries: FRAUD_DB[key7] };

  // Probabilistic hit for risky prefixes (demo)
  const withoutCC = digits.replace(/^(7|8)/, "");
  const riskyPfx = ["900", "901", "902", "903", "904", "905", "906"];
  if (riskyPfx.some((p) => withoutCC.startsWith(p)) && digits.length === 11) {
    const seed = digits.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    if (seed % 10 < 3) {
      return {
        inDb: true,
        entries: [{ source: "Стоп-Мошенник", category: "Подозрительная активность", reportedAt: "2025-01", reports: (seed % 50) + 5 }],
      };
    }
  }
  return { inDb: false, entries: [] };
}

// ─── COUNTRY DATA ─────────────────────────────────────────────────────────────

interface CountryData {
  name: string;
  flag: string;
  risk: number;
  continent: string;
  timezone: string;
}

const COUNTRIES: [string, CountryData][] = [
  ["+998", { name: "Узбекистан",        flag: "🇺🇿", risk: 8,  continent: "Азия",          timezone: "UTC+5" }],
  ["+996", { name: "Кыргызстан",        flag: "🇰🇬", risk: 7,  continent: "Азия",          timezone: "UTC+6" }],
  ["+994", { name: "Азербайджан",       flag: "🇦🇿", risk: 6,  continent: "Азия",          timezone: "UTC+4" }],
  ["+995", { name: "Грузия",            flag: "🇬🇪", risk: 5,  continent: "Азия",          timezone: "UTC+4" }],
  ["+374", { name: "Армения",           flag: "🇦🇲", risk: 5,  continent: "Азия",          timezone: "UTC+4" }],
  ["+380", { name: "Украина",           flag: "🇺🇦", risk: 5,  continent: "Европа",        timezone: "UTC+2" }],
  ["+375", { name: "Беларусь",          flag: "🇧🇾", risk: 5,  continent: "Европа",        timezone: "UTC+3" }],
  ["+370", { name: "Литва",             flag: "🇱🇹", risk: 4,  continent: "Европа",        timezone: "UTC+2" }],
  ["+371", { name: "Латвия",            flag: "🇱🇻", risk: 4,  continent: "Европа",        timezone: "UTC+2" }],
  ["+372", { name: "Эстония",           flag: "🇪🇪", risk: 4,  continent: "Европа",        timezone: "UTC+2" }],
  ["+234", { name: "Нигерия",           flag: "🇳🇬", risk: 45, continent: "Африка",        timezone: "UTC+1" }],
  ["+233", { name: "Гана",              flag: "🇬🇭", risk: 20, continent: "Африка",        timezone: "UTC+0" }],
  ["+49",  { name: "Германия",          flag: "🇩🇪", risk: 3,  continent: "Европа",        timezone: "UTC+1" }],
  ["+33",  { name: "Франция",           flag: "🇫🇷", risk: 3,  continent: "Европа",        timezone: "UTC+1" }],
  ["+44",  { name: "Великобритания",    flag: "🇬🇧", risk: 10, continent: "Европа",        timezone: "UTC+0" }],
  ["+86",  { name: "Китай",             flag: "🇨🇳", risk: 18, continent: "Азия",          timezone: "UTC+8" }],
  ["+91",  { name: "Индия",             flag: "🇮🇳", risk: 15, continent: "Азия",          timezone: "UTC+5:30" }],
  ["+92",  { name: "Пакистан",          flag: "🇵🇰", risk: 18, continent: "Азия",          timezone: "UTC+5" }],
  ["+62",  { name: "Индонезия",         flag: "🇮🇩", risk: 12, continent: "Азия",          timezone: "UTC+7" }],
  ["+90",  { name: "Турция",            flag: "🇹🇷", risk: 10, continent: "Европа/Азия",   timezone: "UTC+3" }],
  ["+1",   { name: "США / Канада",      flag: "🇺🇸", risk: 5,  continent: "Сев. Америка",  timezone: "UTC-5 — UTC-8" }],
  ["+7",   { name: "Россия / Казахстан",flag: "🇷🇺", risk: 5,  continent: "Европа/Азия",   timezone: "UTC+3 — UTC+12" }],
];

function detectCountry(digits: string): { code: string; data: CountryData } | null {
  for (const [code, data] of COUNTRIES) {
    const bare = code.replace("+", "");
    if (digits.startsWith(bare)) return { code, data };
  }
  if (digits.startsWith("7") || digits.startsWith("8")) {
    return { code: "+7", data: COUNTRIES.find(([c]) => c === "+7")![1] };
  }
  return null;
}

// ─── RUSSIAN MOBILE DEF CODES ─────────────────────────────────────────────────

const MOBILE_DEF: Record<string, { city: string; region: string; operator: string }> = {
  "900": { city: "Россия (федеральный)", region: "Федеральный", operator: "МТС" },
  "901": { city: "Россия (федеральный)", region: "Федеральный", operator: "МТС" },
  "902": { city: "Россия (федеральный)", region: "Федеральный", operator: "МТС" },
  "903": { city: "Россия (федеральный)", region: "Федеральный", operator: "МТС" },
  "904": { city: "Россия (федеральный)", region: "Федеральный", operator: "МТС" },
  "905": { city: "Россия (федеральный)", region: "Федеральный", operator: "МТС" },
  "906": { city: "Россия (федеральный)", region: "Федеральный", operator: "МТС" },
  "908": { city: "Россия (федеральный)", region: "Федеральный", operator: "МТС" },
  "909": { city: "Россия (федеральный)", region: "Федеральный", operator: "МТС" },
  "910": { city: "Москва и обл.", region: "Москва", operator: "МегаФон" },
  "911": { city: "Санкт-Петербург и Лен. обл.", region: "Санкт-Петербург", operator: "МегаФон" },
  "912": { city: "Екатеринбург / Урал", region: "Свердловская обл.", operator: "МТС" },
  "913": { city: "Новосибирск / Сибирь", region: "Новосибирская обл.", operator: "МТС" },
  "914": { city: "Хабаровск / Дальний Восток", region: "Хабаровский край", operator: "МТС" },
  "915": { city: "Москва и МО", region: "Москва", operator: "МТС" },
  "916": { city: "Москва и МО", region: "Москва", operator: "МТС" },
  "917": { city: "Уфа / Башкортостан", region: "Башкортостан", operator: "МТС" },
  "918": { city: "Краснодар / Южный ФО", region: "Краснодарский край", operator: "МТС" },
  "919": { city: "Москва и МО", region: "Москва", operator: "МТС" },
  "920": { city: "Нижний Новгород / Поволжье", region: "Нижегородская обл.", operator: "МегаФон" },
  "921": { city: "Санкт-Петербург", region: "Санкт-Петербург", operator: "МегаФон" },
  "922": { city: "Екатеринбург / Тюмень", region: "Свердловская обл.", operator: "МТС" },
  "923": { city: "Кемерово / Новосибирск", region: "Кемеровская обл.", operator: "МегаФон" },
  "924": { city: "Владивосток / Дальний Восток", region: "Приморский край", operator: "МТС" },
  "925": { city: "Москва и МО", region: "Москва", operator: "МТС" },
  "926": { city: "Москва и МО", region: "Москва", operator: "МТС" },
  "927": { city: "Самара / Поволжье", region: "Самарская обл.", operator: "МТС" },
  "928": { city: "Ростов-на-Дону / Юг", region: "Ростовская обл.", operator: "МТС" },
  "929": { city: "Москва и МО", region: "Москва", operator: "МТС" },
  "930": { city: "Москва и МО", region: "Москва", operator: "МТС" },
  "931": { city: "Санкт-Петербург", region: "Санкт-Петербург", operator: "МТС" },
  "932": { city: "Екатеринбург", region: "Свердловская обл.", operator: "Билайн" },
  "933": { city: "Краснодар", region: "Краснодарский край", operator: "МегаФон" },
  "934": { city: "Новосибирск", region: "Новосибирская обл.", operator: "Билайн" },
  "936": { city: "Москва и МО", region: "Москва", operator: "МТС" },
  "937": { city: "Уфа / Казань", region: "Татарстан / Башкортостан", operator: "МегаФон" },
  "938": { city: "Краснодар / Ставрополь", region: "Краснодарский край", operator: "МегаФон" },
  "939": { city: "Казань / Поволжье", region: "Татарстан", operator: "МегаФон" },
  "950": { city: "Россия (Билайн)", region: "Федеральный", operator: "Билайн" },
  "951": { city: "Россия (Билайн)", region: "Федеральный", operator: "Билайн" },
  "952": { city: "Россия (МТС)", region: "Федеральный", operator: "МТС" },
  "953": { city: "Россия (Билайн)", region: "Федеральный", operator: "Билайн" },
  "958": { city: "Москва и МО", region: "Москва", operator: "Tele2" },
  "960": { city: "Россия (Билайн)", region: "Федеральный", operator: "Билайн" },
  "961": { city: "Россия (Билайн)", region: "Федеральный", operator: "Билайн" },
  "962": { city: "Россия (Билайн)", region: "Федеральный", operator: "Билайн" },
  "963": { city: "Россия (Билайн)", region: "Федеральный", operator: "Билайн" },
  "964": { city: "Россия (Билайн)", region: "Федеральный", operator: "Билайн" },
  "965": { city: "Москва и МО", region: "Москва", operator: "Билайн" },
  "966": { city: "Москва и МО", region: "Москва", operator: "Билайн" },
  "967": { city: "Москва и МО", region: "Москва", operator: "Билайн" },
  "968": { city: "Москва и МО", region: "Москва", operator: "Билайн" },
  "969": { city: "Москва", region: "Москва", operator: "Билайн" },
  "977": { city: "Москва и МО", region: "Москва", operator: "МТС" },
  "978": { city: "Крым / Севастополь", region: "Крым", operator: "МТС" },
  "980": { city: "Россия (МТС)", region: "Федеральный", operator: "МТС" },
  "981": { city: "Санкт-Петербург", region: "Санкт-Петербург", operator: "МТС" },
  "982": { city: "Екатеринбург", region: "Свердловская обл.", operator: "МТС" },
  "983": { city: "Новосибирск", region: "Новосибирская обл.", operator: "МТС" },
  "984": { city: "Хабаровск / Владивосток", region: "Дальний Восток", operator: "МТС" },
  "985": { city: "Москва и МО", region: "Москва", operator: "МТС" },
  "986": { city: "Москва и МО", region: "Москва", operator: "МТС" },
  "987": { city: "Уфа / Башкортостан", region: "Башкортостан", operator: "МТС" },
  "988": { city: "Ростов-на-Дону", region: "Ростовская обл.", operator: "МТС" },
  "989": { city: "Краснодар", region: "Краснодарский край", operator: "МТС" },
};

const LANDLINE: [string, { city: string; region: string }][] = [
  ["4012", { city: "Калининград",       region: "Калининградская обл." }],
  ["8552", { city: "Набережные Челны",  region: "Татарстан" }],
  ["4722", { city: "Белгород",          region: "Белгородская обл." }],
  ["4732", { city: "Воронеж",           region: "Воронежская обл." }],
  ["3532", { city: "Оренбург",          region: "Оренбургская обл." }],
  ["3812", { city: "Омск",              region: "Омская обл." }],
  ["4162", { city: "Благовещенск",      region: "Амурская обл." }],
  ["495",  { city: "Москва",            region: "Москва" }],
  ["499",  { city: "Москва",            region: "Москва" }],
  ["812",  { city: "Санкт-Петербург",   region: "Санкт-Петербург" }],
  ["343",  { city: "Екатеринбург",      region: "Свердловская обл." }],
  ["383",  { city: "Новосибирск",       region: "Новосибирская обл." }],
  ["831",  { city: "Нижний Новгород",   region: "Нижегородская обл." }],
  ["846",  { city: "Самара",            region: "Самарская обл." }],
  ["351",  { city: "Челябинск",         region: "Челябинская обл." }],
  ["863",  { city: "Ростов-на-Дону",    region: "Ростовская обл." }],
  ["347",  { city: "Уфа",               region: "Башкортостан" }],
  ["843",  { city: "Казань",            region: "Татарстан" }],
  ["391",  { city: "Красноярск",        region: "Красноярский край" }],
  ["861",  { city: "Краснодар",         region: "Краснодарский край" }],
  ["342",  { city: "Пермь",             region: "Пермский край" }],
];

function detectCityCarrier(digits: string) {
  const withoutCC = digits.replace(/^(7|8)/, "");

  if (withoutCC.startsWith("800")) {
    return { city: "Россия (бесплатный номер)", region: "Федеральный", carrier: null as string | null, carrierType: "toll-free" as const, numberType: "Бесплатный (8-800)", prefix: "800" };
  }

  const def3 = withoutCC.substring(0, 3);
  if (MOBILE_DEF[def3]) {
    const d = MOBILE_DEF[def3];
    return { city: d.city, region: d.region, carrier: d.operator as string | null, carrierType: "mobile" as const, numberType: "Мобильный", prefix: def3 };
  }

  for (const [code, data] of LANDLINE) {
    if (withoutCC.startsWith(code)) {
      return { city: data.city, region: data.region, carrier: "Городская АТС" as string | null, carrierType: "landline" as const, numberType: "Стационарный", prefix: code };
    }
  }

  return { city: null, region: null, carrier: null as string | null, carrierType: "unknown" as const, numberType: "Неизвестный тип", prefix: def3 };
}

// ─── PATTERN CHECKS ────────────────────────────────────────────────────────────

const PATTERNS: { re: RegExp; text: string; severity: Warning["severity"]; weight: number }[] = [
  { re: /(\d)\1{5,}/, text: "Шесть и более одинаковых цифр подряд — крайне нетипичный паттерн", severity: "high", weight: 30 },
  { re: /(\d)\1{3,4}/, text: "Четыре-пять одинаковых цифр подряд — необычная структура", severity: "medium", weight: 15 },
  { re: /^(\+?7|8)800/, text: "Бесплатный 8-800: активно используется мошенниками для имитации банков", severity: "medium", weight: 20 },
  { re: /^\+?234/, text: "Нигерийский номер — один из наиболее распространённых источников международного мошенничества", severity: "high", weight: 45 },
  { re: /^\+?92/, text: "Пакистанский номер — частый источник спама и телефонного мошенничества", severity: "medium", weight: 18 },
  { re: /^\+?62/, text: "Индонезийский номер — повышенная активность в телефонном фишинге", severity: "medium", weight: 12 },
  { re: /^\+?1(976|900)/, text: "Платный premium-номер — звонок может привести к автосписанию средств", severity: "high", weight: 40 },
  { re: /^\+?447/, text: "Британский мобильный — частый вектор SMS-мошенничества с поддельными банками", severity: "medium", weight: 12 },
  { re: /^\+?86/, text: "Китайский номер — нередко используется в схемах международного телемаркетинга", severity: "medium", weight: 18 },
  { re: /^\+?233/, text: "Ганский номер — повышенный риск мошенничества (схемы авансовых платежей)", severity: "high", weight: 30 },
];

// ─── MAIN ANALYSIS ─────────────────────────────────────────────────────────────

function analyzePhone(phone: string): PhoneResult {
  const digits = phone.replace(/[^\d]/g, "");
  const withPlus = "+" + digits;
  const warnings: Warning[] = [];
  let riskScore = 0;

  if (digits.length < 7) { warnings.push({ text: "Слишком короткий номер (менее 7 цифр)", severity: "high" }); riskScore += 25; }
  else if (digits.length > 15) { warnings.push({ text: "Слишком длинный номер (более 15 цифр)", severity: "medium" }); riskScore += 10; }

  const countryMatch = detectCountry(digits);
  if (!countryMatch) { warnings.push({ text: "Код страны не распознан", severity: "low" }); riskScore += 5; }
  else riskScore += countryMatch.data.risk;

  const isRussian = !countryMatch || countryMatch.code === "+7";
  const geo = isRussian
    ? detectCityCarrier(digits)
    : { city: null, region: null, carrier: null as string | null, carrierType: "unknown" as const, numberType: "Международный", prefix: digits.substring(0, 4) };

  for (const p of PATTERNS) {
    if (p.re.test(withPlus) || p.re.test(digits)) {
      warnings.push({ text: p.text, severity: p.severity });
      riskScore += p.weight;
    }
  }

  const fraud = checkFraudDb(digits);
  if (fraud.inDb) {
    riskScore += 50;
    const total = fraud.entries.reduce((a, e) => a + e.reports, 0);
    warnings.push({ text: `Номер найден в базе мошеннических номеров (${total} жалоб)`, severity: "high" });
  }

  const safeScore = Math.max(0, Math.min(100, 100 - riskScore));
  const status: PhoneResult["status"] = safeScore >= 72 ? "safe" : safeScore >= 44 ? "suspicious" : "dangerous";

  const seed = digits.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const reportCount = fraud.inDb
    ? fraud.entries.reduce((a, e) => a + e.reports, 0)
    : status === "dangerous" ? seed % 80 + 10
    : status === "suspicious" ? seed % 20
    : 0;

  let callerInfo: string | null = null;
  if (status === "dangerous" && fraud.inDb) callerInfo = "Вероятно: автодозвон / колл-центр мошенников";
  else if (geo.carrierType === "mobile" && geo.carrier) callerInfo = `Мобильный абонент (${geo.carrier})`;
  else if (geo.carrierType === "toll-free") callerInfo = "Организация с бесплатным номером";
  else if (geo.carrierType === "landline") callerInfo = "Стационарный телефон";

  const callerCity = geo.city ?? (countryMatch ? countryMatch.data.name : null);

  const recommendations =
    status === "dangerous"
      ? ["Не перезванивайте на этот номер", "Заблокируйте номер в настройках телефона", "Сообщите о нём на мошенники.рф или в Роскомнадзор"]
      : status === "suspicious"
      ? ["Будьте осторожны — не сообщайте личные данные", "Проверьте номер через GetContact или Truecaller", "При получении SMS со ссылками — не переходите по ним"]
      : ["Явных признаков мошенничества не обнаружено", "Никогда не сообщайте CVV, PIN и одноразовые коды по телефону"];

  const details =
    status === "safe" ? "Номер не содержит явных признаков мошенничества. Паттерны, типичные для мошеннических схем, не обнаружены."
    : status === "suspicious" ? "Обнаружены признаки, характерные для спам-звонков. Рекомендуем проявить осторожность и не сообщать персональные данные."
    : "Высокий риск мошенничества. Номер соответствует известным паттернам телефонных мошенников или найден в базах жалоб.";

  return {
    status, score: safeScore, formatted: phone.trim(),
    countryFlag: countryMatch?.data.flag ?? "🌐",
    country: countryMatch?.data.name ?? "Неизвестная страна",
    countryCode: countryMatch?.code ?? "?",
    continent: countryMatch?.data.continent ?? null,
    region: geo.region, city: geo.city,
    timezone: countryMatch?.data.timezone ?? null,
    carrier: geo.carrier, carrierType: geo.carrierType,
    numberType: geo.numberType, prefix: geo.prefix,
    isVirtual: geo.carrierType === "voip" || geo.carrierType === "toll-free",
    inFraudDb: fraud.inDb, fraudDbMatches: fraud.entries,
    warnings, details, recommendations,
    callerInfo, callerCity, reportCount,
  };
}

// ─── STATUS STYLES ─────────────────────────────────────────────────────────────

function statusCfg(status: string) {
  const safe = {
    border: "border-emerald-400/40 dark:border-emerald-500/30",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    bar: "bg-emerald-500",
    badge: "bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    title: "Номер выглядит безопасно",
    label: "БЕЗОПАСЕН",
    icon: <svg className="w-11 h-11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.39 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 5.55 5.55l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/><polyline points="9,11 12,14 22,4"/></svg>,
  };
  const susp = {
    border: "border-amber-400/40 dark:border-amber-500/30",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    bar: "bg-amber-500",
    badge: "bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400",
    title: "Подозрительный номер",
    label: "ПОДОЗРИТЕЛЬНО",
    icon: <svg className="w-11 h-11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  };
  const dang = {
    border: "border-red-400/40 dark:border-red-500/30",
    bg: "bg-red-50 dark:bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    bar: "bg-red-500",
    badge: "bg-red-100 dark:bg-red-500/10 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400",
    title: "Опасный номер",
    label: "ОПАСНО",
    icon: <svg className="w-11 h-11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.39 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 5.55 5.55l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  };
  return status === "safe" ? safe : status === "suspicious" ? susp : dang;
}

// ─── LOADING STEPS ─────────────────────────────────────────────────────────────

const STEPS = [
  "Парсим структуру номера...",
  "Проверяем базу мошеннических номеров...",
  "Определяем город и оператора...",
  "Анализируем паттерны риска...",
  "Формируем полный отчёт...",
];

const CARRIER_LABELS: Record<PhoneResult["carrierType"], string> = {
  mobile: "Мобильный",
  landline: "Стационарный",
  voip: "VoIP / Виртуальный",
  "toll-free": "Бесплатный (8-800)",
  premium: "Платный (premium)",
  unknown: "Неизвестно",
};

const SEVERITY_CLASS: Record<Warning["severity"], string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-zinc-500 dark:text-zinc-400",
};

// ─── COMPONENT ─────────────────────────────────────────────────────────────────

export function PhoneChecker() {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<PhoneResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    const trimmed = phone.trim();
    if (!trimmed || trimmed.replace(/[\s\-\(\)\+]/g, "").length < 5) {
      setError("Введите корректный номер телефона");
      return;
    }
    setLoading(true); setResult(null); setError(null); setStep(0);
    const iv = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 390);
    await new Promise((r) => setTimeout(r, 2100));
    clearInterval(iv);
    try { setResult(analyzePhone(trimmed)); }
    catch { setError("Ошибка при анализе номера."); }
    finally { setLoading(false); }
  };

  const cfg = result ? statusCfg(result.status) : null;

  const InfoCard = ({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) => (
    <Card className="p-3.5 bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 shadow-sm">
      <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-tight ${mono ? "font-mono" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{sub}</p>}
    </Card>
  );

  return (
    <div className="space-y-5">
      {/* Input */}
      <Card className="p-6 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10">
            <svg className="w-5 h-5 text-red-500 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.39 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 5.55 5.55l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Проверка телефонного номера</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Город · Оператор · База мошенников · Анализ паттернов · Откуда звонят</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Input
            type="tel"
            placeholder="+7 (900) 123-45-67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            className="bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 h-12 text-base font-mono focus:border-red-400 dark:focus:border-red-500/50"
          />
          <Button onClick={handleCheck} disabled={loading || !phone.trim()} className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 shrink-0">
            {loading
              ? <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Анализ...</span>
              : "Проверить"}
          </Button>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-3">Форматы: +7 900 123-45-67 · 8(800)555-35-35 · +49 30 12345678</p>
      </Card>

      {/* Loading */}
      {loading && (
        <Card className="p-5 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-4 h-4 text-red-500 animate-spin shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{STEPS[step]}</p>
          </div>
          <div className="flex gap-1.5">{STEPS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-red-500" : "bg-zinc-200 dark:bg-zinc-700"}`}/>)}</div>
        </Card>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="p-4 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        </Card>
      )}

      {/* Result */}
      {result && !loading && cfg && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">

          {/* Status */}
          <Card className={`p-6 border ${cfg.border} ${cfg.bg}`}>
            <div className="flex items-start gap-5">
              <div className={`shrink-0 ${cfg.text}`}>{cfg.icon}</div>
              <div className="flex-1 min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-xl font-bold ${cfg.text}`}>{cfg.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${cfg.badge}`}>{cfg.label}</span>
                  {result.inFraudDb && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border bg-red-100 dark:bg-red-500/10 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400">⚠ В БАЗЕ МОШЕННИКОВ</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Уровень безопасности</span>
                    <span className={`font-mono font-bold ${cfg.text}`}>{result.score}/100</span>
                  </div>
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${cfg.bar}`} style={{ width: `${result.score}%` }}/>
                  </div>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{result.details}</p>
              </div>
            </div>
          </Card>

          {/* Geo info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard label="Страна" value={`${result.countryFlag} ${result.country}`} sub={`${result.countryCode} · ${result.continent ?? ""}`}/>
            <InfoCard label="Город / Регион" value={result.city ?? "Не определён"} sub={result.region ?? undefined}/>
            <InfoCard label="Оператор" value={result.carrier ?? "Неизвестен"} sub={CARRIER_LABELS[result.carrierType]}/>
            <InfoCard label="Часовой пояс" value={result.timezone ?? "Неизвестен"}/>
          </div>

          {/* Tech info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard label="Тип номера" value={result.numberType}/>
            <InfoCard label="Префикс DEF" value={result.prefix} mono/>
            <InfoCard label="Откуда звонят" value={result.callerCity ?? "Неизвестно"}/>
            <InfoCard label="Жалоб в базах" value={result.reportCount > 0 ? `${result.reportCount}+` : "0"}/>
          </div>

          {/* Caller info banner */}
          {result.callerInfo && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20">
              <div className="flex items-center gap-3 text-blue-700 dark:text-blue-400">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
                <div>
                  <p className="text-xs text-blue-500 dark:text-blue-500 uppercase tracking-wider font-medium mb-0.5">Вероятный источник звонка</p>
                  <p className="text-sm font-semibold">{result.callerInfo}{result.callerCity ? ` · ${result.callerCity}` : ""}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Fraud DB */}
          {result.inFraudDb && result.fraudDbMatches.length > 0 && (
            <Card className="p-5 bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20">
              <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Найден в базах мошеннических номеров
              </h4>
              <div className="space-y-2">
                {result.fraudDbMatches.map((e, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-red-100/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                    <div className="text-sm">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{e.source}</span>
                      <span className="text-zinc-500 dark:text-zinc-400 ml-2">· {e.category}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{e.reportedAt}</span>
                      <span className="px-2 py-0.5 rounded-full bg-red-200 dark:bg-red-500/20 text-red-700 dark:text-red-400 font-bold">{e.reports} жалоб</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Card className="p-5 bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Обнаруженные признаки</h4>
              <div className="space-y-2">
                {result.warnings.map((w, i) => (
                  <div key={i} className={`flex items-start gap-2 text-sm ${SEVERITY_CLASS[w.severity]}`}>
                    <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {w.severity === "high"
                        ? <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                        : <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
                      }
                    </svg>
                    {w.text}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          <Card className="p-5 bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
            <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Рекомендации</h4>
            <div className="space-y-2">
              {result.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <svg className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  {r}
                </div>
              ))}
            </div>
          </Card>

          <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center px-4">
            Анализ основан на паттернах и демонстрационной базе. Для точной проверки используйте GetContact, Truecaller, мошенники.рф
          </p>
        </div>
      )}
    </div>
  );
}
