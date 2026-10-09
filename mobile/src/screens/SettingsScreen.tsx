import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import { useHistory } from '../context/HistoryContext';
import { useDownloads } from '../context/DownloadContext';
import { formatFileSize } from '../utils/formatters';

const AUTO_CACHE_KEY = '@mseek_auto_cache';
const AUDIO_QUALITY_KEY = '@mseek_audio_quality';
const PREFERRED_FORMAT_KEY = '@mseek_preferred_format';

type AudioQuality = 'master' | 'high' | 'eco';
type PreferredFormat = 'mp4' | 'mp3';

export const SettingsScreen: React.FC = () => {
  const { cacheSizeBytes, clearHistoryCache, refreshHistory, history } = useHistory();
  const { downloads, downloadsSizeBytes, clearAllDownloads } = useDownloads();

  const [autoCache, setAutoCache] = useState<boolean>(true);
  const [quality, setQuality] = useState<AudioQuality>('master');
  const [preferredFormat, setPreferredFormat] = useState<PreferredFormat>('mp4');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const storedAuto = await AsyncStorage.getItem(AUTO_CACHE_KEY);
      if (storedAuto !== null) {
        setAutoCache(storedAuto === 'true');
      }

      const storedQuality = await AsyncStorage.getItem(AUDIO_QUALITY_KEY);
      if (storedQuality) {
        setQuality(storedQuality as AudioQuality);
      }

      const storedFormat = await AsyncStorage.getItem(PREFERRED_FORMAT_KEY);
      if (storedFormat) {
        setPreferredFormat(storedFormat as PreferredFormat);
      }
    } catch (e) {
      console.warn('Failed to load settings preferences:', e);
    }
  };

  const handleToggleAutoCache = async (val: boolean) => {
    setAutoCache(val);
    await AsyncStorage.setItem(AUTO_CACHE_KEY, String(val));
  };

  const handleSelectQuality = async (q: AudioQuality) => {
    setQuality(q);
    await AsyncStorage.setItem(AUDIO_QUALITY_KEY, q);
  };

  const handleSelectFormat = async (fmt: PreferredFormat) => {
    setPreferredFormat(fmt);
    await AsyncStorage.setItem(PREFERRED_FORMAT_KEY, fmt);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Playback Stream Cache?',
      'This will remove all automatically cached streaming music files to free up space. Permanently saved tracks in your Downloads will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            await clearHistoryCache();
            await refreshHistory();
            Alert.alert('Cache Cleared', 'Playback stream cache has been emptied.');
          },
        },
      ]
    );
  };

  const handleClearAllDownloads = () => {
    Alert.alert(
      'Clear All Downloaded Songs?',
      'This will permanently delete all downloaded audio files from device storage to reclaim disk space.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearAllDownloads();
            Alert.alert('Downloads Cleared', 'All permanent audio downloads removed.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Page Header */}
      <View style={styles.headerSection}>
        <Text style={styles.sectionTitle}>PREFERENCES & STORAGE</Text>
        <Text style={styles.sectionSubtitle}>
          Manage offline storage, audio fidelity, and view application details.
        </Text>
      </View>

      {/* Storage & Offline Cache Management */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Feather name="database" size={15} color={COLORS.black} />
          </View>
          <Text style={styles.cardTitle}>OFFLINE STORAGE & CACHE</Text>
        </View>

        <Text style={styles.cardDesc}>
          Songs you listen to are automatically cached for offline replay. Permanently downloaded songs stay on your device indefinitely.
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>STREAM CACHE</Text>
            <Text style={styles.statValue}>{formatFileSize(cacheSizeBytes)}</Text>
            <Text style={styles.statSubText}>{history.length} TRACKS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DOWNLOADED</Text>
            <Text style={styles.statValue}>{formatFileSize(downloadsSizeBytes)}</Text>
            <Text style={styles.statSubText}>{downloads.length} TRACKS</Text>
          </View>
        </View>

        <View style={styles.buttonActionRow}>
          <TouchableOpacity
            style={[styles.outlineBtn, styles.flexBtn]}
            onPress={handleClearCache}
            activeOpacity={0.8}
          >
            <Feather name="trash-2" size={13} color={COLORS.white} />
            <Text style={styles.outlineBtnText}>CLEAR CACHE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerBtn, styles.flexBtn]}
            onPress={handleClearAllDownloads}
            activeOpacity={0.8}
          >
            <Feather name="trash" size={13} color={COLORS.error || '#FF453A'} />
            <Text style={styles.dangerBtnText}>CLEAR DOWNLOADS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Audio Playback & Quality Preferences */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Feather name="volume-2" size={15} color={COLORS.black} />
          </View>
          <Text style={styles.cardTitle}>AUDIO QUALITY & PLAYBACK</Text>
        </View>

        {/* Auto-Cache Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>Auto-Cache While Streaming</Text>
            <Text style={styles.settingSubLabel}>
              Automatically saves listened tracks to offline cache for zero-data replay.
            </Text>
          </View>
          <Switch
            value={autoCache}
            onValueChange={handleToggleAutoCache}
            trackColor={{ false: COLORS.border, true: COLORS.white }}
            thumbColor={COLORS.black}
          />
        </View>

        <View style={styles.divider} />

        {/* Default Download Format */}
        <View style={styles.settingTextCol}>
          <Text style={styles.settingLabel}>Preferred Download Format</Text>
          <Text style={styles.settingSubLabel}>
            Choose between highest fidelity master audio or universally compatible MP3.
          </Text>
        </View>

        <View style={styles.formatSelectorRow}>
          <TouchableOpacity
            style={[
              styles.formatChip,
              preferredFormat === 'mp4' && styles.formatChipActive,
            ]}
            onPress={() => handleSelectFormat('mp4')}
            activeOpacity={0.8}
          >
            <View style={styles.formatChipHeader}>
              <Ionicons
                name="sparkles"
                size={14}
                color={preferredFormat === 'mp4' ? COLORS.black : COLORS.white}
              />
              <Text
                style={[
                  styles.formatChipTitle,
                  preferredFormat === 'mp4' && styles.formatChipTitleActive,
                ]}
              >
                MP4 / M4A MASTER
              </Text>
            </View>
            <Text
              style={[
                styles.formatChipSub,
                preferredFormat === 'mp4' && styles.formatChipSubActive,
              ]}
            >
              256+ kbps AAC · Highest Clarity (~8 MB)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.formatChip,
              preferredFormat === 'mp3' && styles.formatChipActive,
            ]}
            onPress={() => handleSelectFormat('mp3')}
            activeOpacity={0.8}
          >
            <View style={styles.formatChipHeader}>
              <Feather
                name="music"
                size={14}
                color={preferredFormat === 'mp3' ? COLORS.black : COLORS.white}
              />
              <Text
                style={[
                  styles.formatChipTitle,
                  preferredFormat === 'mp3' && styles.formatChipTitleActive,
                ]}
              >
                MP3 STANDARD
              </Text>
            </View>
            <Text
              style={[
                styles.formatChipSub,
                preferredFormat === 'mp3' && styles.formatChipSubActive,
              ]}
            >
              192 kbps · Fast Download (~4 MB)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Stream Bitrate Selector */}
        <View style={styles.settingTextCol}>
          <Text style={styles.settingLabel}>Streaming Bitrate Quality</Text>
          <Text style={styles.settingSubLabel}>
            Maximum audio stream resolution retrieved from audio engine.
          </Text>
        </View>

        <View style={styles.qualitySelectorRow}>
          {[
            { key: 'master', label: '256+ kbps', desc: 'Master / Hi-Res' },
            { key: 'high', label: '192 kbps', desc: 'Standard CD' },
            { key: 'eco', label: '128 kbps', desc: 'Data Saver' },
          ].map((item) => {
            const isSelected = quality === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.qualityChip, isSelected && styles.qualityChipActive]}
                onPress={() => handleSelectQuality(item.key as AudioQuality)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.qualityChipLabel, isSelected && styles.qualityChipLabelActive]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[styles.qualityChipDesc, isSelected && styles.qualityChipDescActive]}
                >
                  {item.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Library Features Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Feather name="layers" size={15} color={COLORS.black} />
          </View>
          <Text style={styles.cardTitle}>FEATURES & EXPLORATION</Text>
        </View>

        <View style={styles.featureItemRow}>
          <Feather name="calendar" size={16} color={COLORS.white} />
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>Upload Year Categorization</Text>
            <Text style={styles.featureDesc}>
              Discover and Search automatically group songs and albums by release year.
            </Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>ACTIVE</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.featureItemRow}>
          <Feather name="edit-3" size={16} color={COLORS.white} />
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>Full Library CRUD</Text>
            <Text style={styles.featureDesc}>
              Rename songs and attach personal tags/memos to History, Saved, and Downloads.
            </Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>ENABLED</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.featureItemRow}>
          <Feather name="shield" size={16} color={COLORS.white} />
          <View style={styles.featureTextCol}>
            <Text style={styles.featureTitle}>Native Expo Audio Engine</Text>
            <Text style={styles.featureDesc}>
              Low latency, background audio playback with gapless buffering.
            </Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>NATIVE</Text>
          </View>
        </View>
      </View>

      {/* About The App Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Feather name="info" size={15} color={COLORS.black} />
          </View>
          <Text style={styles.cardTitle}>ABOUT THE APP</Text>
        </View>

        <View style={styles.aboutHero}>
          <View style={styles.appLogoCircle}>
            <Feather name="headphones" size={26} color={COLORS.black} />
          </View>
          <Text style={styles.appHeroTitle}>MSEEK MUSIC</Text>
          <Text style={styles.appHeroVersion}>Version 2.0.0 (Biotrip Edition)</Text>
          <Text style={styles.appHeroBadge}>OFFLINE-FIRST AUDIO PLAYER</Text>
        </View>

        <Text style={styles.aboutParagraph}>
          Mseek Music is a lightweight, offline-first music streaming and downloading application. Designed with a strict minimalist monochrome aesthetic, it lets you explore music categorized by upload year, cache streams seamlessly for offline listening, and permanently download master-quality audio files.
        </Text>

        <View style={styles.specsContainer}>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>ENGINE</Text>
            <Text style={styles.specValue}>Expo Audio 57 & Native Core</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>FORMATS</Text>
            <Text style={styles.specValue}>MP3 (192 kbps) & MP4/M4A (256+ kbps AAC)</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>CATEGORIZATION</Text>
            <Text style={styles.specValue}>Year Uploaded Auto-Grouping</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>DESIGN</Text>
            <Text style={styles.specValue}>Strict Monochrome (Biotrip Serif)</Text>
          </View>
        </View>
      </View>

      {/* Developer Credit Footer Card */}
      <View style={styles.developerCard}>
        <View style={styles.developerContent}>
          <View style={styles.developerIconCircle}>
            <Feather name="code" size={18} color={COLORS.black} />
          </View>

          <View style={styles.developerTextCol}>
            <Text style={styles.developerTag}>DEVELOPED & CRAFTED BY</Text>
            <Text style={styles.developerName}>Junrey Gonzales</Text>
            <Text style={styles.developerRole}>Lead Mobile Architect & Engineer</Text>
          </View>
        </View>

        <View style={styles.developerDivider} />

        <View style={styles.developerBottomRow}>
          <Text style={styles.copyrightText}>
            © 2026 Junrey Gonzales · All rights reserved.
          </Text>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>PRODUCTION READY</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 16,
  },
  headerSection: {
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 3,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 14,
    fontFamily: FONTS.serifBold,
    color: COLORS.white,
    fontWeight: '700',
  },
  statSubText: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  buttonActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  flexBtn: {
    flex: 1,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outlineBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.8,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  dangerBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.error || '#FF453A',
    letterSpacing: 0.8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingTextCol: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 13,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
  },
  settingSubLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  formatSelectorRow: {
    gap: 8,
    marginTop: 2,
  },
  formatChip: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  formatChipActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  formatChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formatChipTitle: {
    fontSize: 11,
    fontFamily: FONTS.serifBold,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.8,
  },
  formatChipTitleActive: {
    color: COLORS.black,
  },
  formatChipSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginLeft: 22,
  },
  formatChipSubActive: {
    color: '#333333',
    fontWeight: '600',
  },
  qualitySelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  qualityChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 2,
  },
  qualityChipActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  qualityChipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  qualityChipLabelActive: {
    color: COLORS.black,
  },
  qualityChipDesc: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  qualityChipDescActive: {
    color: '#333333',
    fontWeight: '700',
  },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  featureTextCol: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 12,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
  },
  featureDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 14,
  },
  featurePill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  featurePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  aboutHero: {
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  appLogoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appHeroTitle: {
    fontSize: 22,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },
  appHeroVersion: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  appHeroBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.black,
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 1,
    marginTop: 2,
  },
  aboutParagraph: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  specsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 10,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 2,
  },
  specLabel: {
    width: 95,
    flexShrink: 0,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  specValue: {
    flex: 1,
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 16,
  },
  developerCard: {
    backgroundColor: '#0E0E0E',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    padding: 18,
    gap: 14,
  },
  developerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  developerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  developerTextCol: {
    flex: 1,
    gap: 2,
  },
  developerTag: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  developerName: {
    fontSize: 20,
    fontFamily: FONTS.serifBold,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  developerRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  developerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  developerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  copyrightText: {
    fontSize: 10,
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  onlineText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});
