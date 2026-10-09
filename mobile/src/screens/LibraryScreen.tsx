import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useDownloads } from '../context/DownloadContext';
import { useHistory } from '../context/HistoryContext';
import { useSaved } from '../context/SavedContext';
import { Track } from '../types';
import { COLORS, FONTS } from '../constants/theme';
import { TrackCard } from '../components/TrackCard';
import { formatFileSize } from '../utils/formatters';

type LibraryTab = 'history' | 'saved' | 'downloaded' | 'tasks';

export const LibraryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('history');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Contexts
  const {
    downloads,
    activeTasks,
    downloadsSizeBytes,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
    deleteTrack,
    clearAllDownloads,
    updateDownloadedTrack,
  } = useDownloads();

  const {
    history,
    cacheSizeBytes,
    clearHistoryCache,
    deleteHistoryItem,
    updateHistoryTrack,
  } = useHistory();

  const {
    savedTracks,
    removeSavedTrack,
    clearAllSaved,
    updateSavedTrack,
  } = useSaved();

  // Edit Modal State
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  const activeTaskCount = Object.keys(activeTasks).length;

  // Determine active raw list
  const currentList = useMemo(() => {
    switch (activeTab) {
      case 'history':
        return history;
      case 'saved':
        return savedTracks;
      case 'downloaded':
        return downloads;
      default:
        return [];
    }
  }, [activeTab, history, savedTracks, downloads]);

  // Extract unique years from the active list
  const availableYears = useMemo(() => {
    const yearCounts: Record<string, number> = {};
    currentList.forEach((track) => {
      const y = track.year ? String(track.year).trim() : 'Unknown';
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    });

    const sortedYears = Object.keys(yearCounts).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return b.localeCompare(a);
    });

    return sortedYears.map((year) => ({
      year,
      count: yearCounts[year],
    }));
  }, [currentList]);

  // Filtered tracks based on search and selected year
  const filteredList = useMemo(() => {
    return currentList.filter((track) => {
      const matchesYear =
        selectedYear === 'ALL' ||
        (selectedYear === 'Unknown' && !track.year) ||
        String(track.year) === selectedYear;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        track.title.toLowerCase().includes(q) ||
        track.artists.some((a) => a.toLowerCase().includes(q)) ||
        (track.customNote && track.customNote.toLowerCase().includes(q));

      return matchesYear && matchesSearch;
    });
  }, [currentList, selectedYear, searchQuery]);

  // Reset year & search when switching tabs
  const handleTabChange = (tab: LibraryTab) => {
    setActiveTab(tab);
    setSelectedYear('ALL');
    setSearchQuery('');
  };

  // Open Edit Modal
  const handleOpenEdit = (track: Track) => {
    setEditingTrack(track);
    setEditTitle(track.title);
    setEditNote(track.customNote || '');
  };

  // Save Edit Changes (CRUD Update)
  const handleSaveEdit = async () => {
    if (!editingTrack) return;
    const trimmedTitle = editTitle.trim() || editingTrack.title;
    const trimmedNote = editNote.trim();

    try {
      if (activeTab === 'history') {
        await updateHistoryTrack(editingTrack.id, {
          title: trimmedTitle,
          customNote: trimmedNote,
        });
      } else if (activeTab === 'saved') {
        await updateSavedTrack(editingTrack.id, {
          title: trimmedTitle,
          customNote: trimmedNote,
        });
      } else if (activeTab === 'downloaded') {
        await updateDownloadedTrack(editingTrack.id, {
          title: trimmedTitle,
          customNote: trimmedNote,
        });
      }
    } catch (err) {
      console.warn('Failed to update track:', err);
    } finally {
      setEditingTrack(null);
    }
  };

  // Delete Individual Item (CRUD Delete)
  const handleDeleteItem = (track: Track) => {
    let title = 'Delete Track?';
    let message = `Are you sure you want to remove "${track.title}"?`;

    if (activeTab === 'downloaded') {
      title = 'Delete Downloaded File?';
      message = `This will permanently delete "${track.title}" from your device storage.`;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (activeTab === 'history') {
            await deleteHistoryItem(track.id);
          } else if (activeTab === 'saved') {
            await removeSavedTrack(track.id);
          } else if (activeTab === 'downloaded') {
            await deleteTrack(track.id);
          }
        },
      },
    ]);
  };

  // Clear All Confirmation (CRUD Delete All)
  const handleClearAll = () => {
    if (activeTab === 'history') {
      Alert.alert(
        'Clear Playback History?',
        'This will clear offline cached stream files. Permanently downloaded songs will remain untouched.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear History',
            style: 'destructive',
            onPress: async () => {
              await clearHistoryCache();
            },
          },
        ]
      );
    } else if (activeTab === 'saved') {
      Alert.alert(
        'Clear All Saved?',
        'This will remove all songs from your saved favorites list.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All',
            style: 'destructive',
            onPress: async () => {
              await clearAllSaved();
            },
          },
        ]
      );
    } else if (activeTab === 'downloaded') {
      Alert.alert(
        'Clear All Downloads?',
        'This will delete all permanently downloaded songs from device storage to free up space.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: async () => {
              await clearAllDownloads();
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Switcher - Horizontal Scrollable Pills */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'history' && styles.tabPillActive]}
            onPress={() => handleTabChange('history')}
            activeOpacity={0.8}
          >
            <Feather
              name="clock"
              size={13}
              color={activeTab === 'history' ? COLORS.black : COLORS.textMuted}
            />
            <Text style={[styles.tabPillText, activeTab === 'history' && styles.tabPillTextActive]}>
              HISTORY ({history.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'saved' && styles.tabPillActive]}
            onPress={() => handleTabChange('saved')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="heart"
              size={13}
              color={activeTab === 'saved' ? COLORS.black : COLORS.textMuted}
            />
            <Text style={[styles.tabPillText, activeTab === 'saved' && styles.tabPillTextActive]}>
              SAVED ({savedTracks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'downloaded' && styles.tabPillActive]}
            onPress={() => handleTabChange('downloaded')}
            activeOpacity={0.8}
          >
            <Feather
              name="download"
              size={13}
              color={activeTab === 'downloaded' ? COLORS.black : COLORS.textMuted}
            />
            <Text style={[styles.tabPillText, activeTab === 'downloaded' && styles.tabPillTextActive]}>
              DOWNLOADED ({downloads.length})
            </Text>
          </TouchableOpacity>

          {activeTaskCount > 0 && (
            <TouchableOpacity
              style={[styles.tabPill, activeTab === 'tasks' && styles.tabPillActive]}
              onPress={() => handleTabChange('tasks')}
              activeOpacity={0.8}
            >
              <Feather
                name="loader"
                size={13}
                color={activeTab === 'tasks' ? COLORS.black : COLORS.textMuted}
              />
              <Text style={[styles.tabPillText, activeTab === 'tasks' && styles.tabPillTextActive]}>
                TASKS ({activeTaskCount})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Main Content */}
      {activeTab === 'tasks' ? (
        /* ACTIVE DOWNLOAD TASKS TAB */
        <View style={styles.tabContent}>
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>
              {activeTaskCount} DOWNLOADING TASKS IN PROGRESS
            </Text>
          </View>
          <FlatList
            data={Object.values(activeTasks)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskTitleCol}>
                    <Text style={styles.taskTitle} numberOfLines={1}>
                      {item.track.title}
                    </Text>
                    <Text style={styles.taskArtists} numberOfLines={1}>
                      {item.track.artists?.join(', ')}
                    </Text>
                  </View>
                  <View style={styles.taskRightMeta}>
                    <View style={styles.taskFormatBadge}>
                      <Text style={styles.taskFormatText}>{(item.format || 'mp3').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.taskPercent}>
                      {Math.round(item.progress * 100)}%
                    </Text>
                  </View>
                </View>

                {/* Status and Size Text */}
                <View style={styles.taskStatusRow}>
                  <Text style={styles.taskStatusText}>
                    {item.status === 'paused'
                      ? 'PAUSED'
                      : item.status === 'failed'
                      ? 'DOWNLOAD FAILED'
                      : 'DOWNLOADING'}
                  </Text>
                  {item.bytesWritten > 0 ? (
                    <Text style={styles.taskSizeText}>
                      {formatFileSize(item.bytesWritten)}
                      {item.totalBytes > 0 ? ` / ${formatFileSize(item.totalBytes)}` : ''}
                    </Text>
                  ) : null}
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      item.status === 'paused' && styles.progressFillPaused,
                      item.status === 'failed' && styles.progressFillFailed,
                      { width: `${Math.round(item.progress * 100)}%` },
                    ]}
                  />
                </View>

                {/* Action Buttons: Pause / Resume / Cancel */}
                <View style={styles.taskActionRow}>
                  {item.status === 'paused' ? (
                    <TouchableOpacity
                      style={[styles.taskActionBtn, styles.taskResumeBtn]}
                      onPress={() => resumeDownload(item.id)}
                      activeOpacity={0.8}
                    >
                      <Feather name="play" size={13} color={COLORS.black} />
                      <Text style={styles.taskResumeBtnText}>RESUME</Text>
                    </TouchableOpacity>
                  ) : item.status === 'failed' ? (
                    <TouchableOpacity
                      style={styles.taskActionBtn}
                      onPress={() => retryDownload(item.id)}
                      activeOpacity={0.8}
                    >
                      <Feather name="refresh-cw" size={13} color={COLORS.white} />
                      <Text style={styles.taskActionBtnText}>RETRY</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.taskActionBtn}
                      onPress={() => pauseDownload(item.id)}
                      activeOpacity={0.8}
                    >
                      <Feather name="pause" size={13} color={COLORS.white} />
                      <Text style={styles.taskActionBtnText}>PAUSE</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.taskCancelBtn}
                    onPress={() => cancelDownload(item.id)}
                    activeOpacity={0.8}
                  >
                    <Feather name="x" size={13} color={COLORS.error || '#FF453A'} />
                    <Text style={styles.taskCancelBtnText}>CANCEL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      ) : (
        /* CRUD TABS: HISTORY / SAVED / DOWNLOADED */
        <View style={styles.tabContent}>
          {/* Top Search Input */}
          <View style={styles.searchBar}>
            <Feather name="search" size={15} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search in ${activeTab.toUpperCase()}...`}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Feather name="x" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Year Categorization Filter Chips */}
          <View style={styles.yearFilterWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearScroll}
            >
              <TouchableOpacity
                style={[
                  styles.yearChip,
                  selectedYear === 'ALL' && styles.yearChipActive,
                ]}
                onPress={() => setSelectedYear('ALL')}
              >
                <Text
                  style={[
                    styles.yearChipText,
                    selectedYear === 'ALL' && styles.yearChipTextActive,
                  ]}
                >
                  ALL YEARS ({currentList.length})
                </Text>
              </TouchableOpacity>

              {availableYears.map(({ year, count }) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearChip,
                    selectedYear === year && styles.yearChipActive,
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text
                    style={[
                      styles.yearChipText,
                      selectedYear === year && styles.yearChipTextActive,
                    ]}
                  >
                    {year} ({count})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Summary / Stats / Clear All Bar */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryText}>
                {filteredList.length} {filteredList.length === 1 ? 'TRACK' : 'TRACKS'}
                {selectedYear !== 'ALL' ? ` · YEAR ${selectedYear}` : ''}
              </Text>
              {activeTab === 'history' && cacheSizeBytes > 0 && (
                <Text style={styles.metaSubText}>
                  Cache: {formatFileSize(cacheSizeBytes)}
                </Text>
              )}
              {activeTab === 'downloaded' && downloadsSizeBytes > 0 && (
                <Text style={styles.metaSubText}>
                  Storage: {formatFileSize(downloadsSizeBytes)}
                </Text>
              )}
            </View>

            {currentList.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
                <Feather name="trash" size={13} color={COLORS.error || '#FF453A'} />
                <Text style={styles.clearAllBtnText}>CLEAR ALL</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Track List with Full CRUD */}
          <FlatList
            data={filteredList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TrackCard
                track={item}
                queueContext={filteredList}
                showDownloadButton={activeTab !== 'downloaded'}
                showSaveButton={true}
                showDeleteButton={true}
                onDelete={() => handleDeleteItem(item)}
                onEdit={() => handleOpenEdit(item)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather
                  name={
                    activeTab === 'history'
                      ? 'clock'
                      : activeTab === 'saved'
                      ? 'heart'
                      : 'download-cloud'
                  }
                  size={46}
                  color={COLORS.textMuted}
                />
                <Text style={styles.emptyTitle}>
                  {searchQuery || selectedYear !== 'ALL'
                    ? 'NO MATCHING TRACKS FOUND'
                    : activeTab === 'history'
                    ? 'NO PLAY HISTORY YET'
                    : activeTab === 'saved'
                    ? 'NO SAVED TRACKS YET'
                    : 'NO DOWNLOADED TRACKS YET'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery || selectedYear !== 'ALL'
                    ? 'Try adjusting your year categorization filter or search keywords.'
                    : activeTab === 'history'
                    ? 'Listen to any song in Search or Discover and it will automatically appear here with offline playback caching!'
                    : activeTab === 'saved'
                    ? 'Tap the heart icon on any song to bookmark it in your favorites collection.'
                    : 'Tap the download icon on any song to save the complete audio file permanently to device storage.'}
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* CRUD Update Modal: Edit Title & Custom Note */}
      <Modal
        visible={!!editingTrack}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingTrack(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Feather name="edit-2" size={16} color={COLORS.white} />
                <Text style={styles.modalTitle}>EDIT TRACK DETAILS</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditingTrack(null)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>SONG TITLE</Text>
              <TextInput
                style={styles.modalInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Enter custom title"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>PERSONAL NOTE / TAG</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMulti]}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="e.g. Favorite workout beat, Chill vibes, 2026 replay"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />

              {editingTrack?.year ? (
                <View style={styles.modalMetaRow}>
                  <Text style={styles.modalMetaKey}>UPLOAD YEAR:</Text>
                  <Text style={styles.modalMetaVal}>{editingTrack.year}</Text>
                </View>
              ) : null}

              {editingTrack?.duration ? (
                <View style={styles.modalMetaRow}>
                  <Text style={styles.modalMetaKey}>DURATION:</Text>
                  <Text style={styles.modalMetaVal}>{editingTrack.duration}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingTrack(null)}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalSaveText}>SAVE CHANGES</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  tabBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
    paddingVertical: 10,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  tabPillTextActive: {
    color: COLORS.black,
  },
  tabContent: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 36,
    color: COLORS.white,
    fontSize: 12,
  },
  clearSearchBtn: {
    padding: 4,
  },
  yearFilterWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },
  yearScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  yearChipActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  yearChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  yearChipTextActive: {
    color: COLORS.black,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryText: {
    fontSize: 11,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },
  metaSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  clearAllBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.error || '#FF453A',
    letterSpacing: 0.8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 56,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  taskCard: {
    padding: 14,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 4,
    gap: 10,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  taskTitleCol: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    fontSize: 13,
    fontFamily: FONTS.serifBold,
    color: COLORS.white,
  },
  taskArtists: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  taskRightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskFormatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskFormatText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  taskPercent: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '800',
  },
  taskStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  taskSizeText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 5,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
  },
  progressFillPaused: {
    backgroundColor: '#FF9F0A',
  },
  progressFillFailed: {
    backgroundColor: COLORS.error || '#FF453A',
  },
  taskActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  taskActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskActionBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  taskResumeBtn: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  taskResumeBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  taskCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  taskCancelBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.error || '#FF453A',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 13,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  modalInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.white,
    fontSize: 13,
  },
  modalInputMulti: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  modalMetaKey: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  modalMetaVal: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  modalSaveBtn: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  modalSaveText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.black,
    letterSpacing: 0.8,
  },
});
