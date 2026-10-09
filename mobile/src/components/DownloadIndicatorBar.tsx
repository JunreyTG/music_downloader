import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useDownloads } from '../context/DownloadContext';
import { COLORS, FONTS } from '../constants/theme';
import { formatFileSize } from '../utils/formatters';

export const DownloadIndicatorBar: React.FC = () => {
  const { activeTasks, pauseDownload, resumeDownload, cancelDownload } = useDownloads();
  const tasks = Object.values(activeTasks);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isPaused = tasks.length > 0 && tasks[0].status === 'paused';

  useEffect(() => {
    if (tasks.length > 0 && !isPaused) {
      // Continuous rotation animation
      const rotateLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      // Subtle pulse animation
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      rotateLoop.start();
      pulseLoop.start();

      return () => {
        rotateLoop.stop();
        pulseLoop.stop();
      };
    }
  }, [tasks.length, isPaused]);

  if (tasks.length === 0) return null;

  const currentTask = tasks[0];
  const percent = Math.round(currentTask.progress * 100);
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const downloadedBytesText = currentTask.bytesWritten > 0 ? formatFileSize(currentTask.bytesWritten) : '';
  const totalBytesText = currentTask.totalBytes > 0 ? formatFileSize(currentTask.totalBytes) : '';

  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        <Animated.View style={[styles.iconBox, !isPaused && { transform: [{ rotate: spin }] }]}>
          <Feather name={isPaused ? 'pause' : 'loader'} size={15} color={COLORS.black} />
        </Animated.View>

        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.statusLabel}>
              {isPaused ? `PAUSED (${percent}%)` : `DOWNLOADING (${percent}%)`}
            </Text>
            {downloadedBytesText && totalBytesText ? (
              <Text style={styles.sizeLabel}>
                {downloadedBytesText} / {totalBytesText}
              </Text>
            ) : null}
          </View>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentTask.track.title}
          </Text>
        </View>

        <View style={styles.actionsGroup}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              {(currentTask.format || 'MP3').toUpperCase()}
            </Text>
          </View>

          {isPaused ? (
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => resumeDownload(currentTask.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="play" size={15} color={COLORS.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => pauseDownload(currentTask.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="pause" size={15} color={COLORS.white} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => cancelDownload(currentTask.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={15} color={COLORS.error || '#FF453A'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar Fill */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            isPaused && { backgroundColor: '#FF9F0A' },
            { width: `${percent}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'ios' ? 44 : 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    zIndex: 999,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.8,
  },
  sizeLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  trackTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.serifBold,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
  },
});
