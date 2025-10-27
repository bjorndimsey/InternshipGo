import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Dimensions, Animated, PanResponder, StyleSheet, Platform, Easing } from 'react-native';

const { width } = Dimensions.get('window');

type InternsComposedChartProps = {
  monthlyAdded: number[]; // length 12, Jan..Dec
  year?: number; // Optional year to display
};

// Build months labels Jan..Dec
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function InternsComposedChart({ monthlyAdded, year = new Date().getFullYear() }: InternsComposedChartProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Normalize to 12 items
  const counts = Array.from({ length: 12 }, (_, i) => monthlyAdded?.[i] ?? 0);
  let cumulative = 0;
  const data = counts.map((value, i) => {
    cumulative += value;
    return {
      month: MONTH_LABELS[i],
      added: value,
      cumulative,
    };
  });

  const maxValue = Math.max(...data.map(d => Math.max(d.added, d.cumulative)));
  const chartHeight = 220;
  
  // Responsive width calculation
  const { width: screenWidth } = Dimensions.get('window');
  const chartWidth = Math.max(350, Math.min(screenWidth - 120, containerWidth - 80)); // Increased minimum width
  const padding = Math.max(40, chartWidth * 0.1); // Increased padding for better label spacing
  const barWidth = (chartWidth - padding * 2) / 12;

  // Animation values
  const progress = useRef(new Animated.Value(0)).current;
  const lineProgress = useRef(new Animated.Value(0)).current;
  const tooltipX = useRef(new Animated.Value(0)).current;
  const tooltipY = useRef(new Animated.Value(0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const [tooltipData, setTooltipData] = useState<{ month: string; added: number; cumulative: number } | null>(null);

  // Animate chart on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(lineProgress, {
        toValue: 1,
        duration: 1200,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  // Web-specific hover handlers with smooth animations
  const handleMouseMove = (evt: any) => {
    if (Platform.OS !== 'web') return;
    
    const rect = evt.currentTarget.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const index = Math.floor((x - padding) / barWidth);
    
    if (index >= 0 && index < data.length) {
      const point = data[index];
      const tooltipXPos = padding + index * barWidth + barWidth / 2;
      const tooltipYPos = chartHeight - (point.cumulative / maxValue) * (chartHeight - 40) - 20;
      
      // Calculate smart tooltip position for mobile screens
      const tooltipWidth = 120;
      const tooltipHeight = 80;
      let finalX = tooltipXPos - tooltipWidth / 2;
      let finalY = tooltipYPos - tooltipHeight - 10;
      
      // Adjust for mobile screens - keep tooltip within bounds
      if (finalX < 10) finalX = 10; // Left edge
      if (finalX + tooltipWidth > chartWidth - 10) finalX = chartWidth - tooltipWidth - 10; // Right edge
      if (finalY < 10) finalY = tooltipYPos + 10; // Top edge - show below point
      if (finalY + tooltipHeight > chartHeight - 10) finalY = chartHeight - tooltipHeight - 10; // Bottom edge
      
      setTooltipData(point);
      setTooltipPosition({ x: finalX, y: finalY });
      
      if (!isTooltipVisible) {
        setIsTooltipVisible(true);
        Animated.timing(tooltipOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    }
  };

  const handleMouseLeave = () => {
    if (Platform.OS !== 'web') return;
    
    setIsTooltipVisible(false);
    Animated.timing(tooltipOpacity, {
      toValue: 0,
      duration: 300,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  // Pan responder for smooth tooltip interaction
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX } = evt.nativeEvent;
      const index = Math.floor((locationX - padding) / barWidth);
      
      if (index >= 0 && index < data.length) {
        const point = data[index];
        const x = padding + index * barWidth + barWidth / 2;
        const y = chartHeight - (point.cumulative / maxValue) * (chartHeight - 40) - 20;
        
        // Calculate smart tooltip position for mobile screens
        const tooltipWidth = 120;
        const tooltipHeight = 80;
        let finalX = x - tooltipWidth / 2;
        let finalY = y - tooltipHeight - 10;
        
        // Adjust for mobile screens - keep tooltip within bounds
        if (finalX < 10) finalX = 10; // Left edge
        if (finalX + tooltipWidth > chartWidth - 10) finalX = chartWidth - tooltipWidth - 10; // Right edge
        if (finalY < 10) finalY = y + 10; // Top edge - show below point
        if (finalY + tooltipHeight > chartHeight - 10) finalY = chartHeight - tooltipHeight - 10; // Bottom edge
        
        setTooltipData(point);
        setTooltipPosition({ x: finalX, y: finalY });
        
        Animated.timing(tooltipOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
        setIsTooltipVisible(true);
      }
    },
    onPanResponderMove: (evt) => {
      const { locationX } = evt.nativeEvent;
      const index = Math.floor((locationX - padding) / barWidth);
      
      if (index >= 0 && index < data.length) {
        const point = data[index];
        const x = padding + index * barWidth + barWidth / 2;
        const y = chartHeight - (point.cumulative / maxValue) * (chartHeight - 40) - 20;
        
        // Calculate smart tooltip position for mobile screens
        const tooltipWidth = 120;
        const tooltipHeight = 80;
        let finalX = x - tooltipWidth / 2;
        let finalY = y - tooltipHeight - 10;
        
        // Adjust for mobile screens - keep tooltip within bounds
        if (finalX < 10) finalX = 10; // Left edge
        if (finalX + tooltipWidth > chartWidth - 10) finalX = chartWidth - tooltipWidth - 10; // Right edge
        if (finalY < 10) finalY = y + 10; // Top edge - show below point
        if (finalY + tooltipHeight > chartHeight - 10) finalY = chartHeight - tooltipHeight - 10; // Bottom edge
        
        setTooltipData(point);
        setTooltipPosition({ x: finalX, y: finalY });
        
        // Always show tooltip on move (hover effect)
        if (!isTooltipVisible) {
          setIsTooltipVisible(true);
          Animated.timing(tooltipOpacity, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }
      }
    },
    onPanResponderRelease: () => {
      // Don't hide tooltip immediately on release for better hover experience
      setTimeout(() => {
        setIsTooltipVisible(false);
        Animated.timing(tooltipOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }, 150);
    },
    onPanResponderTerminate: () => {
      setIsTooltipVisible(false);
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
  });

  return (
    <View 
      style={styles.container}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#9ac6ff' }]} />
          <Text style={styles.legendText}>Added (Month)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#F56E0F' }]} />
          <Text style={styles.legendText}>Cumulative</Text>
        </View>
      </View>

      {/* Chart */}
      <View 
        style={[styles.chart, { height: chartHeight, width: chartWidth }]} 
        {...panResponder.panHandlers}
        {...(Platform.OS === 'web' ? {
          onMouseMove: handleMouseMove,
          onMouseLeave: handleMouseLeave,
        } : {})}
      >
        {/* Y-axis title */}
        <Text style={[styles.yAxisTitle, { top: chartHeight / 2 - 40 }]}>
         Number of Interns
        </Text>

        {/* Y-axis labels */}
        {(() => {
          // Create smart Y-axis labels based on maxValue
          const labels = [];
          if (maxValue <= 2) {
            // For small values, show every integer
            for (let i = 0; i <= maxValue; i++) {
              labels.push(i);
            }
          } else if (maxValue <= 10) {
            // For medium values, show every 2
            for (let i = 0; i <= maxValue; i += 2) {
              labels.push(i);
            }
          } else {
            // For large values, show 5 labels
            const step = Math.ceil(maxValue / 4);
            for (let i = 0; i <= maxValue; i += step) {
              labels.push(i);
            }
          }
          
          return labels.map((value, i) => {
            const ratio = maxValue > 0 ? value / maxValue : 0;
            const y = chartHeight - ratio * (chartHeight - 40) - 20;
            return (
              <Text
                key={`y-label-${value}`}
                style={[
                  styles.yAxisLabel,
                 {
                   left: width < 768 ? 8 : 15, // Adjusted for increased padding
                   top: y - 8,
                 },
                ]}
              >
                {value}
              </Text>
            );
          });
        })()}

        {/* Grid lines */}
        {(() => {
          // Create smart grid lines based on maxValue
          const labels = [];
          if (maxValue <= 2) {
            for (let i = 0; i <= maxValue; i++) {
              labels.push(i);
            }
          } else if (maxValue <= 10) {
            for (let i = 0; i <= maxValue; i += 2) {
              labels.push(i);
            }
          } else {
            const step = Math.ceil(maxValue / 4);
            for (let i = 0; i <= maxValue; i += step) {
              labels.push(i);
            }
          }
          
          return labels.map((value, i) => {
            const ratio = maxValue > 0 ? value / maxValue : 0;
            const y = chartHeight - ratio * (chartHeight - 40) - 20;
            return (
              <View
                key={`grid-${value}`}
                style={[
                  styles.gridLine,
                  {
                    top: y,
                    width: chartWidth - padding * 2,
                    left: padding,
                  },
                ]}
              />
            );
          });
        })()}

        {/* Bars */}
        {data.map((point, index) => {
          const x = padding + index * barWidth;

          return (
            <Animated.View
              key={`bar-${index}`}
              style={[
                styles.bar,
                {
                  left: x + barWidth * 0.2,
                  width: barWidth * 0.6,
                  height: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (point.added / maxValue) * (chartHeight - 40)],
                  }),
                  bottom: 20,
                },
              ]}
            />
          );
        })}

        {/* Line */}
        {data.map((point, index) => {
          if (index === 0) return null;
          
          const prevPoint = data[index - 1];
          const x1 = padding + (index - 1) * barWidth + barWidth / 2;
          const y1 = chartHeight - (prevPoint.cumulative / maxValue) * (chartHeight - 40) - 20;
          const x2 = padding + index * barWidth + barWidth / 2;
          const y2 = chartHeight - (point.cumulative / maxValue) * (chartHeight - 40) - 20;

          return (
            <Animated.View
              key={`line-${index}`}
              style={[
                styles.lineSegment,
                {
                  left: x1,
                  top: y1,
                  width: lineProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)],
                  }),
                  transform: [
                    {
                      rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad`,
                    },
                  ],
                },
              ]}
            />
          );
        })}

        {/* Line dots */}
        {data.map((point, index) => {
          const x = padding + index * barWidth + barWidth / 2;
          const y = chartHeight - (point.cumulative / maxValue) * (chartHeight - 40) - 20;

          return (
            <Animated.View
              key={`dot-${index}`}
              style={[
                styles.dot,
                {
                  left: x - 3,
                  top: y - 3,
                  opacity: lineProgress.interpolate({
                    inputRange: [0, 0.1, 1],
                    outputRange: [0, 0, 1],
                  }),
                  transform: [
                    {
                      scale: lineProgress.interpolate({
                        inputRange: [0, 0.1, 1],
                        outputRange: [0, 0, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          );
        })}

        {/* Tooltip */}
        {tooltipData && (
          <Animated.View
            style={[
              styles.tooltip,
              {
                left: tooltipPosition.x,
                top: tooltipPosition.y,
                opacity: tooltipOpacity,
              },
            ]}
          >
            <Text style={styles.tooltipTitle}>{tooltipData.month}</Text>
            <Text style={styles.tooltipText}>Added: {tooltipData.added}</Text>
            <Text style={styles.tooltipText}>Cumulative: {tooltipData.cumulative}</Text>
          </Animated.View>
        )}

        {/* X-axis labels */}
        {data.map((point, index) => {
          const x = padding + index * barWidth + barWidth / 2;
          return (
            <View key={`label-${index}`} style={[styles.labelContainer, { 
              left: x - (width < 768 ? 15 : 20), // Responsive width adjustment
              top: chartHeight - (width < 768 ? 5 : 10) // Responsive top positioning
            }]}>
              <Text style={styles.axisLabel}>{point.month}</Text>
              <Text style={styles.yearLabel}>{year}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    width: '100%',
    paddingHorizontal: width < 768 ? 20 : 40, // Responsive padding
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: width < 768 ? 'center' : 'flex-end', // Center on mobile
    marginBottom: 16,
    gap: width < 768 ? 16 : 24, // Smaller gap on mobile
    paddingRight: width < 768 ? 0 : 20, // No padding on mobile
    flexWrap: 'wrap', // Allow wrapping on small screens
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    color: '#9AA0A6',
    fontSize: 12,
    fontWeight: '500',
  },
  chart: {
    position: 'relative',
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bar: {
    position: 'absolute',
    backgroundColor: '#9ac6ff',
    borderRadius: 3,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#F56E0F',
    transformOrigin: '0 0',
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F56E0F',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2e',
    minWidth: 120,
  },
  tooltipTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tooltipText: {
    color: '#e2e2e2',
    fontSize: 12,
    marginBottom: 2,
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: width < 768 ? 30 : 40, // Responsive width
    justifyContent: 'center',
  },
  axisLabel: {
    color: '#9AA0A6',
    fontSize: width < 768 ? 10 : 12, // Responsive font size
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: width < 768 ? 12 : 14, // Better line height
  },
  yearLabel: {
    color: '#6B7280',
    fontSize: width < 768 ? 8 : 10, // Responsive font size
    textAlign: 'center',
    marginTop: width < 768 ? 1 : 2, // Responsive margin
    lineHeight: width < 768 ? 10 : 12, // Better line height
  },
  yAxisLabel: {
    position: 'absolute',
    color: '#9AA0A6',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
    width: 35,
  },
  yAxisTitle: {
    position: 'absolute',
    color: '#9AA0A6',
    fontSize: width < 768 ? 10 : 12, // Smaller on mobile
    fontWeight: '600',
    transform: [{ rotate: '-90deg' }],
    left: width < 768 ? -20 : -30, // Adjusted for increased padding
    width: 80,
    textAlign: 'center',
  },
});


