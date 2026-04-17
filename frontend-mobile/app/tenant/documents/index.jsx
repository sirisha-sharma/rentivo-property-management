import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { DocumentContext } from "../../../context/DocumentContext";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { FilterChips } from "../../../components/FilterChips";
import { EmptyState } from "../../../components/EmptyState";
import { COLORS } from "../../../constants/theme";
import { downloadDocumentAsync } from "../../../utils/documentDownload";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "Lease Agreement", label: "Lease" },
    { key: "ID Proof", label: "ID Proof" },
    { key: "Other", label: "Other" },
];

export default function TenantDocumentList() {
    const { documents, fetchDocuments, loading } = useContext(DocumentContext);
    const [filter, setFilter] = useState("all");
    const [activeDocumentId, setActiveDocumentId] = useState(null);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const filteredDocs = documents.filter((doc) => {
        if (filter === "all") return true;
        return doc.type === filter;
    });

    const getTypeColor = (type) => {
        switch (type) {
            case "Lease Agreement":
                return { bg: COLORS.primarySoft, text: COLORS.primary };
            case "ID Proof":
                return { bg: COLORS.warningSoft, text: COLORS.warning };
            default:
                return { bg: COLORS.muted, text: COLORS.mutedForeground };
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString();
    };

    const handleDownloadDocument = async (documentItem) => {
        try {
            setActiveDocumentId(documentItem._id);
            const result = await downloadDocumentAsync(documentItem);

            if (result.savedToDeviceStorage) {
                Alert.alert("Download Complete", `${result.fileName} was saved to your device storage.`);
                return;
            }

            if (!result.shared && !result.openedBrowserDownload) {
                Alert.alert("Download Complete", `${result.fileName} was downloaded successfully.`);
            }
        } catch (_error) {
            Alert.alert("Download Failed", "We couldn't download this document right now.");
        } finally {
            setActiveDocumentId(null);
        }
    };

    const renderItem = ({ item }) => {
        const typeColor = getTypeColor(item.type);
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <View style={styles.subtextContainer}>
                            <Ionicons name="home-outline" size={12} color={COLORS.mutedForeground} />
                            <Text style={styles.cardSubtitle}>{item.propertyId?.title || "Unknown Property"}</Text>
                        </View>
                        <View style={styles.subtextContainer}>
                            <Ionicons name="attach-outline" size={12} color={COLORS.mutedForeground} />
                            <Text style={styles.cardSubtitle}>{item.fileName}</Text>
                        </View>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                        <Text style={[styles.typeText, { color: typeColor.text }]}>{item.type}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>Uploaded: {formatDate(item.createdAt)}</Text>
                    <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => handleDownloadDocument(item)}
                        disabled={activeDocumentId === item._id}
                    >
                        {activeDocumentId === item._id ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={16} color={COLORS.primary} />
                                <Text style={styles.downloadBtnText}>Download</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <TopBar title="Documents" showBack />

            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />

            <FlatList
                data={filteredDocs}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <EmptyState
                        icon="folder-open-outline"
                        title="No documents yet"
                        subtitle="Documents from your landlord will appear here."
                    />
                }
                refreshing={loading}
                onRefresh={fetchDocuments}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.foreground,
        marginBottom: 2,
    },
    subtextContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: COLORS.mutedForeground,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    typeText: {
        fontSize: 12,
        fontWeight: "600",
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    dateText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    downloadBtn: {
        minWidth: 112,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: COLORS.primarySoft,
    },
    downloadBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.primary,
    },
});
