import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { DocumentContext } from "../../../context/DocumentContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";

export default function DocumentList() {
    const { documents, fetchDocuments, deleteDocument, loading } = useContext(DocumentContext);
    const router = useRouter();
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetchDocuments();
    }, []);

    const filteredDocs = documents.filter((doc) => {
        if (filter === "all") return true;
        return doc.type === filter;
    });

    const handleDelete = (doc) => {
        Alert.alert("Delete Document", `Delete "${doc.name}"?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteDocument(doc._id);
                    } catch (e) {
                        Alert.alert("Error", "Failed to delete document");
                    }
                },
            },
        ]);
    };

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

                <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>Uploaded: {formatDate(item.createdAt)}</Text>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>
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
                        <Text style={styles.emptyText}>Upload lease agreements and ID proofs for your properties.</Text>
                    </View>
                }
                refreshing={loading}
                onRefresh={fetchDocuments}
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push("/landlord/documents/upload")}
            >
                <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
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
    },
    dateText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    deleteBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#FEE2E2",
        borderRadius: 6,
    },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
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
