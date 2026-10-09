import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ReleaseItem } from '../types';
import { COLORS, FONTS } from '../constants/theme';
import { get720pThumbnail } from '../utils/formatters';

interface ReleaseCardProps {
  item: ReleaseItem;
  onPress: () => void;
}

export const ReleaseCard: React.FC<ReleaseCardProps> = ({ item, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        {item.thumbnail ? (
          <Image source={{ uri: get720pThumbnail(item.thumbnail) || item.thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={styles.fallback}>
            <Feather name="headphones" size={32} color={COLORS.textSecondary} />
          </View>
        )}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {item.year ? `${item.year} · ` : ''}{(item.type || 'ALBUM').toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.artists} numberOfLines={1}>
        {item.artists.join(', ')}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 14,
  },
  imageContainer: {
    width: 140,
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    marginBottom: 8,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  artists: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
