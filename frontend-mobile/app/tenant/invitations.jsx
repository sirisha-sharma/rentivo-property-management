import React, { useContext, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { TenantContext } from "../../context/TenantContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../components/TopBar";
import { StatusBadge } from "../../components/StatusBadge";
import { COLORS } from "../../constants/theme";

export default function TenantInvitations() {
    const { invitations, fetchMyInvitations, acceptInvitation, rejectInvitation, loading } = useContext(TenantContext);
    const router = useRouter();

    useEffect(() => {
        fetchMyInvitations();
    }, []);

    const handleAccept = async (id) => {
        try {
            await acceptInvitation(id);
            Alert.alert("Success", "Invitation accepted!");
            fetchMyInvitations();
        } catch (e) {
            Alert.alert("Error", "Failed to accept invitation");
        }
    };

    const handleReject = (id) => {
        Alert.alert(
            "Reject Invitation",
            "Are you sure you want to reject this invitation?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reject",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await rejectInvitation(id);
                            fetchMyInvitations();
                        } catch (e) {
                            Alert.alert("Error", "Failed to reject invitation");
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardTitle}>{item.propertyId?.title || "Property"}</Text>
                    <View style={styles.subtextContainer}>
                        <Ionicons name="location-outline" size={12} color={COLORS.mutedForeground} />
                        <Text style={styles.cardSubtitle}>{item.propertyId?.address || "Address"}</Text>
                    </View>
                    <View style={styles.subtextContainer}>
                        <Ionicons name="business-outline" size={12} color={COLORS.mutedForeground} />
                        <Text style={styles.cardSubtitle}>{item.propertyId?.type || "Type"}</Text>
                    </View>
                </View>
                <StatusBadge status={item.status || "Pending"} />
            </View>

            <View style={styles.divider} />

            <View style={styles.dateRow}>
                <Text style={styles.dateText}>
                    Lease: {item.leaseStart ? new Date(item.leaseStart).toLocaleDateString() : "N/A"} - {item.leaseEnd ? new Date(item.leaseEnd).toLocaleDateString() : "N/A"}
                </Text>
            </View>

            {item.status === "Pending" && (
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item._id)}>
                        <Ionicons name="checkmark" size={18} color="white" />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item._id)}>
                        <Ionicons name="close" size={18} color="#EF4444" />
                        <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <TopBar title="My Invitations" showBack />

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={invitations}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="mail-outline" size={48} color={COLORS.border} />
                            <Text style={styles.emptyTitle}>No invitations</Text>
                            <Text style={styles.emptyText}>You don't have any property invitations yet.</Text>
                        </View>
                    }
                    refreshing={loading}
                    onRefresh={fetchMyInvitations}
                />
            )}
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
        fontWeight: "600",
        color: COLORS.foreground,
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
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
    dateRow: {
        marginBottom: 12,
    },
    dateText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    actionRow: {
        flexDirection: "row",
        gap: 12,
    },
    acceptBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    acceptBtnText: {
        color: "white",
        fontWeight: "600",
    },
    rejectBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FEE2E2",
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: "#EF4444",
    },
    rejectBtnText: {
        color: "#EF4444",
        fontWeight: "600",
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
});
