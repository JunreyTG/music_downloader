import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { musicApi } from '../api/client';
import { ReleaseItem, Track } from '../types';
import { COLORS, FONTS } from '../constants/theme';
import { ReleaseCard } from '../components/ReleaseCard';
import { TrackCard } from '../components/TrackCard';
import { get720pThumbnail } from '../utils/formatters';

export const DiscoverScreen: React.FC = () => {
  const [newReleases, setNewReleases] = useState<ReleaseItem[]>([]);
  const [trending, setTrending] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Selected album modal
  const [selectedAlbum, setSelectedAlbum] = useState<ReleaseItem | null>(null);
  const [albumTracks, setAlbumTracks] = useState<Track[]>([]);
  const [loadingAlbum, setLoadingAlbum] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [releasesData, trendingData] = await Promise.all([
        musicApi.getNewReleases(),
        musicApi.getTrending(),
      ]);
      setNewReleases(releasesData);
      setTrending(trendingData);
    } catch (err) {
      console.warn('Failed to load discover data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openAlbumDetails = async (item: ReleaseItem) => {
    setSelectedAlbum(item);
    setLoadingAlbum(true);
    try {
      const tracks = await musicApi.getAlbumTracks(item.id);
      // Ensure each track inherits the album release year if not present
      const tracksWithYear = tracks.map((t) => ({
        ...t,
        year: t.year || item.year,
      }));
      setAlbumTracks(tracksWithYear);
    } catch {
      setAlbumTracks([]);
    } finally {
      setLoadingAlbum(false);
    }
  };

  // Extract unique years from releases and trending for categorization chips
  const availableYears = useMemo(() => {
    const yearCounts: Record<string, number> = {};

    newReleases.forEach((item) => {
      if (item.year) {
        const y = String(item.year).trim();
        yearCounts[y] = (yearCounts[y] || 0) + 1;
      }
    });

    trending.forEach((item) => {
      if (item.year) {
        const y = String(item.year).trim();
        yearCounts[y] = (yearCounts[y] || 0) + 1;
      }
    });

    const sorted = Object.keys(yearCounts).sort((a, b) => b.localeCompare(a));
    return sorted.map((year) => ({
      year,
      count: yearCounts[year],
    }));
  }, [newReleases, trending]);

  // Group Albums & EPs into Year Categorized Sections
  const releasesByYearSections = useMemo(() => {
    const groups: Record<string, ReleaseItem[]> = {};
    const listToGroup =
      selectedYear === 'ALL'
        ? newReleases
        : newReleases.filter((r) => String(r.year) === selectedYear);

    listToGroup.forEach((item) => {
      const y = item.year ? String(item.year).trim() : 'Unknown';
      if (!groups[y]) groups[y] = [];
      groups[y].push(item);
    });

    const sortedYears = Object.keys(groups).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return b.localeCompare(a);
    });

    return sortedYears.map((year) => ({
      year,
      title: year === 'Unknown' ? 'OTHER ALBUMS & RELEASES' : `${year} ALBUMS & RELEASES`,
      items: groups[year],
    }));
  }, [newReleases, selectedYear]);

  // Group Trending Songs into Year Categorized Sections
  const trendingByYearSections = useMemo(() => {
    const groups: Record<string, Track[]> = {};
    const listToGroup =
      selectedYear === 'ALL'
        ? trending
        : trending.filter((t) => String(t.year) === selectedYear);

    listToGroup.forEach((track) => {
      const y = track.year ? String(track.year).trim() : 'Unknown';
      if (!groups[y]) groups[y] = [];
      groups[y].push(track);
    });

    const sortedYears = Object.keys(groups).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return b.localeCompare(a);
    });

    return sortedYears.map((year) => ({
      year,
      title: year === 'Unknown' ? 'CLASSICS & PRIOR YEARS' : `${year} TRENDING SONGS`,
      tracks: groups[year],
    }));
  }, [trending, selectedYear]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.white} />
        <Text style={styles.loadingText}>FETCHING NEW RELEASES & TRENDING...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.white}
          colors={[COLORS.white]}
        />
      }
    >
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroContent}>
          <Text style={styles.heroPretitle}>YOUTUBE MUSIC EXPLORE</Text>
          <Text style={styles.heroTitle}>New Releases</Text>
          <Text style={styles.heroSubtitle}>
            Fresh tracks and albums categorized according to upload year
          </Text>
        </View>
      </View>

      {/* Year Categorization Filter Chips */}
      <View style={styles.yearFilterSection}>
        <View style={styles.yearFilterHeader}>
          <Feather name="calendar" size={13} color={COLORS.textMuted} />
          <Text style={styles.yearFilterLabel}>CATEGORIZE BY YEAR UPLOADED</Text>
        </View>
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
              ALL YEARS ({newReleases.length + trending.length})
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

      {/* Categorized Albums & Releases Section */}
      <View style={styles.mainSection}>
        <View style={styles.mainSectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Feather name="disc" size={16} color={COLORS.white} />
            <Text style={styles.mainSectionTitle}>NEW ALBUMS & RELEASES</Text>
          </View>
        </View>

        {releasesByYearSections.length > 0 ? (
          releasesByYearSections.map((sec) => (
            <View key={sec.year} style={styles.yearGroupSection}>
              <View style={styles.yearSubHeader}>
                <View style={styles.yearBadgeBox}>
                  <Text style={styles.yearBadgeBoxText}>{sec.year}</Text>
                </View>
                <Text style={styles.yearSubTitle}>{sec.title}</Text>
                <Text style={styles.yearItemCount}>{sec.items.length} ALBUMS</Text>
              </View>

              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={sec.items}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={({ item }) => (
                  <ReleaseCard item={item} onPress={() => openAlbumDetails(item)} />
                )}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No albums found for {selectedYear}. Select another year or pull down to refresh.
            </Text>
          </View>
        )}
      </View>

      {/* Categorized Trending Songs Section */}
      <View style={styles.mainSection}>
        <View style={styles.mainSectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Feather name="trending-up" size={16} color={COLORS.white} />
            <Text style={styles.mainSectionTitle}>TRENDING SONGS BY YEAR</Text>
          </View>
        </View>

        {trendingByYearSections.length > 0 ? (
          trendingByYearSections.map((sec) => (
            <View key={sec.year} style={styles.yearGroupSection}>
              <View style={styles.yearSubHeader}>
                <View style={styles.yearBadgeBox}>
                  <Text style={styles.yearBadgeBoxText}>{sec.year}</Text>
                </View>
                <Text style={styles.yearSubTitle}>{sec.title}</Text>
                <Text style={styles.yearItemCount}>{sec.tracks.length} SONGS</Text>
              </View>

              {sec.tracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  queueContext={trending}
                  showDownloadButton={true}
                  showSaveButton={true}
                />
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No trending songs found for {selectedYear}.
            </Text>
          </View>
        )}
      </View>

      {/* Album Tracks Modal */}
      <Modal
        visible={!!selectedAlbum}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedAlbum(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedAlbum(null)}
              style={styles.closeBtn}
            >
              <Feather name="x" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderText} numberOfLines={1}>
              {selectedAlbum?.title}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedAlbum && (
            <View style={styles.albumHero}>
              {selectedAlbum.thumbnail ? (
                <Image
                  source={{ uri: get720pThumbnail(selectedAlbum.thumbnail) || selectedAlbum.thumbnail }}
                  style={styles.albumCover}
                />
              ) : null}
              <Text style={styles.albumTitle}>{selectedAlbum.title}</Text>
              <Text style={styles.albumArtist}>{selectedAlbum.artists.join(', ')}</Text>
              <View style={styles.albumMetaBadgeRow}>
                {selectedAlbum.year ? (
                  <View style={styles.albumYearPill}>
                    <Text style={styles.albumYearText}>{selectedAlbum.year}</Text>
                  </View>
                ) : null}
                <Text style={styles.albumType}>{selectedAlbum.type.toUpperCase()}</Text>
              </View>
            </View>
          )}

          {loadingAlbum ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={COLORS.white} />
              <Text style={styles.loadingText}>LOADING ALBUM TRACKS...</Text>
            </View>
          ) : (
            <FlatList
              data={albumTracks}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              renderItem={({ item }) => (
                <TrackCard
                  track={item}
                  queueContext={albumTracks}
                  showDownloadButton={true}
                  showSaveButton={true}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No individual tracks found for this release.</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingBottom: 56,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    padding: 20,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.serifBold,
    letterSpacing: 1.5,
    marginTop: 12,
  },
  heroBanner: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  heroContent: {
    gap: 4,
  },
  heroPretitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  yearFilterSection: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
  },
  yearFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  yearFilterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
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
  mainSection: {
    marginTop: 20,
  },
  mainSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainSectionTitle: {
    fontSize: 13,
    fontFamily: FONTS.serifBold,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1.2,
  },
  yearGroupSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  yearSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  yearBadgeBox: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  yearBadgeBoxText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  yearSubTitle: {
    fontSize: 12,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.8,
    flex: 1,
  },
  yearItemCount: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  horizontalList: {
    paddingRight: 16,
  },
  emptyCard: {
    marginHorizontal: 16,
    padding: 24,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    padding: 4,
  },
  modalHeaderText: {
    fontSize: 15,
    fontFamily: FONTS.serifBold,
    color: COLORS.white,
    maxWidth: 240,
  },
  albumHero: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 10,
  },
  albumCover: {
    width: 140,
    height: 140,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  albumTitle: {
    fontSize: 18,
    fontFamily: FONTS.serifBold,
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  albumArtist: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  albumMetaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  albumYearPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  albumYearText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  albumType: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
});
