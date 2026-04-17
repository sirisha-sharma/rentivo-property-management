import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { TopBar } from "../../../components/TopBar";
import { EmptyState } from "../../../components/EmptyState";
import { COLORS } from "../../../constants/theme";
import { API_BASE_URL, BASE_URL } from "../../../constants/config";

function FactChip({ icon, label }) {
  return (
    <View style={styles.factChip}>
      <Ionicons name={icon} size={15} color={COLORS.primary} />
      <Text style={styles.factChipText}>{label}</Text>
    </View>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function PropertyDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchPropertyDetails = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;

      const response = await axios.get(`${API_BASE_URL}/properties/marketplace`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      const propertyData = response.data.properties.find((entry) => entry._id === id);
      setProperty(propertyData || null);
    } catch (_error) {
      Alert.alert("Error", "Failed to load property details");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void fetchPropertyDetails();
  }, [fetchPropertyDetails]);

  const getImageUri = (img) => {
    if (!img) return "";
    if (img.startsWith("http://") || img.startsWith("https://")) {
      return img;
    }
    return `${BASE_URL}${img}`;
  };

  const handleCall = async () => {
    if (!property?.landlordId?.phone) return;
    const telUrl = `tel:${property.landlordId.phone}`;
    if (await Linking.canOpenURL(telUrl)) {
      await Linking.openURL(telUrl);
    }
  };

  const handleEmail = async () => {
    if (!property?.landlordId?.email) return;
    const mailUrl = `mailto:${property.landlordId.email}?subject=Interest in ${property.title}`;
    if (await Linking.canOpenURL(mailUrl)) {
      await Linking.openURL(mailUrl);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar title="Property Details" showBack />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.stateText}>Loading property details...</Text>
        </View>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.container}>
        <TopBar title="Property Details" showBack />
        <EmptyState
          icon="home-outline"
          title="Property not found"
          subtitle="This listing is unavailable or may have been removed."
          action={{ label: "Back to Marketplace", onPress: () => router.back() }}
        />
      </View>
    );
  }

  const hasImages = property.images && property.images.length > 0;

  return (
    <View style={styles.container}>
      <TopBar title="Property Details" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroShell}>
          {hasImages ? (
            <Image
              source={{ uri: getImageUri(property.images[currentImageIndex]) }}
              style={styles.heroImage}
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="home-outline" size={58} color={COLORS.mutedForeground} />
            </View>
          )}

          <LinearGradient
            colors={["transparent", "rgba(13,16,24,0.3)", COLORS.background]}
            style={styles.heroOverlay}
          />

          <View style={styles.heroTopRow}>
            <View style={styles.heroPill}>
              <Ionicons name="business-outline" size={14} color={COLORS.foreground} />
              <Text style={styles.heroPillText}>{property.type || "Property"}</Text>
            </View>
            {hasImages ? (
              <View style={styles.heroPill}>
                <Ionicons name="images-outline" size={14} color={COLORS.foreground} />
                <Text style={styles.heroPillText}>
                  {currentImageIndex + 1}/{property.images.length}
                </Text>
              </View>
            ) : null}
          </View>

          {hasImages && property.images.length > 1 ? (
            <View style={styles.heroControls}>
              <TouchableOpacity
                style={[
                  styles.heroControlButton,
                  currentImageIndex === 0 && styles.heroControlButtonDisabled,
                ]}
                onPress={() => setCurrentImageIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentImageIndex === 0}
              >
                <Ionicons name="chevron-back" size={20} color={COLORS.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.heroControlButton,
                  currentImageIndex === property.images.length - 1
                    && styles.heroControlButtonDisabled,
                ]}
                onPress={() =>
                  setCurrentImageIndex((prev) => Math.min(property.images.length - 1, prev + 1))
                }
                disabled={currentImageIndex === property.images.length - 1}
              >
                <Ionicons name="chevron-forward" size={20} color={COLORS.foreground} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <LinearGradient
          colors={[COLORS.primaryDeep, COLORS.primary, "#1A45AA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>{property.title}</Text>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.86)" />
                <Text style={styles.summaryAddress}>{property.address}</Text>
              </View>
            </View>
            {property.rent > 0 ? (
              <View style={styles.priceBadge}>
                <Text style={styles.priceValue}>NPR {property.rent.toLocaleString()}</Text>
                <Text style={styles.priceLabel}>monthly</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.factChipRow}>
            <FactChip icon="business-outline" label={property.type || "Flexible"} />
            <FactChip icon="layers-outline" label={`${property.units || 0} units`} />
            {property.amenities?.length ? (
              <FactChip icon="sparkles-outline" label={`${property.amenities.length} perks`} />
            ) : null}
          </View>
        </LinearGradient>

        <SectionCard title="Overview">
          <Text style={styles.bodyText}>
            {property.description || "This property listing does not include a detailed description yet."}
          </Text>
        </SectionCard>

        {property.amenities && property.amenities.length > 0 ? (
          <SectionCard title="Amenities">
            <View style={styles.amenitiesWrap}>
              {property.amenities.map((amenity, index) => (
                <View key={`${amenity}-${index}`} style={styles.amenityChip}>
                  <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : null}

        {property.roomSizes && property.roomSizes.length > 0 ? (
          <SectionCard title="Room Breakdown">
            <View style={styles.roomList}>
              {property.roomSizes.map((room, index) => (
                <View
                  key={`${room.name}-${index}`}
                  style={[
                    styles.roomRow,
                    index === property.roomSizes.length - 1 && styles.roomRowLast,
                  ]}
                >
                  <View style={styles.roomLabelWrap}>
                    <View style={styles.roomDot} />
                    <Text style={styles.roomName}>{room.name}</Text>
                  </View>
                  <Text style={styles.roomSize}>{room.size} sq ft</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : null}

        <SectionCard title="Landlord Contact">
          <View style={styles.contactRow}>
            <View style={styles.landlordAvatar}>
              <Ionicons name="person" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.landlordMeta}>
              <Text style={styles.landlordName}>{property.landlordId?.name || "Landlord"}</Text>
              <Text style={styles.landlordSecondary}>
                {property.landlordId?.email || "Email unavailable"}
              </Text>
              {property.landlordId?.phone ? (
                <Text style={styles.landlordSecondary}>{property.landlordId.phone}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.contactActionRow}>
            <TouchableOpacity
              style={[
                styles.contactAction,
                !property.landlordId?.phone && styles.contactActionDisabled,
              ]}
              onPress={() => void handleCall()}
              disabled={!property.landlordId?.phone}
            >
              <Ionicons name="call-outline" size={18} color="#fff" />
              <Text style={styles.contactActionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.contactAction,
                styles.contactActionSecondary,
                !property.landlordId?.email && styles.contactActionDisabled,
              ]}
              onPress={() => void handleEmail()}
              disabled={!property.landlordId?.email}
            >
              <Ionicons name="mail-outline" size={18} color="#fff" />
              <Text style={styles.contactActionText}>Email</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  stateText: {
    fontSize: 14,
    color: COLORS.mutedForeground,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  heroShell: {
    position: "relative",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    minHeight: 260,
  },
  heroImage: {
    width: "100%",
    height: 300,
    backgroundColor: COLORS.surface,
  },
  heroPlaceholder: {
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceElevated,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopRow: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(13,16,24,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroPillText: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "600",
  },
  heroControls: {
    position: "absolute",
    right: 16,
    bottom: 16,
    flexDirection: "row",
    gap: 10,
  },
  heroControlButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13,16,24,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroControlButtonDisabled: {
    opacity: 0.45,
  },
  summaryCard: {
    marginTop: -30,
    marginHorizontal: 12,
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  summaryHeader: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingRight: 12,
  },
  summaryAddress: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255,255,255,0.86)",
    lineHeight: 20,
  },
  priceBadge: {
    minWidth: 112,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    textAlign: "right",
  },
  priceLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    textAlign: "right",
  },
  factChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  factChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(13,16,24,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  factChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  sectionCard: {
    marginTop: 18,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    lineHeight: 22,
  },
  amenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: COLORS.successSoft,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.22)",
  },
  amenityText: {
    fontSize: 13,
    color: COLORS.foreground,
    fontWeight: "600",
  },
  roomList: {
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  roomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  roomRowLast: {
    borderBottomWidth: 0,
  },
  roomLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roomDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  roomName: {
    fontSize: 14,
    color: COLORS.foreground,
    fontWeight: "600",
  },
  roomSize: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  landlordAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(47,123,255,0.22)",
  },
  landlordMeta: {
    flex: 1,
  },
  landlordName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  landlordSecondary: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  contactActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  contactAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
  },
  contactActionSecondary: {
    backgroundColor: COLORS.accentTeal,
  },
  contactActionDisabled: {
    opacity: 0.45,
  },
  contactActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
