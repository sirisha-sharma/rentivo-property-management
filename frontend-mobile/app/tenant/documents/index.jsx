import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { DocumentContext } from "../../../context/DocumentContext";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";

export default function TenantDocumentList() {
    const { documents, fetchDocuments, loading } = useContext(DocumentContext);
    const [filter, setFilter] = useState("all");

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
                return { bg: "#DBEAFE", text: "#1E40AF" };
            case "ID Proof":
                return { bg: "#FEF9C3", text: "#854D0E" };
            default:
                return { bg: COLORS.muted, text: COLORS.mutedForeground };
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString();
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

                <Text style={styles.dateText}>Uploaded: {formatDate(item.createdAt)}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <TopBar title="Documents" showBack />

            <View style={styles.filterRow}>
                {["all", "Lease Agreement", "ID Proof", "Other"].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, filter === f && styles.filterChipActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f === "all" ? "All" : f}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredDocs}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="folder-open" size={48} color={COLORS.border} />
                        <Text style={styles.emptyTitle}>No documents yet</Text>
                        <Text style={styles.emptyText}>Documents from your landlord will appear here.</Text>
                    </View>
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
    dateText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.foreground,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        textAlign: "center",
        color: COLORS.mutedForeground,
        paddingHorizontal: 40,
    },
    filterRow: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.muted,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
    },
    filterText: {
        fontSize: 13,
        fontWeight: "500",
        color: COLORS.mutedForeground,
    },
    filterTextActive: {
        color: "#fff",
    },
});
