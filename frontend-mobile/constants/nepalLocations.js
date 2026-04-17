const OFFICIAL_NEPAL_DISTRICTS = [
  "Achham",
  "Arghakhanchi",
  "Baglung",
  "Baitadi",
  "Bajhang",
  "Bajura",
  "Banke",
  "Bara",
  "Bardiya",
  "Bhaktapur",
  "Bhojpur",
  "Chitwan",
  "Dadeldhura",
  "Dailekh",
  "Dang",
  "Darchula",
  "Dhading",
  "Dhankuta",
  "Dhanusha",
  "Dolakha",
  "Dolpa",
  "Doti",
  "Eastern Rukum",
  "Gorkha",
  "Gulmi",
  "Humla",
  "Ilam",
  "Jajarkot",
  "Jhapa",
  "Jumla",
  "Kailali",
  "Kalikot",
  "Kanchanpur",
  "Kapilvastu",
  "Kaski",
  "Kathmandu",
  "Kavrepalanchok",
  "Khotang",
  "Lalitpur",
  "Lamjung",
  "Mahottari",
  "Makwanpur",
  "Manang",
  "Morang",
  "Mugu",
  "Mustang",
  "Myagdi",
  "Nawalpur",
  "Nuwakot",
  "Okhaldhunga",
  "Palpa",
  "Panchthar",
  "Parasi",
  "Parbat",
  "Parsa",
  "Pyuthan",
  "Ramechhap",
  "Rasuwa",
  "Rautahat",
  "Rolpa",
  "Rupandehi",
  "Salyan",
  "Sankhuwasabha",
  "Saptari",
  "Sarlahi",
  "Sindhuli",
  "Sindhupalchok",
  "Siraha",
  "Solukhumbu",
  "Sunsari",
  "Surkhet",
  "Syangja",
  "Tanahun",
  "Taplejung",
  "Tehrathum",
  "Udayapur",
  "Western Rukum",
];

const PRIORITY_LOCATION_OPTIONS = [
  { label: "Kathmandu", value: "Kathmandu" },
  { label: "Pokhara", value: "Kaski" },
  { label: "Lalitpur", value: "Lalitpur" },
  { label: "Bhaktapur", value: "Bhaktapur" },
  { label: "Chitwan", value: "Chitwan" },
  { label: "Dharan", value: "Sunsari" },
  { label: "Rupandehi", value: "Rupandehi" },
];

const PRIORITY_VALUES = new Set(PRIORITY_LOCATION_OPTIONS.map((option) => option.value));

const ALIAS_TO_VALUE = {
  lalitput: "Lalitpur",
  lalitpur: "Lalitpur",
  rupanedhi: "Rupandehi",
  rupandehi: "Rupandehi",
  pokhara: "Kaski",
  dharan: "Sunsari",
};

export const NEPAL_LOCATION_OPTIONS = [
  ...PRIORITY_LOCATION_OPTIONS,
  ...OFFICIAL_NEPAL_DISTRICTS.filter((district) => !PRIORITY_VALUES.has(district)).map(
    (district) => ({
      label: district,
      value: district,
    })
  ),
];

export function normalizeLocationValue(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return "";
  }

  const aliasValue = ALIAS_TO_VALUE[cleaned.toLowerCase()];
  if (aliasValue) {
    return aliasValue;
  }

  const directMatch = OFFICIAL_NEPAL_DISTRICTS.find(
    (district) => district.toLowerCase() === cleaned.toLowerCase()
  );

  return directMatch || cleaned;
}

export function getLocationOptionLabel(value) {
  if (!value) {
    return "";
  }

  const normalizedValue = normalizeLocationValue(value);
  return (
    NEPAL_LOCATION_OPTIONS.find((option) => option.value === normalizedValue)?.label ||
    normalizedValue
  );
}

export { OFFICIAL_NEPAL_DISTRICTS };
