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
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { TopBar } from "../../../components/TopBar";
import { EmptyState } from "../../../components/EmptyState";
import { COLORS } from "../../../constants/theme";
import { BASE_URL } from "../../../constants/config";
import {
  getMarketplacePropertyDetail,
  submitPropertyRating,
} from "../../../api/marketplace";

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

function RatingStars({ value, onChange, size = 20, readonly = false }) {
  return (
    <View style={styles.ratingStarsRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <TouchableOpacity
            key={star}
            activeOpacity={0.8}
            disabled={readonly}
            onPress={() => onChange?.(star)}
          >
            <Ionicons
              name={active ? "star" : "star-outline"}
              size={size}
              color={active ? "#FBBF24" : COLORS.mutedForeground}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function PropertyDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [savingRating, setSavingRating] = useState(false);

  const fetchPropertyDetails = useCallback(async () => {
    try {
      const response = await getMarketplacePropertyDetail(id);
      const propertyData = response.property || null;
      setProperty(propertyData);
      setSelectedRating(propertyData?.currentUserRating?.rating || 0);
      setReviewText(propertyData?.currentUserRating?.review || "");
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to load property details");
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

  const handleSaveRating = async () => {
    if (!selectedRating) {
      Alert.alert("Rating Required", "Select a star rating before submitting.");
      return;
    }

    try {
      setSavingRating(true);
      const response = await submitPropertyRating(id, {
        rating: selectedRating,
        review: reviewText,
      });

      setProperty((previous) => ({
        ...previous,
        ratingSummary: response.ratingSummary,
        recentRatings: response.recentRatings,
        currentUserRating: response.rating,
      }));

      Alert.alert("Success", "Your rating has been saved.");
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to save rating");
    } finally {
      setSavingRating(false);
    }
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
          action={{ label: "Back", onPress: () => router.back() }}
        />
      </View>
    );
  }

  const hasImages = property.images && property.images.length > 0;
  const ratingCount = property.ratingSummary?.count || 0;
  const averageRating = property.ratingSummary?.average || 0;

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
                  currentImageIndex === property.images.length - 1 &&
                    styles.heroControlButtonDisabled,
                ]}
                onPress={() =>
                  setCurrentImageIndex((prev) =>
                    Math.min(property.images.length - 1, prev + 1)
                  )
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
            {property.district ? (
              <FactChip icon="navigate-outline" label={property.district} />
            ) : null}
            {ratingCount ? (
              <FactChip icon="star-outline" label={`${averageRating.toFixed(1)} / 5`} />
            ) : null}
            {property.amenities?.length ? (
              <FactChip icon="sparkles-outline" label={`${property.amenities.length} perks`} />
            ) : null}
          </View>
        </LinearGradient>

        <SectionCard title="Overview">
          <Text style={styles.bodyText}>
            {property.description ||
              "This property listing does not include a detailed description yet."}
          </Text>
        </SectionCard>

        <SectionCard title="Ratings">
          <View style={styles.ratingSummaryCard}>
            <View>
              <Text style={styles.ratingSummaryValue}>
                {ratingCount ? averageRating.toFixed(1) : "New"}
              </Text>
              <Text style={styles.ratingSummaryCaption}>
                {ratingCount
                  ? `${ratingCount} rating${ratingCount === 1 ? "" : "s"}`
                  : "No ratings yet"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 8 }}>
              <RatingStars value={Math.round(averageRating)} readonly size={18} />
              <Text style={styles.ratingSummaryHint}>
                Verified tenants can rate this property.
              </Text>
            </View>
          </View>

          {property.canRate ? (
            <View style={styles.ratingForm}>
              <Text style={styles.ratingFormTitle}>Rate this property</Text>
              <RatingStars value={selectedRating} onChange={setSelectedRating} size={24} />
              <TextInput
                style={styles.ratingTextarea}
                value={reviewText}
                onChangeText={setReviewText}
                placeholder="Share your experience (optional)"
                placeholderTextColor={COLORS.faintForeground}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={600}
              />
              <TouchableOpacity
                style={[styles.saveRatingButton, savingRating && styles.saveRatingButtonDisabled]}
                onPress={() => void handleSaveRating()}
                disabled={savingRating}
                activeOpacity={0.85}
              >
                {savingRating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="star" size={16} color="#fff" />
                    <Text style={styles.saveRatingText}>
                      {property.currentUserRating ? "Update Rating" : "Submit Rating"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.ratingNotice}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={COLORS.mutedForeground}
              />
              <Text style={styles.ratingNoticeText}>
                Only tenants who currently rent or previously rented this property can
                leave a rating.
              </Text>
            </View>
          )}

          <View style={styles.reviewsWrap}>
            {property.recentRatings?.length ? (
              property.recentRatings.map((rating) => (
                <View key={rating._id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewName}>{rating.reviewerName}</Text>
                      <Text style={styles.reviewDate}>
                        {new Date(rating.updatedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <RatingStars value={rating.rating} readonly size={16} />
                  </View>
                  <Text style={styles.reviewBody}>
                    {rating.review || "Shared a rating without additional comments."}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.ratingNotice}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color={COLORS.mutedForeground}
                />
                <Text style={styles.ratingNoticeText}>
                  No written reviews yet for this property.
                </Text>
              </View>
            )}
          </View>
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
  ratingStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  ratingSummaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingSummaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.foreground,
    letterSpacing: -0.6,
  },
  ratingSummaryCaption: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  ratingSummaryHint: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    textAlign: "right",
  },
  ratingForm: {
    marginTop: 16,
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingFormTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  ratingTextarea: {
    minHeight: 104,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.foreground,
    lineHeight: 20,
  },
  saveRatingButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveRatingButtonDisabled: {
    opacity: 0.72,
  },
  saveRatingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  ratingNotice: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.mutedForeground,
  },
  reviewsWrap: {
    marginTop: 16,
    gap: 12,
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
    padding: 14,
    gap: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  reviewDate: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  reviewBody: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.mutedForeground,
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
