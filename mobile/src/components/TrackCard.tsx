import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Track } from '../types';
import { COLORS, FONTS } from '../constants/theme';
import { useAudio } from '../context/AudioContext';
import { useDownloads } from '../context/DownloadContext';
import { useSaved } from '../context/SavedContext';
import { get720pThumbnail } from '../utils/formatters';

interface TrackCardProps {
  track: Track;
  queueContext?: Track[];
  showDownloadButton?: boolean;
  showSaveButton?: boolean;
  showDeleteButton?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  queueContext,
  showDownloadButton = true,
  showSaveButton = true,
  showDeleteButton = false,
  onDelete,
  onEdit,
}) => {
  const { currentTrack, isPlaying, playTrack } = useAudio();
  const { isDownloaded, promptDownload, activeTasks } = useDownloads();
  const { isSaved, toggleSaveTrack } = useSaved();

  const isCurrent = currentTrack?.id === track.id;
  const isDl = isDownloaded(track.id) || track.isDownloaded;
  const isCached = track.isCached || !!track.localUri;
  const isTrackSaved = isSaved(track.id) || track.isSaved;
  const activeTask = activeTasks[track.id];

  const handlePlay = () => {
    playTrack(track, queueContext);
  };

  const handleDownload = () => {
    promptDownload(track);
  };

  const handleToggleSave = () => {
    toggleSaveTrack(track);
  };

  return (
    <TouchableOpacity
      style={[styles.container, isCurrent && styles.activeContainer]}
      onPress={handlePlay}
      activeOpacity={0.7}
    >
      {/* Cover Artwork */}
      <View style={styles.artworkContainer}>
        {track.thumbnail ? (
          <Image source={{ uri: get720pThumbnail(track.thumbnail) || track.thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailFallback}>
            <Feather name="headphones" size={18} color={COLORS.textSecondary} />
          </View>
        )}
        {isCurrent && (
          <View style={styles.playingOverlay}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color={COLORS.white}
            />
          </View>
        )}
      </View>

      {/* Track Details */}
      <View style={styles.infoCol}>
        <Text
          style={[styles.title, isCurrent && styles.activeTitle]}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text style={styles.artists} numberOfLines={1}>
          {track.artists.join(', ')}
        </Text>

        {track.customNote ? (
          <Text style={styles.customNote} numberOfLines={1}>
            "{track.customNote}"
          </Text>
        ) : null}

        <View style={styles.badgesRow}>
          {track.year ? (
            <View style={styles.badgeYear}>
              <Text style={styles.badgeYearText}>{track.year}</Text>
            </View>
          ) : null}

          {track.duration ? (
            <Text style={styles.durationText}>{track.duration}</Text>
          ) : null}

          {isDl ? (
            <View style={styles.badgeDownloaded}>
              <Feather name="check" size={10} color={COLORS.black} />
              <Text style={styles.badgeDownloadedText}>SAVED</Text>
            </View>
          ) : isCached ? (
            <View style={styles.badgeCached}>
              <Feather name="zap" size={10} color={COLORS.white} />
              <Text style={styles.badgeCachedText}>OFFLINE</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Action Buttons Column */}
      <View style={styles.actionCol}>
        {/* Save / Favorite Heart Button */}
        {showSaveButton && (
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={handleToggleSave}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isTrackSaved ? 'heart' : 'heart-outline'}
              size={18}
              color={isTrackSaved ? '#FF3B30' : COLORS.textMuted}
            />
          </TouchableOpacity>
        )}

        {/* Download Button */}
        {showDownloadButton && (
          <>
            {activeTask ? (
              <View style={styles.progressCircle}>
                <ActivityIndicator size="small" color={COLORS.white} />
                <Text style={styles.progressPercent}>
                  {Math.round(activeTask.progress * 100)}%
                </Text>
              </View>
            ) : isDl ? (
              <View style={styles.iconButtonSaved}>
                <Feather name="check-circle" size={18} color={COLORS.white} />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={handleDownload}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="download" size={17} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Optional Edit Note Button */}
        {onEdit && (
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="edit-2" size={15} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}

        {/* Optional Delete Button */}
        {showDeleteButton && onDelete && (
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={16} color={COLORS.error || '#FF453A'} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeContainer: {
    borderColor: COLORS.white,
    backgroundColor: COLORS.cardHighlight,
  },
  artworkContainer: {
    width: 52,
    height: 52,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    position: 'relative',
    marginRight: 14,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  activeTitle: {
    color: COLORS.white,
    fontFamily: FONTS.serifBold,
  },
  artists: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  customNote: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#30D158',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  badgeYear: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  badgeYearText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  durationText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  badgeDownloaded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.white,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeDownloadedText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  badgeCached: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeCachedText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  actionIconBtn: {
    padding: 4,
  },
  iconButtonSaved: {
    padding: 4,
  },
  progressCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  progressPercent: {
    fontSize: 8,
    color: COLORS.white,
    fontWeight: '700',
    marginTop: 1,
  },
});
