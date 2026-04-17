import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { getLocationOptionLabel, NEPAL_LOCATION_OPTIONS } from "../constants/nepalLocations";

export function LocationPickerField({
  label = "Location",
  title = "Select Location",
  placeholder = "Choose a location",
  value,
  onChange,
  allowClear = false,
  error,
  helperText,
}) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return NEPAL_LOCATION_OPTIONS;
    }

    return NEPAL_LOCATION_OPTIONS.filter(
      (option) =>
        option.label.toLowerCase().includes(trimmedQuery) ||
        option.value.toLowerCase().includes(trimmedQuery)
    );
  }, [query]);

  const selectedLabel = value ? getLocationOptionLabel(value) : "";

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setVisible(false);
    setQuery("");
  };

  const closeModal = () => {
    setVisible(false);
    setQuery("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setVisible(true)}
        style={[
          styles.fieldButton,
          selectedLabel ? styles.fieldButtonSelected : null,
          error ? styles.fieldButtonError : null,
        ]}
      >
        <View style={styles.fieldContent}>
          <Ionicons name="location-outline" size={18} color={selectedLabel ? COLORS.primary : COLORS.mutedForeground} />
          <Text
            style={[
              styles.fieldText,
              !selectedLabel ? styles.fieldPlaceholder : null,
            ]}
            numberOfLines={1}
          >
            {selectedLabel || placeholder}
          </Text>
        </View>

        <View style={styles.fieldActions}>
          {allowClear && selectedLabel ? (
            <TouchableOpacity
              onPress={() => onChange("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.mutedForeground} />
            </TouchableOpacity>
          ) : null}
          <Ionicons name="chevron-down" size={18} color={COLORS.mutedForeground} />
        </View>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      <Modal visible={visible} animationType="slide" transparent onRequestClose={closeModal}>
        <Pressable style={styles.overlay} onPress={closeModal} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalSubtitle}>Priority locations are pinned at the top.</Text>
            </View>
            <TouchableOpacity
              onPress={closeModal}
              style={styles.closeButton}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={20} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search location"
              placeholderTextColor={COLORS.faintForeground}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              keyboardAppearance="dark"
              selectionColor={COLORS.primary}
              cursorColor={COLORS.primary}
            />
          </View>

          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => `${item.label}-${item.value}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const selected = value === item.value;

              return (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => handleSelect(item.value)}
                  style={[styles.optionRow, selected ? styles.optionRowSelected : null]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, selected ? styles.optionLabelSelected : null]}>
                      {item.label}
                    </Text>
                    {item.label !== item.value ? (
                      <Text style={styles.optionValue}>{item.value}</Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={28} color={COLORS.mutedForeground} />
                <Text style={styles.emptyTitle}>No locations found</Text>
                <Text style={styles.emptySubtitle}>Try another district or city keyword.</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  fieldButton: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.input,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fieldButtonSelected: {
    borderColor: COLORS.primary,
  },
  fieldButtonError: {
    borderColor: COLORS.destructive,
  },
  fieldContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.foreground,
  },
  fieldPlaceholder: {
    color: COLORS.faintForeground,
  },
  fieldActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.destructive,
  },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.scrim,
  },
  modalSheet: {
    maxHeight: "78%",
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.foreground,
  },
  listContent: {
    paddingBottom: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  optionRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  optionLabelSelected: {
    color: COLORS.primary,
  },
  optionValue: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
});
