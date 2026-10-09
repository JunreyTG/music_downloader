import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import { useAudio } from '../context/AudioContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Mseek', subtitle }) => {
  const { isOfflineMode, setOfflineMode } = useAudio();

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.logoGroup}>
          <View style={styles.iconCircle}>
            <Feather name="headphones" size={20} color={COLORS.black} />
          </View>
          <Text style={styles.appName}>{title}</Text>
        </View>

        <TouchableOpacity
          style={[styles.offlineBadge, isOfflineMode && styles.offlineBadgeActive]}
          onPress={() => setOfflineMode(!isOfflineMode)}
          activeOpacity={0.8}
        >
          <Feather
            name={isOfflineMode ? 'wifi-off' : 'wifi'}
            size={12}
            color={isOfflineMode ? COLORS.black : COLORS.textMuted}
          />
          <Text
            style={[
              styles.offlineText,
              isOfflineMode && styles.offlineTextActive,
            ]}
          >
            {isOfflineMode ? 'OFFLINE MODE' : 'ONLINE'}
          </Text>
        </TouchableOpacity>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 26,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  offlineBadgeActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  offlineTextActive: {
    color: COLORS.black,
  },
});
