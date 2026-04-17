import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { resolveMediaUrl } from "./media";

const DOWNLOADS_DIRECTORY = `${FileSystem.documentDirectory}downloads/`;

const MIME_TYPES = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const sanitizeFileName = (value) =>
    String(value || "document")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "document";

const normalizeRelativeFilePath = (value = "") => {
    const normalized = String(value).replace(/\\/g, "/").replace(/^\.?\//, "");
    const uploadsIndex = normalized.indexOf("uploads/");

    return uploadsIndex >= 0 ? normalized.slice(uploadsIndex) : normalized;
};

const getFileExtension = (value = "") => {
    const match = String(value).toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : "pdf";
};

const getMimeType = (value = "") => MIME_TYPES[getFileExtension(value)] || "application/octet-stream";

const buildTimestamp = () => {
    const now = new Date();
    const pad = (datePart) => String(datePart).padStart(2, "0");

    return [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        "-",
        pad(now.getHours()),
        pad(now.getMinutes()),
    ].join("");
};

const buildDownloadFileName = (documentItem) => {
    const extension = getFileExtension(documentItem?.fileName || documentItem?.name);
    const baseName = sanitizeFileName(documentItem?.name || documentItem?.fileName || "document");

    return `${baseName}-${buildTimestamp()}.${extension}`;
};

const resolveDocumentUrl = (documentItem) => {
    if (documentItem?.downloadUrl) {
        return documentItem.downloadUrl;
    }

    const relativePath = normalizeRelativeFilePath(documentItem?.filePath);

    if (!relativePath) {
        const fallbackUrl = resolveMediaUrl(documentItem?.filePath);

        if (fallbackUrl) {
            return fallbackUrl;
        }

        throw new Error("This document does not have a download URL.");
    }

    return resolveMediaUrl(relativePath);
};

const ensureDownloadsDirectoryAsync = async () => {
    const directoryInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIRECTORY);

    if (!directoryInfo.exists) {
        await FileSystem.makeDirectoryAsync(DOWNLOADS_DIRECTORY, { intermediates: true });
    }
};

const triggerWebDownload = (url, fileName) => {
    const browserDocument = globalThis?.document;

    if (!browserDocument) {
        throw new Error("Document downloads are not available in this environment.");
    }

    const anchor = browserDocument.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    anchor.target = "_blank";
    browserDocument.body.appendChild(anchor);
    anchor.click();
    browserDocument.body.removeChild(anchor);
};

const saveToAndroidDirectoryAsync = async (localUri, fileName, mimeType) => {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissions.granted) {
        return null;
    }

    const fileBaseName = fileName.replace(/\.[^.]+$/, "");
    const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileBaseName,
        mimeType
    );
    const fileBase64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    await FileSystem.StorageAccessFramework.writeAsStringAsync(targetUri, fileBase64, {
        encoding: FileSystem.EncodingType.Base64,
    });

    return targetUri;
};

export const downloadDocumentAsync = async (documentItem) => {
    const remoteUrl = resolveDocumentUrl(documentItem);
    const fileName = buildDownloadFileName(documentItem);
    const mimeType = getMimeType(documentItem?.fileName || fileName);

    if (Platform.OS === "web") {
        triggerWebDownload(remoteUrl, fileName);
        return {
            fileName,
            downloaded: true,
            openedBrowserDownload: true,
        };
    }

    await ensureDownloadsDirectoryAsync();

    const localUri = `${DOWNLOADS_DIRECTORY}${fileName}`;
    const localFileInfo = await FileSystem.getInfoAsync(localUri);

    if (localFileInfo.exists) {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
    }

    const downloadResult = await FileSystem.downloadAsync(remoteUrl, localUri);

    if (Platform.OS === "android") {
        const savedUri = await saveToAndroidDirectoryAsync(downloadResult.uri, fileName, mimeType);

        if (savedUri) {
            return {
                fileName,
                localUri: downloadResult.uri,
                savedUri,
                savedToDeviceStorage: true,
            };
        }
    }

    const sharingAvailable = await Sharing.isAvailableAsync();

    if (sharingAvailable) {
        await Sharing.shareAsync(downloadResult.uri, {
            dialogTitle: "Save or share downloaded document",
            mimeType,
            UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : undefined,
        });
    }

    return {
        fileName,
        localUri: downloadResult.uri,
        savedToDeviceStorage: false,
        shared: sharingAvailable,
    };
};
