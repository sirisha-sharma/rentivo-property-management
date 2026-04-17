// Utility helpers for nepaldistricts logic.

const OFFICIAL_DISTRICTS = [
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

const DISTRICT_LOOKUP = new Map(
    OFFICIAL_DISTRICTS.map((district) => [district.toLowerCase(), district])
);

const DISTRICT_ALIASES = new Map([
    ["lalitput", "Lalitpur"],
    ["rupanedhi", "Rupandehi"],
    ["pokhara", "Kaski"],
    ["dharan", "Sunsari"],
    ["kathmandu valley", "Kathmandu"],
]);

export function normalizeNepalDistrictInput(value) {
    if (!value || typeof value !== "string") {
        return null;
    }

    const cleaned = value.trim().replace(/\s+/g, " ").toLowerCase();
    if (!cleaned) {
        return null;
    }

    return DISTRICT_LOOKUP.get(cleaned) || DISTRICT_ALIASES.get(cleaned) || null;
}

export function inferNepalDistrictFromText(value) {
    if (!value || typeof value !== "string") {
        return null;
    }

    const haystack = value.trim().toLowerCase();
    if (!haystack) {
        return null;
    }

    for (const [alias, district] of DISTRICT_ALIASES.entries()) {
        if (haystack.includes(alias)) {
            return district;
        }
    }

    for (const district of OFFICIAL_DISTRICTS) {
        if (haystack.includes(district.toLowerCase())) {
            return district;
        }
    }

    return null;
}

export function resolveNepalDistrict({ district, address }) {
    return normalizeNepalDistrictInput(district) || inferNepalDistrictFromText(address);
}

export { OFFICIAL_DISTRICTS };
