import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import { useAudio } from '../context/AudioContext';
import { get720pThumbnail } from '../utils/formatters';

export const MiniPlayer: React.FC = () => {
  const { currentTrack, isPlaying, isLoading, position, duration, togglePlayPause, nextTrack, openModal } = useAudio();

  if (!currentTrack) return null;

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;
  const isOfflineAudio = !!currentTrack.localUri || currentTrack.isCached || currentTrack.isDownloaded;

  return (
    <View style={styles.wrapper}>
      {/* Top Hairline Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <TouchableOpacity
        style={styles.contentRow}
        onPress={openModal}
        activeOpacity={0.9}
      >
        {/* Cover Art */}
        <View style={styles.thumbnailContainer}>
          {currentTrack.thumbnail ? (
            <Image source={{ uri: get720pThumbnail(currentTrack.thumbnail) || currentTrack.thumbnail }} style={styles.thumbnail} />
          ) : (
            <View style={styles.fallbackThumbnail}>
              <Feather name="headphones" size={16} color={COLORS.textSecondary} />
            </View>
          )}
        </View>

        {/* Title and Artist */}
        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            {isOfflineAudio && (
              <View style={styles.offlineDot}>
                <Feather name="zap" size={9} color={COLORS.white} />
              </View>
            )}
          </View>
          <Text style={styles.artists} numberOfLines={1}>
            {currentTrack.artists.join(', ')}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={togglePlayPause}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color={COLORS.white}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={nextTrack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="play-skip-forward" size={19} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 2,
  },
  progressTrack: {
    height: 2,
    backgroundColor: COLORS.border,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  thumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  fallbackThumbnail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    flexShrink: 1,
  },
  offlineDot: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: COLORS.cardHighlight,
  },
  artists: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginLeft: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
