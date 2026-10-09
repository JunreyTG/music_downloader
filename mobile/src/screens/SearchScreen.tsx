import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { musicApi } from '../api/client';
import { Track } from '../types';
import { COLORS, FONTS } from '../constants/theme';
import { TrackCard } from '../components/TrackCard';

const POPULAR_TAGS = ['Taylor Swift', 'Coldplay', 'Billie Eilish', 'The Weeknd', 'Drake', 'Lofi Beats', 'Acoustic'];

export const SearchScreen: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('songs');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const executeSearch = async (searchTerm: string, currentFilter = filter) => {
    if (!searchTerm.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);
    setSelectedYear('ALL');
    try {
      const items = await musicApi.searchMusic(searchTerm.trim(), currentFilter);
      setResults(items);
    } catch (e) {
      console.warn('Search error:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setSelectedYear('ALL');
  };

  // Extract unique years from results for categorization chips
  const availableYears = useMemo(() => {
    const yearCounts: Record<string, number> = {};
    results.forEach((track) => {
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
  }, [results]);

  // Group Search Results into Year Categorized Sections
  const resultsByYearSections = useMemo(() => {
    const groups: Record<string, Track[]> = {};
    const listToGroup =
      selectedYear === 'ALL'
        ? results
        : results.filter((t) => String(t.year) === selectedYear);

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
      title: year === 'Unknown' ? 'CLASSICS & PRIOR RELEASES' : `${year} UPLOADS & RELEASES`,
      tracks: groups[year],
    }));
  }, [results, selectedYear]);

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.inputWrapper}>
          <Feather name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search songs, artists, albums..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => executeSearch(query)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Feather name="x" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => executeSearch(query)}
          activeOpacity={0.8}
        >
          <Text style={styles.searchButtonText}>SEARCH</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['songs', 'videos', 'albums'] as const).map((item) => {
          const isSelected = filter === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => {
                setFilter(item);
                if (query.trim()) executeSearch(query, item);
              }}
            >
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                {item.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Results / Suggestions */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>SEARCHING YOUTUBE MUSIC...</Text>
        </View>
      ) : results.length > 0 ? (
        <View style={styles.resultsContainer}>
          {/* Year Categorization Chips */}
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
                  ALL YEARS ({results.length})
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

          {/* Results Summary Bar */}
          <View style={styles.resultsSummaryBar}>
            <Text style={styles.resultsSummaryText}>
              CATEGORIZED BY YEAR UPLOADED ({results.length} TRACKS)
            </Text>
          </View>

          {/* Year Grouped Sections ScrollView */}
          <ScrollView
            style={styles.resultsScroll}
            contentContainerStyle={styles.resultsScrollContent}
          >
            {resultsByYearSections.map((sec) => (
              <View key={sec.year} style={styles.yearSectionCard}>
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
                    queueContext={results}
                    showDownloadButton={true}
                    showSaveButton={true}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : hasSearched ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={32} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No results found for "{query}"</Text>
        </View>
      ) : (
        /* Empty State with Suggestions */
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>POPULAR SEARCHES</Text>
          <View style={styles.tagsContainer}>
            {POPULAR_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.tag}
                onPress={() => {
                  setQuery(tag);
                  executeSearch(tag);
                }}
              >
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 40,
    color: COLORS.white,
    fontSize: 13,
  },
  clearBtn: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  searchButtonText: {
    color: COLORS.black,
    fontFamily: FONTS.serifBold,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  filterChipTextActive: {
    color: COLORS.black,
  },
  resultsContainer: {
    flex: 1,
  },
  yearFilterWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  yearScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
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
    letterSpacing: 0.4,
  },
  yearChipTextActive: {
    color: COLORS.black,
  },
  resultsSummaryBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultsSummaryText: {
    fontSize: 10,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 56,
    gap: 16,
  },
  yearSectionCard: {
    marginBottom: 8,
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.serifBold,
    letterSpacing: 1.5,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  suggestionsContainer: {
    padding: 20,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontFamily: FONTS.serifBold,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
