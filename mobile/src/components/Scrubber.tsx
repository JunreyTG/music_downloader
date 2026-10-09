import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
} from 'react-native';
import { COLORS } from '../constants/theme';

interface ScrubberProps {
  value: number; // Current position in ms
  maximumValue: number; // Total duration in ms
  onValueChange?: (val: number) => void;
  onSlidingComplete?: (val: number) => void;
  disabled?: boolean;
}

export const Scrubber: React.FC<ScrubberProps> = ({
  value,
  maximumValue,
  onValueChange,
  onSlidingComplete,
  disabled = false,
}) => {
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragRatio, setDragRatio] = useState<number>(0);

  const calculateRatioFromX = (locationX: number): number => {
    if (trackWidth <= 0) return 0;
    return Math.min(Math.max(locationX / trackWidth, 0), 1);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsDragging(true);
        const ratio = calculateRatioFromX(evt.nativeEvent.locationX);
        setDragRatio(ratio);
        onValueChange?.(ratio * (maximumValue || 1));
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const currentX = evt.nativeEvent.locationX;
        const ratio = calculateRatioFromX(currentX);
        setDragRatio(ratio);
        onValueChange?.(ratio * (maximumValue || 1));
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        setIsDragging(false);
        const ratio = calculateRatioFromX(evt.nativeEvent.locationX);
        const finalVal = ratio * (maximumValue || 1);
        onSlidingComplete?.(finalVal);
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const currentRatio = isDragging
    ? dragRatio
    : maximumValue > 0
    ? Math.min(Math.max(value / maximumValue, 0), 1)
    : 0;

  return (
    <View
      style={styles.touchArea}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <View style={styles.track}>
        <View style={[styles.progress, { width: `${currentRatio * 100}%` }]} />
        <View
          style={[
            styles.thumb,
            { left: `${currentRatio * 100}%` },
            isDragging && styles.thumbActive,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  touchArea: {
    height: 36,
    justifyContent: 'center',
    width: '100%',
  },
  track: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  progress: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.white,
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbActive: {
    transform: [{ scale: 1.3 }],
  },
});
