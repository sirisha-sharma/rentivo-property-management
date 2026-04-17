import React, { useCallback, useContext, useMemo, useState } from "react";
import {

// Screen module for new.

    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MessageContext } from "../../context/MessageContext";
import { EmptyState } from "../../components/EmptyState";
import { TopBar } from "../../components/TopBar";
import { COLORS } from "../../constants/theme";

export default function NewConversationScreen() {
    const router = useRouter();
    const { contacts, fetchContacts } = useContext(MessageContext);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;

            const load = async () => {
                try {
                    setLoading(true);
                    await fetchContacts();
                } finally {
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            };

            void load();

            return () => {
                isMounted = false;
            };
        }, [fetchContacts])
    );

    const filteredContacts = useMemo(() => {
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) return contacts;

        return contacts.filter((contact) =>
            contact.otherUserName?.toLowerCase().includes(trimmedQuery)
            || contact.propertyTitle?.toLowerCase().includes(trimmedQuery)
            || contact.otherUserEmail?.toLowerCase().includes(trimmedQuery)
        );
    }, [contacts, query]);

    return (
        <View style={styles.container}>
            <TopBar title="New Chat" showBack />

            <View style={styles.headerBlock}>
                <View style={styles.heroCard}>
                    <View style={styles.heroIcon}>
                        <Ionicons name="create-outline" size={22} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroTitle}>Start a conversation</Text>
                        <Text style={styles.heroSubtitle}>
                            Search contacts by person, property, or email and jump straight into chat.
                        </Text>
                    </View>
                </View>

                <View style={styles.searchWrap}>
                    <Ionicons name="search-outline" size={18} color={COLORS.mutedForeground} />
                    <TextInput
                        style={styles.searchInput}
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search landlord, tenant, or property"
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filteredContacts}
                    keyExtractor={(item) => item.threadId}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() =>
                                router.push(
                                    `/messages/${item.threadId}?name=${encodeURIComponent(item.otherUserName)}&property=${encodeURIComponent(item.propertyTitle || "")}`
                                )
                            }
                        >
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {item.otherUserName?.charAt(0)?.toUpperCase() || "?"}
                                </Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.name}>{item.otherUserName}</Text>
                                <Text style={styles.meta} numberOfLines={1}>
                                    {item.propertyTitle || "Property"}
                                </Text>
                                {item.otherUserEmail ? (
                                    <Text style={styles.email} numberOfLines={1}>
                                        {item.otherUserEmail}
                                    </Text>
                                ) : null}
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.mutedForeground} />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <EmptyState
                            icon="people-outline"
                            title="No available contacts"
                            subtitle="You can only message your own landlord or active tenants."
                        />
                    }
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
    headerBlock: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 14,
    },
    heroCard: {
        flexDirection: "row",
        gap: 14,
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 18,
    },
    heroIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primarySoft,
        borderWidth: 1,
        borderColor: "rgba(47,123,255,0.24)",
    },
    heroTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: COLORS.foreground,
        letterSpacing: -0.3,
    },
    heroSubtitle: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 19,
        color: COLORS.mutedForeground,
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    searchInput: {
        flex: 1,
        color: COLORS.foreground,
        fontSize: 15,
    },
    list: {
        padding: 16,
        paddingTop: 14,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 10,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: COLORS.primarySoft,
        borderWidth: 1,
        borderColor: "rgba(47,123,255,0.24)",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: COLORS.primary,
        fontSize: 17,
        fontWeight: "800",
    },
    cardContent: {
        flex: 1,
    },
    name: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    meta: {
        marginTop: 3,
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: "600",
    },
    email: {
        marginTop: 3,
        color: COLORS.mutedForeground,
        fontSize: 12,
    },
});
