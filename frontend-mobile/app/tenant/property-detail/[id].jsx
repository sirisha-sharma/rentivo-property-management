import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Image, TouchableOpacity, Linking, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";
import axios from "axios";
import { API_BASE_URL } from "../../../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PropertyDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchPropertyDetails();
  }, [id]);

  const fetchPropertyDetails = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      const user = JSON.parse(userData);

      const response = await axios.get(
        `${API_BASE_URL}/properties/marketplace`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      const propertyData = response.data.properties.find(p => p._id === id);
      setProperty(propertyData);
    } catch (error) {
      Alert.alert("Error", "Failed to load property details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (property?.landlordId?.phone) {
      Linking.openURL(`tel:${property.landlordId.phone}`);
    }
  };

  const handleEmail = () => {
    if (property?.landlordId?.email) {
      Linking.openURL(`mailto:${property.landlordId.email}?subject=Interest in ${property.title}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar title="Property Details" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.container}>
        <TopBar title="Property Details" showBack />
        <View style={styles.emptyContainer}>
          <Text>Property not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar title="Property Details" showBack />

      <ScrollView>
        {property.images && property.images.length > 0 ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: `${API_BASE_URL}${property.images[currentImageIndex]}` }}
              style={styles.propertyImage}
            />
            <View style={styles.imageIndicator}>
              <Text style={styles.imageIndicatorText}>
                {currentImageIndex + 1} / {property.images.length}
              </Text>
            </View>
            {property.images.length > 1 && (
              <View style={styles.imageNavigation}>
                <TouchableOpacity
                  style={styles.imageNavButton}
                  onPress={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                  disabled={currentImageIndex === 0}
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imageNavButton}
                  onPress={() =>
                    setCurrentImageIndex(
                      Math.min(property.images.length - 1, currentImageIndex + 1)
                    )
                  }
                  disabled={currentImageIndex === property.images.length - 1}
                >
                  <Ionicons name="chevron-forward" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="home-outline" size={64} color={COLORS.mutedForeground} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{property.title}</Text>
            {property.rent > 0 && (
              <Text style={styles.rent}>NPR {property.rent.toLocaleString()}/mo</Text>
            )}
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.mutedForeground} />
            <Text style={styles.address}>{property.address}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoChip}>
              <Ionicons name="business-outline" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>{property.type}</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="layers-outline" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>{property.units} Units</Text>
            </View>
          </View>

          {property.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{property.description}</Text>
            </View>
          )}

          {property.amenities && property.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesContainer}>
                {property.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityChip}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {property.roomSizes && property.roomSizes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Room Details</Text>
              {property.roomSizes.map((room, index) => (
                <View key={index} style={styles.roomRow}>
                  <Text style={styles.roomName}>{room.name}</Text>
                  <Text style={styles.roomSize}>{room.size} sq ft</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.landlordCard}>
            <Text style={styles.sectionTitle}>Contact Landlord</Text>
            <View style={styles.landlordInfo}>
              <View style={styles.landlordAvatar}>
                <Ionicons name="person" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.landlordDetails}>
                <Text style={styles.landlordName}>{property.landlordId?.name}</Text>
                <Text style={styles.landlordEmail}>{property.landlordId?.email}</Text>
                {property.landlordId?.phone && (
                  <Text style={styles.landlordPhone}>{property.landlordId.phone}</Text>
                )}
              </View>
            </View>

            <View style={styles.contactActions}>
              <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
                <Ionicons name="call-outline" size={20} color="#fff" />
                <Text style={styles.contactButtonText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, styles.emailButton]}
                onPress={handleEmail}
              >
                <Ionicons name="mail-outline" size={20} color="#fff" />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  imageContainer: { position: "relative" },
  propertyImage: { width: "100%", height: 300, backgroundColor: COLORS.muted },
  placeholderImage: {
    width: "100%",
    height: 300,
    backgroundColor: COLORS.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  imageIndicator: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageIndicatorText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  imageNavigation: {
    position: "absolute",
    bottom: "50%",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  imageNavButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  content: { padding: 16 },
  header: { marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.foreground, marginBottom: 4 },
  rent: { fontSize: 20, fontWeight: "600", color: COLORS.success },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  address: { fontSize: 14, color: COLORS.mutedForeground, flex: 1 },
  infoRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 8,
  },
  infoText: { fontSize: 14, color: COLORS.primary, fontWeight: "500" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: COLORS.foreground, marginBottom: 12 },
  description: { fontSize: 14, color: COLORS.mutedForeground, lineHeight: 22 },
  amenitiesContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${COLORS.success}10`,
    borderRadius: 20,
  },
  amenityText: { fontSize: 13, color: COLORS.success, fontWeight: "500" },
  roomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  roomName: { fontSize: 14, color: COLORS.foreground },
  roomSize: { fontSize: 14, color: COLORS.mutedForeground, fontWeight: "500" },
  landlordCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 8,
  },
  landlordInfo: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  landlordAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  landlordDetails: { flex: 1 },
  landlordName: { fontSize: 16, fontWeight: "600", color: COLORS.foreground, marginBottom: 4 },
  landlordEmail: { fontSize: 13, color: COLORS.mutedForeground, marginBottom: 2 },
  landlordPhone: { fontSize: 13, color: COLORS.mutedForeground },
  contactActions: { flexDirection: "row", gap: 12 },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emailButton: { backgroundColor: COLORS.success },
  contactButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
