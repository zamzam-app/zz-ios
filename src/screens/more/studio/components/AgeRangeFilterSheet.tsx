import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';

import { aiStyles } from '../../../../theme/studioStyles';
import { colors } from '../../../../theme/theme';

export function AgeRangeFilterSheet({
  visible,
  minAgeText,
  maxAgeText,
  setMinAgeText,
  setMaxAgeText,
  onClose,
}: {
  visible: boolean;
  minAgeText: string;
  maxAgeText: string;
  setMinAgeText: (v: string) => void;
  setMaxAgeText: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={aiStyles.filterModalRoot}>
        <TouchableOpacity style={aiStyles.filterModalScrim} activeOpacity={1} onPress={onClose} />
        <View style={aiStyles.filterSheet}>
          <View style={aiStyles.filterSheetTop}>
            <View style={aiStyles.filterSheetHandle} />
            <View style={aiStyles.filterSheetHeader}>
              <Text style={aiStyles.filterSheetTitle}>Age Filter</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={aiStyles.filterSheetBody}>
            <Text style={aiStyles.filterLabel}>Age group range</Text>
            <View style={aiStyles.ageRow}>
              <TextInput
                style={aiStyles.ageInput}
                value={minAgeText}
                onChangeText={(text) => setMinAgeText(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="Min age"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={aiStyles.ageDivider}>to</Text>
              <TextInput
                style={aiStyles.ageInput}
                value={maxAgeText}
                onChangeText={(text) => setMaxAgeText(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="Max age"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uiGray1,
  },
});
