import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Scrubber } from './Scrubber';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import { useAudio } from '../context/AudioContext';
import { useDownloads } from '../context/DownloadContext';
import { useSaved } from '../context/SavedContext';
import { formatDuration, get720pThumbnail } from '../utils/formatters';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(width - 64, 320);

export const PlayerModal: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    position,
    duration,
    queue,
    isShuffle,
    isRepeat,
    isModalVisible,
    closeModal,
    togglePlayPause,
    seekTo,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleRepeat,
    playTrack,
  } = useAudio();

  const { isDownloaded, promptDownload, activeTasks } = useDownloads();
  const { isSaved, toggleSaveTrack } = useSaved();
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [sliderVal, setSliderVal] = useState<number>(0);

  if (!currentTrack) return null;

  const isDl = isDownloaded(currentTrack.id) || currentTrack.isDownloaded;
  const isCached = currentTrack.isCached || !!currentTrack.localUri;
  const isOfflineAudio = isDl || isCached;

  const handleSliderChange = (val: number) => {
    setIsSliding(true);
    setSliderVal(val);
  };

  const handleSlidingComplete = async (val: number) => {
    setIsSliding(false);
    await seekTo(val);
  };

  const currentPos = isSliding ? sliderVal : position;

  return (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeModal}
    >
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={closeModal}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="chevron-down" size={26} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>NOW PLAYING</Text>
            {isOfflineAudio && (
              <View style={styles.offlinePill}>
                <Feather name="zap" size={10} color={COLORS.black} />
                <Text style={styles.offlinePillText}>OFFLINE AUDIO</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowQueue(!showQueue)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather
              name={showQueue ? 'disc' : 'list'}
              size={22}
              color={showQueue ? COLORS.white : COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {showQueue ? (
          /* Up Next Queue List */
          <View style={styles.queueContainer}>
            <Text style={styles.queueTitle}>PLAYING QUEUE ({queue.length})</Text>
            <FlatList
              data={queue}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={({ item }) => {
                const isSelected = item.id === currentTrack.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.queueItem,
                      isSelected && styles.queueItemSelected,
                    ]}
                    onPress={() => playTrack(item)}
                  >
                    <View style={styles.queueThumb}>
                      {item.thumbnail ? (
                        <Image
                          source={{ uri: get720pThumbnail(item.thumbnail) || item.thumbnail }}
                          style={styles.queueThumbImg}
                        />
                      ) : (
                        <Feather name="headphones" size={14} color={COLORS.white} />
                      )}
                    </View>
                    <View style={styles.queueInfo}>
                      <Text
                        style={[
                          styles.queueTrackTitle,
                          isSelected && styles.queueTrackTitleSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.queueArtist} numberOfLines={1}>
                        {item.artists.join(', ')}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name={isPlaying ? 'volume-high' : 'pause'}
                        size={18}
                        color={COLORS.white}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        ) : (
          /* Main Player Body */
          <View style={styles.playerBody}>
            {/* Vinyl / Cover Artwork */}
            <View style={styles.artFrame}>
              <View style={styles.artOuterRim}>
                {currentTrack.thumbnail ? (
                  <Image
                    source={{ uri: get720pThumbnail(currentTrack.thumbnail) || currentTrack.thumbnail }}
                    style={styles.artwork}
                  />
                ) : (
                  <View style={styles.artworkFallback}>
                    <Feather name="headphones" size={64} color={COLORS.white} />
                  </View>
                )}
              </View>
            </View>

            {/* Song Meta */}
            <View style={styles.metaRow}>
              <View style={styles.metaTextCol}>
                <Text style={styles.trackTitle} numberOfLines={2}>
                  {currentTrack.title}
                </Text>
                <View style={styles.artistMetaRow}>
                  <Text style={styles.artistName} numberOfLines={1}>
                    {currentTrack.artists.join(', ')}
                  </Text>
                  {currentTrack.year ? (
                    <View style={styles.yearPill}>
                      <Text style={styles.yearPillText}>{currentTrack.year}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.metaActionsCol}>
                <TouchableOpacity
                  style={styles.heartButton}
                  onPress={() => toggleSaveTrack(currentTrack)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isSaved(currentTrack.id) || currentTrack.isSaved ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isSaved(currentTrack.id) || currentTrack.isSaved ? '#FF3B30' : COLORS.white}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.downloadPill, isDl && styles.downloadPillDone]}
                  onPress={() => promptDownload(currentTrack)}
                  disabled={isDl || !!activeTasks[currentTrack.id]}
                >
                  {activeTasks[currentTrack.id] ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Feather
                      name={isDl ? 'check' : 'download'}
                      size={14}
                      color={isDl ? COLORS.black : COLORS.white}
                    />
                  )}
                  <Text
                    style={[
                      styles.downloadPillText,
                      isDl && styles.downloadPillTextDone,
                    ]}
                  >
                    {isDl ? 'DOWNLOADED' : activeTasks[currentTrack.id] ? `${Math.round((activeTasks[currentTrack.id]?.progress || 0) * 100)}%` : 'DOWNLOAD'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrubber Slider */}
            <View style={styles.sliderContainer}>
              <Scrubber
                value={currentPos}
                maximumValue={Math.max(duration, 1)}
                onValueChange={handleSliderChange}
                onSlidingComplete={handleSlidingComplete}
              />
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatDuration(currentPos)}</Text>
                <Text style={styles.timeText}>{formatDuration(duration)}</Text>
              </View>
            </View>

            {/* Playback Controls */}
            <View style={styles.controlsBar}>
              <TouchableOpacity
                style={styles.subControl}
                onPress={toggleShuffle}
              >
                <Feather
                  name="shuffle"
                  size={20}
                  color={isShuffle ? COLORS.white : COLORS.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.subControl} onPress={prevTrack}>
                <Ionicons
                  name="play-skip-back"
                  size={26}
                  color={COLORS.white}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playMainButton}
                onPress={togglePlayPause}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.black} />
                ) : (
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={32}
                    color={COLORS.black}
                    style={!isPlaying ? { marginLeft: 3 } : undefined}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.subControl} onPress={nextTrack}>
                <Ionicons
                  name="play-skip-forward"
                  size={26}
                  color={COLORS.white}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.subControl} onPress={toggleRepeat}>
                <Feather
                  name="repeat"
                  size={20}
                  color={isRepeat ? COLORS.white : COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? 28 : 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 2,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  offlinePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  playerBody: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-evenly',
    paddingBottom: 24,
  },
  artFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  artOuterRim: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.card,
    shadowColor: '#000000',
    shadowOpacity: 0.9,
    shadowRadius: 15,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  metaTextCol: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: 22,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  artistName: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  artistMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yearPill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  yearPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  metaActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heartButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  downloadPillDone: {
    backgroundColor: COLORS.white,
  },
  downloadPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  downloadPillTextDone: {
    color: COLORS.black,
  },
  sliderContainer: {
    width: '100%',
    marginVertical: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  subControl: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playMainButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueContainer: {
    flex: 1,
    padding: 20,
  },
  queueTitle: {
    fontSize: 14,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  queueItemSelected: {
    backgroundColor: COLORS.cardHighlight,
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  queueThumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  queueThumbImg: {
    width: '100%',
    height: '100%',
  },
  queueInfo: {
    flex: 1,
  },
  queueTrackTitle: {
    fontSize: 14,
    fontFamily: FONTS.serifBold,
    color: COLORS.white,
  },
  queueTrackTitleSelected: {
    color: COLORS.white,
    textDecorationLine: 'underline',
  },
  queueArtist: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
