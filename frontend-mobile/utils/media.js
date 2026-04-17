import { BASE_URL } from "../constants/config";

export const resolveMediaUrl = (value = "") => {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue) {
        return "";
    }

    if (
        normalizedValue.startsWith("http://") ||
        normalizedValue.startsWith("https://") ||
        normalizedValue.startsWith("file://") ||
        normalizedValue.startsWith("blob:") ||
        normalizedValue.startsWith("data:")
    ) {
        return normalizedValue;
    }

    const normalizedPath = normalizedValue.startsWith("/")
        ? normalizedValue
        : `/${normalizedValue}`;

    return `${BASE_URL}${normalizedPath}`;
};
