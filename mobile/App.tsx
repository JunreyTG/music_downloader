import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { AudioProvider } from './src/context/AudioContext';
import { DownloadProvider, useDownloads } from './src/context/DownloadContext';
import { HistoryProvider, useHistory } from './src/context/HistoryContext';
import { SavedProvider, useSaved } from './src/context/SavedContext';
import { Header } from './src/components/Header';
import { DownloadIndicatorBar } from './src/components/DownloadIndicatorBar';
import { MiniPlayer } from './src/components/MiniPlayer';
import { PlayerModal } from './src/components/PlayerModal';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { COLORS, FONTS } from './src/constants/theme';
import { TabType } from './src/types';

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const { downloads, activeTasks } = useDownloads();
  const { history } = useHistory();
  const { savedTracks } = useSaved();

  const activeDownloadCount = Object.keys(activeTasks).length;

  const renderScreen = () => {
    switch (activeTab) {
      case 'discover':
        return <DiscoverScreen />;
      case 'search':
        return <SearchScreen />;
      case 'library':
        return <LibraryScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DiscoverScreen />;
    }
  };

  const getHeaderSubtitle = () => {
    switch (activeTab) {
      case 'discover':
        return 'YouTube Music New Releases & Charts';
      case 'search':
        return 'Search Songs, Artists, & Albums';
      case 'library':
        return `${history.length} History · ${savedTracks.length} Saved · ${downloads.length} Downloaded`;
      case 'settings':
        return 'Storage, Audio Preferences & About';
      default:
        return undefined;
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar style="light" />
      
      {/* Top Header */}
      <Header subtitle={getHeaderSubtitle()} />

      {/* Global Animated Download Progress Indicator */}
      <DownloadIndicatorBar />

      {/* Main Screen Content */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {/* Persistent Mini Player (Pinned above Tab Bar) */}
      <MiniPlayer />

      {/* Expandable Full-Screen Player Modal */}
      <PlayerModal />

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('discover')}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Feather
              name="disc"
              size={20}
              color={activeTab === 'discover' ? COLORS.white : COLORS.textMuted}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'discover' && styles.navLabelActive,
            ]}
          >
            DISCOVER
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('search')}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Feather
              name="search"
              size={20}
              color={activeTab === 'search' ? COLORS.white : COLORS.textMuted}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'search' && styles.navLabelActive,
            ]}
          >
            SEARCH
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('library')}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Feather
              name="folder"
              size={20}
              color={activeTab === 'library' ? COLORS.white : COLORS.textMuted}
            />
            {activeDownloadCount > 0 ? (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>{activeDownloadCount}</Text>
              </View>
            ) : history.length > 0 ? (
              <View style={styles.badgeDot} />
            ) : null}
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'library' && styles.navLabelActive,
            ]}
          >
            LIBRARY
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Feather
              name="sliders"
              size={20}
              color={activeTab === 'settings' ? COLORS.white : COLORS.textMuted}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'settings' && styles.navLabelActive,
            ]}
          >
            SETTINGS
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function App() {
  return (
    <AudioProvider>
      <DownloadProvider>
        <SavedProvider>
          <HistoryProvider>
            <MainAppContent />
          </HistoryProvider>
        </SavedProvider>
      </DownloadProvider>
    </AudioProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? 28 : 0,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  navLabelActive: {
    color: COLORS.white,
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.black,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
  },
});
