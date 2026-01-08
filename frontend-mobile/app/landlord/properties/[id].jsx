import React, { useEffect, useState, useContext } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { COLORS } from "../../../constants/theme";
import { PropertyContext } from "../../../context/PropertyContext";
import { TenantContext } from "../../../context/TenantContext";
import axios from "axios";
import { API_BASE_URL } from "../../../constants/config";

// Placeholder for now as we don't have maintenance context yet
const maintenanceRequests = [
    { id: 1, issue: "Plumbing", status: "in-progress", date: "Dec 20, 2024" },
    { id: 2, issue: "Electricity", status: "submitted", date: "Dec 22, 2024" },
];

export default function PropertyDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const { tenants, fetchTenants } = useContext(TenantContext);

    useEffect(() => {
        fetchTenants(); // We need to filter tenants for this property
        const fetchPropertyDetails = async () => {
            try {
                // Assuming we have an endpoint or we find it from context. 
                // For now searching in context list would be better if already loaded, but let's fetch to be safe or just find
                // Since context fetches all, we can just find it. But wait, PropertyContext fetches all.
                const response = await axios.get(`${API_BASE_URL}/properties`); // Hacky, better to have getById
                const found = response.data.find(p => p._id === id);
                setProperty(found);
            } catch (e) {
                console.log(e);
            } finally {
                setLoading(false);
            }
        };
        fetchPropertyDetails();
    }, [id]);

    const propertyTenants = tenants.filter(t => t.propertyId?._id === id || t.propertyId === id);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!property) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text>Property not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TopBar title="Property Details" showBack />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.propertyName}>{property.title}</Text>
                            <View style={styles.locationContainer}>
                                <Ionicons name="location-outline" size={12} color={COLORS.mutedForeground} />
                                <Text style={styles.address}>{property.address}</Text>
                            </View>
                        </View>
                        <StatusBadge status={property.status || "vacant"} />
                    </View>

                    <View style={styles.tagsRow}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{property.type}</Text>
                        </View>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{property.units} Units</Text>
                        </View>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={20} color={COLORS.primary} />
                        <Text style={styles.statValue}>{propertyTenants.length}</Text>
                        <Text style={styles.statLabel}>Tenants</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="cash-outline" size={20} color={COLORS.success} />
                        <Text style={styles.statValue}>-</Text>
                        <Text style={styles.statLabel}>Monthly</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="construct-outline" size={20} color={COLORS.warning} />
                        <Text style={styles.statValue}>2</Text>
                        <Text style={styles.statLabel}>Issues</Text>
                    </View>
                </View>

                {/* Tenants Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Current Tenants</Text>
                    <TouchableOpacity
                        onPress={() => router.push("/landlord/tenants/invite")}
                        style={styles.addButton}
                    >
                        <Ionicons name="add" size={16} color={COLORS.foreground} />
                        <Text style={styles.addButtonText}>Add Tenant</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tenantList}>
                    {propertyTenants.length === 0 ? (
                        <Text style={styles.emptyText}>No tenants yet</Text>
                    ) : propertyTenants.map((t) => (
                        <View key={t._id} style={styles.tenantItem}>
                            <View>
                                <Text style={styles.tenantName}>{t.userId?.name || "Pending User"}</Text>
                                <Text style={styles.tenantUnit}>{t.leaseEnd ? `Lease ends: ${t.leaseEnd}` : "Actve"}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.tenantRent}>Active</Text>
                                <View style={styles.phoneRow}>
                                    <Ionicons name="call-outline" size={12} color={COLORS.mutedForeground} />
                                    <Text style={styles.phoneText}>{t.userId?.phone || "-"}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Utility Config */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Utility Configuration</Text>
                    <Text style={styles.cardDetail}>
                        Split Method: <Text style={{ fontWeight: '600', color: COLORS.foreground }}>{property.splitMethod}</Text>
                    </Text>
                </View>

                {/* Recent Maintenance */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Maintenance</Text>
                    <TouchableOpacity><Text style={styles.linkText}>View all</Text></TouchableOpacity>
                </View>

                <View style={styles.maintenanceList}>
                    {maintenanceRequests.map((req) => (
                        <View key={req.id} style={styles.maintenanceItem}>
                            <View>
                                <Text style={styles.maintIssue}>{req.issue}</Text>
                                <Text style={styles.maintDate}>{req.date}</Text>
                            </View>
                            <StatusBadge status={req.status} />
                        </View>
                    ))}
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionButton, styles.primaryAction]}>
                        <Ionicons name="document-text-outline" size={18} color="white" />
                        <Text style={styles.primaryActionText}>Generate Invoice</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]}>
                        <Text style={styles.secondaryActionText}>View Invoices</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { justifyContent: "center", alignItems: "center" },
    content: { padding: 16 },
    headerCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 16,
    },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    propertyName: { fontSize: 18, fontWeight: "bold", color: COLORS.foreground },
    locationContainer: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    address: { fontSize: 14, color: COLORS.mutedForeground },
    tagsRow: { flexDirection: "row", gap: 8 },
    tag: { backgroundColor: COLORS.muted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    tagText: { fontSize: 12, color: COLORS.mutedForeground },

    statsGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
    statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, alignItems: "center" },
    statValue: { fontSize: 18, fontWeight: "bold", color: COLORS.foreground, marginVertical: 4 },
    statLabel: { fontSize: 10, color: COLORS.mutedForeground },

    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: "600", color: COLORS.foreground },
    addButton: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
    addButtonText: { fontSize: 12, fontWeight: "500", marginLeft: 4 },

    tenantList: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
    tenantItem: { padding: 12, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: COLORS.border },
    emptyText: { padding: 16, textAlign: 'center', color: COLORS.mutedForeground },
    tenantName: { fontSize: 14, fontWeight: "500", color: COLORS.foreground },
    tenantUnit: { fontSize: 12, color: COLORS.mutedForeground },
    tenantRent: { fontSize: 14, fontWeight: "600", color: COLORS.foreground },
    phoneRow: { flexDirection: "row", alignItems: "center", gap: 4, justifyContent: 'flex-end' },
    phoneText: { fontSize: 12, color: COLORS.mutedForeground },

    card: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 16 },
    cardTitle: { fontSize: 14, fontWeight: "600", color: COLORS.foreground, marginBottom: 8 },
    cardDetail: { fontSize: 14, color: COLORS.mutedForeground },

    linkText: { fontSize: 12, color: COLORS.primary, fontWeight: "500" },
    maintenanceList: { gap: 8, marginBottom: 16 },
    maintenanceItem: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    maintIssue: { fontSize: 14, fontWeight: "500", color: COLORS.foreground },
    maintDate: { fontSize: 12, color: COLORS.mutedForeground },

    actionRow: { flexDirection: "row", gap: 8 },
    actionButton: { flex: 1, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", flexDirection: 'row', gap: 8 },
    primaryAction: { backgroundColor: COLORS.primary },
    primaryActionText: { color: "white", fontWeight: "600" },
    secondaryAction: { borderWidth: 1, borderColor: COLORS.border },
    secondaryActionText: { color: COLORS.foreground, fontWeight: "600" },

});
