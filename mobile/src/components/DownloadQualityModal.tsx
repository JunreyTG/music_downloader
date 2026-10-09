import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Track } from '../types';
import { COLORS, FONTS } from '../constants/theme';

interface DownloadQualityModalProps {
  visible: boolean;
  track: Track | null;
  onSelect: (format: 'mp3' | 'mp4') => void;
  onClose: () => void;
}

export const DownloadQualityModal: React.FC<DownloadQualityModalProps> = ({
  visible,
  track,
  onSelect,
  onClose,
}) => {
  if (!track) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <Feather name="download" size={16} color={COLORS.white} />
                  <Text style={styles.headerTitle}>SELECT DOWNLOAD QUALITY</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Feather name="x" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Track Title Info */}
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {track.artists.join(', ')} {track.year ? `· ${track.year}` : ''}
                </Text>
              </View>

              {/* Choices */}
              <View style={styles.optionsList}>
                {/* MP3 Standard */}
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => onSelect('mp3')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionIconContainer}>
                    <Feather name="music" size={20} color={COLORS.white} />
                  </View>
                  <View style={styles.optionTextCol}>
                    <View style={styles.optionHeaderRow}>
                      <Text style={styles.optionTitle}>MP3 AUDIO</Text>
                      <View style={styles.badgePill}>
                        <Text style={styles.badgeText}>STANDARD (~4 MB)</Text>
                      </View>
                    </View>
                    <Text style={styles.optionDesc}>
                      192 kbps · Fast download · Universal audio compatibility
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* MP4 / M4A High Fidelity */}
                <TouchableOpacity
                  style={[styles.optionCard, styles.optionCardHq]}
                  onPress={() => onSelect('mp4')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconContainer, styles.optionIconContainerHq]}>
                    <Ionicons name="sparkles" size={20} color={COLORS.black} />
                  </View>
                  <View style={styles.optionTextCol}>
                    <View style={styles.optionHeaderRow}>
                      <Text style={styles.optionTitle}>MP4 / M4A MASTER</Text>
                      <View style={[styles.badgePill, styles.badgePillHq]}>
                        <Text style={[styles.badgeText, styles.badgeTextHq]}>HI-RES (~8 MB)</Text>
                      </View>
                    </View>
                    <Text style={styles.optionDesc}>
                      256+ kbps AAC · Highest bitrate studio clarity · Deep bass
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1.2,
  },
  closeBtn: {
    padding: 4,
  },
  trackInfo: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 14,
  },
  trackTitle: {
    fontSize: 15,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  optionCardHq: {
    borderColor: COLORS.white,
    backgroundColor: '#181818',
  },
  optionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionIconContainerHq: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    fontSize: 12,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgePillHq: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.4,
  },
  badgeTextHq: {
    color: COLORS.black,
  },
  optionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
});
