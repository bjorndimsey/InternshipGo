import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';

const { width, height } = Dimensions.get('window');

// Responsive helper functions
const getResponsiveSize = (size: number) => {
  const scale = width / 375; // Base width (iPhone X)
  return Math.max(size * scale, size * 0.8); // Minimum 80% of original size
};

const getResponsiveFontSize = (size: number) => {
  const scale = width / 375;
  return Math.max(size * scale, size * 0.85);
};

const isSmallScreen = width < 768;
const isTablet = width >= 768 && width < 1024;
const isDesktop = width >= 1024;

interface DashboardStats {
  totalInterns: number;
  totalCoordinators: number;
  totalAdminCoordinators: number;
  totalCompanies: number;
  activeInternships: number;
  pendingApplications: number;
  internsChange?: number;
  coordinatorsChange?: number;
  companiesChange?: number;
}

interface NewSignup {
  id: string;
  name: string;
  email: string;
  type: string;
  signupDate: string;
}

// Pie Chart Component
const PieChart = ({ data, size = 200 }: { data: Array<{ label: string; value: number; color: string }>; size?: number }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, []);

  const radius = size / 2 - 10;
  const center = size / 2;
  let currentAngle = -90; // Start from top

  const slices = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Calculate path for pie slice
    const startX = center + radius * Math.cos((startAngle * Math.PI) / 180);
    const startY = center + radius * Math.sin((startAngle * Math.PI) / 180);
    const endX = center + radius * Math.cos((endAngle * Math.PI) / 180);
    const endY = center + radius * Math.sin((endAngle * Math.PI) / 180);
    const largeArc = angle > 180 ? 1 : 0;

    const path = `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;

    return {
      path,
      color: item.color,
      percentage,
      label: item.label,
      value: item.value,
      startAngle,
      endAngle,
    };
  });

  return (
    <View style={styles.pieChartContainer}>
      <View style={[styles.pieChart, { width: size, height: size }]}>
        {slices.map((slice, index) => {
          const animatedAngle = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, slice.endAngle - slice.startAngle],
          });

          return (
            <View key={index} style={styles.pieSliceContainer}>
              <View
                style={[
                  styles.pieSlice,
                  {
                    width: radius * 2,
                    height: radius * 2,
                    borderRadius: radius,
                    backgroundColor: slice.color,
                    opacity: 0.3,
                  },
                ]}
              />
            </View>
          );
        })}
        {/* Simple pie using View with border radius */}
        <View style={styles.pieChartInner}>
          {slices.map((slice, index) => {
            const sliceAngle = (slice.endAngle - slice.startAngle) * (Math.PI / 180);
            const midAngle = (slice.startAngle + slice.endAngle) / 2;
            const labelX = center + (radius * 0.7) * Math.cos((midAngle * Math.PI) / 180);
            const labelY = center + (radius * 0.7) * Math.sin((midAngle * Math.PI) / 180);

            return (
              <View key={index}>
                <View
                  style={[
                    styles.pieSliceIndicator,
                    {
                      left: labelX - 10,
                      top: labelY - 10,
                      backgroundColor: slice.color,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.pieLegend}>
        {slices.map((slice, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: slice.color }]} />
            <Text style={styles.legendText}>{slice.label}</Text>
            <Text style={styles.legendValue}>{slice.value}</Text>
            <Text style={styles.legendPercentage}>({slice.percentage.toFixed(1)}%)</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Professional Pie Chart with visual segments
const SimplePieChart = ({ data, size = 220 }: { data: Array<{ label: string; value: number; color: string }>; size?: number }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const progress = useRef(new Animated.Value(0)).current;
  const radius = size / 2 - 20;
  const center = size / 2;
  
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, []);

  // Create segments with angles
  let currentAngle = -90; // Start from top
  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
      angle,
    };
  });

  return (
    <View style={styles.pieChartContainer}>
      <View style={[styles.pieChartWrapper, { width: size, height: size }]}>
        <View style={styles.pieChartVisual}>
          {segments.map((segment, index) => {
            const midAngle = (segment.startAngle + segment.endAngle) / 2;
            const labelX = center + (radius * 0.75) * Math.cos((midAngle * Math.PI) / 180);
            const labelY = center + (radius * 0.75) * Math.sin((midAngle * Math.PI) / 180);
            
            // Calculate segment size based on percentage
            const segmentRadius = radius * (0.5 + (segment.percentage / 100) * 0.5);
            const centerOffset = (size - segmentRadius * 2) / 2;
            
            return (
              <View key={index} style={styles.pieSliceContainer}>
                <Animated.View
                  style={[
                    styles.pieSegmentCircle,
                    {
                      width: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, segmentRadius * 2],
                      }),
                      height: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, segmentRadius * 2],
                      }),
                      borderRadius: size / 2,
                      backgroundColor: segment.color,
                      opacity: 0.75 + (index * 0.05),
                      position: 'absolute',
                      top: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [center, centerOffset],
                      }),
                      left: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [center, centerOffset],
                      }),
                    },
                  ]}
                />
                {segment.percentage > 8 && (
                  <Animated.View
                    style={[
                      styles.pieSegmentLabel,
                      {
                        left: labelX - 25,
                        top: labelY - 12,
                        opacity: progress,
                      },
                    ]}
                  >
                    <Text style={[styles.pieSegmentText, { color: segment.color, fontWeight: 'bold' }]}>
                      {segment.percentage.toFixed(0)}%
                    </Text>
                  </Animated.View>
                )}
              </View>
            );
          })}
          {/* Center circle with total */}
          <View style={[styles.pieChartCenter, { width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2 }]}>
            <Text style={styles.pieChartCenterText}>Total</Text>
            <Text style={styles.pieChartCenterValue}>{total.toLocaleString()}</Text>
          </View>
        </View>
      </View>
      <View style={styles.pieLegend}>
        {segments.map((segment, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: segment.color }]} />
            <Text style={styles.legendText}>{segment.label}</Text>
            <Text style={styles.legendValue}>{segment.value.toLocaleString()}</Text>
            <Text style={styles.legendPercentage}>({segment.percentage.toFixed(1)}%)</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Line Chart Component
const LineChart = ({ 
  title, 
  data, 
  labels, 
  colors, 
  height = 280 
}: { 
  title: string; 
  data: Array<{ label: string; values: number[] }>; 
  labels: string[]; 
  colors: string[]; 
  height?: number 
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; month: string; values: Array<{ label: string; value: number; color: string }> } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const maxValue = Math.max(...data.flatMap(d => d.values), 1);
  console.log('📊 LineChart maxValue:', maxValue);
  console.log('📊 LineChart data:', data.map(d => ({ label: d.label, values: d.values })));
  const chartPadding = isSmallScreen ? 30 : 50;
  // On small screens, use a fixed minimum width for horizontal scrolling
  const minChartWidth = isSmallScreen ? 600 : 0;
  const chartWidth = isSmallScreen 
    ? Math.max(minChartWidth, width - chartPadding * 2 - 40)
    : (width - 60) * 0.65 - chartPadding * 2;
  const chartHeight = isSmallScreen ? height - 80 : height - 100;
  const gridLines = 5;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const gridValues = Array.from({ length: gridLines }, (_, i) => {
    return Math.ceil((maxValue / (gridLines - 1)) * i);
  });

  const calculatePoints = (values: number[]) => {
    return values.map((value, index) => {
      const x = (index / (values.length - 1)) * chartWidth;
      // Ensure y is never exactly at the bottom to keep line visible
      const normalizedValue = maxValue > 0 ? value / maxValue : 0;
      const y = chartHeight - (normalizedValue * chartHeight);
      // Add a small offset if value is 0 to keep line visible above bottom axis
      const adjustedY = value === 0 && maxValue > 0 ? y - 2 : y;
      return { x, y: adjustedY, value };
    });
  };

  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipScale = useRef(new Animated.Value(0.8)).current;

  const handlePointPressIn = (pointIndex: number, pointX: number, pointY: number) => {
    const month = labels[pointIndex];
    const values = data.map((item, index) => ({
      label: item.label,
      value: item.values[pointIndex],
      color: colors[index],
    }));
    
    // Calculate tooltip position relative to chart area
    const tooltipX = pointX + chartPadding + 30;
    const tooltipY = pointY + 20;
    
    setTooltipData({
      x: tooltipX,
      y: tooltipY,
      month,
      values,
    });
    setTooltipVisible(true);
    
    // Reset animation values and animate tooltip appearance instantly on touch
    tooltipOpacity.setValue(0);
    tooltipScale.setValue(0.8);
    Animated.parallel([
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(tooltipScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePointPressOut = () => {
    // Animate tooltip disappearance
    Animated.parallel([
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(tooltipScale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTooltipVisible(false);
    });
  };

  return (
    <Animated.View 
      style={[
        styles.lineChartCard, 
        { 
          height,
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        }
      ]}
    >
      <View style={styles.lineChartHeader}>
        <Text style={styles.lineChartTitle}>{title}</Text>
        <View style={styles.lineChartLegend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItemInline}>
              <View style={[styles.legendDot, { backgroundColor: colors[index] }]} />
              <Text style={styles.legendTextInline}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {isSmallScreen ? (
        <ScrollView
          showsVerticalScrollIndicator={true}
          style={styles.lineChartScrollContainer}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={{ paddingRight: 20 }}
            style={styles.lineChartScrollView}
            nestedScrollEnabled={true}
          >
            <View style={styles.lineChartContainer}>
              {/* Y-axis labels */}
              <View style={styles.lineYAxisContainer}>
                {gridValues.reverse().map((value, index) => (
                  <Text key={index} style={styles.lineYAxisLabel}>
                    {value}
                  </Text>
                ))}
              </View>
              
              {/* Chart area with fixed width for scrolling */}
              <View style={[styles.lineChartArea, { width: chartWidth, minHeight: chartHeight + 100 }]}>
              {/* Grid lines */}
              {gridValues.map((value, index) => {
                const yPosition = (index / (gridLines - 1)) * chartHeight;
                return (
                  <View
                    key={index}
                    style={[
                      styles.lineGridLine,
                      {
                        top: yPosition + 20,
                        width: chartWidth,
                      },
                    ]}
                  />
                );
              })}

              {/* Lines */}
              {data.map((item, index) => {
                const points = calculatePoints(item.values);
                // Add a small vertical offset for overlapping lines to make them all visible
                const lineOffset = index * 1.5; // 1.5px offset per line
                return (
                  <View key={index} style={[styles.lineContainer, { zIndex: index + 10 }]}>
                    {/* Draw lines between points */}
                    {points.map((point, pointIndex) => {
                      if (pointIndex === 0) return null;
                      const prevPoint = points[pointIndex - 1];
                      const distance = Math.sqrt(
                        Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
                      );
                      const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x) * (180 / Math.PI);
                      
                      return (
                        <Animated.View
                          key={`line-${index}-${pointIndex}`}
                          style={[
                            styles.lineSegment,
                            {
                              left: prevPoint.x,
                              top: prevPoint.y - lineOffset,
                              width: progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, distance],
                              }),
                              height: 3.5,
                              backgroundColor: colors[index],
                              transform: [{ rotate: `${angle}deg` }],
                              opacity: progress,
                              zIndex: index + 10,
                            },
                          ]}
                        />
                      );
                    })}
                    {/* Points with hover and touch handlers */}
                    {points.map((point, pointIndex) => {
                      const lineOffset = index * 1.5; // Match the line offset
                      return (
                      <Pressable
                        key={`point-${index}-${pointIndex}`}
                        onPressIn={() => handlePointPressIn(pointIndex, point.x, point.y - lineOffset)}
                        onPressOut={handlePointPressOut}
                        onHoverIn={() => handlePointPressIn(pointIndex, point.x, point.y - lineOffset)}
                        onHoverOut={handlePointPressOut}
                        style={[
                          styles.linePointTouchable,
                          {
                            left: point.x - 20,
                            top: point.y - 20 - lineOffset,
                            width: 40,
                            height: 40,
                            zIndex: 20 + index,
                          },
                        ]}
                      >
                        <Animated.View
                          style={[
                            styles.linePoint,
                            {
                              left: 14,
                              top: 14,
                              backgroundColor: colors[index],
                              opacity: progress,
                              width: 12,
                              height: 12,
                              borderRadius: 6,
                              borderWidth: 2,
                              borderColor: '#151419',
                            },
                          ]}
                        />
                      </Pressable>
                    );
                    })}
                  </View>
                );
              })}
            </View>
          </View>
          </ScrollView>
        </ScrollView>
      ) : (
        <View style={styles.lineChartContainer}>
          {/* Y-axis labels */}
          <View style={styles.lineYAxisContainer}>
            {gridValues.reverse().map((value, index) => (
              <Text key={index} style={styles.lineYAxisLabel}>
                {value}
              </Text>
            ))}
          </View>
          
          {/* Chart area */}
          <View style={styles.lineChartArea}>
            {/* Grid lines */}
            {gridValues.map((value, index) => {
              const yPosition = (index / (gridLines - 1)) * chartHeight;
              return (
                <View
                  key={index}
                  style={[
                    styles.lineGridLine,
                    {
                      top: yPosition + 20,
                      width: chartWidth,
                    },
                  ]}
                />
              );
            })}

            {/* Lines */}
            {data.map((item, index) => {
              const points = calculatePoints(item.values);
              // Add a small vertical offset for overlapping lines to make them all visible
              const lineOffset = index * 1.5; // 1.5px offset per line
              return (
                <View key={index} style={[styles.lineContainer, { zIndex: index + 10 }]}>
                  {/* Draw lines between points */}
                  {points.map((point, pointIndex) => {
                    if (pointIndex === 0) return null;
                    const prevPoint = points[pointIndex - 1];
                    const distance = Math.sqrt(
                      Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
                    );
                    const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x) * (180 / Math.PI);
                    
                    return (
                      <Animated.View
                        key={`line-${index}-${pointIndex}`}
                        style={[
                          styles.lineSegment,
                          {
                            left: prevPoint.x,
                            top: prevPoint.y - lineOffset,
                            width: progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, distance],
                            }),
                            height: 3.5,
                            backgroundColor: colors[index],
                            transform: [{ rotate: `${angle}deg` }],
                            opacity: progress,
                            zIndex: index + 10,
                          },
                        ]}
                      />
                    );
                  })}
                  {/* Points with hover and touch handlers */}
                  {points.map((point, pointIndex) => {
                    const lineOffset = index * 1.5; // Match the line offset
                    return (
                    <Pressable
                      key={`point-${index}-${pointIndex}`}
                      onPressIn={() => handlePointPressIn(pointIndex, point.x, point.y - lineOffset)}
                      onPressOut={handlePointPressOut}
                      onHoverIn={() => handlePointPressIn(pointIndex, point.x, point.y - lineOffset)}
                      onHoverOut={handlePointPressOut}
                      style={[
                        styles.linePointTouchable,
                        {
                          left: point.x - 20,
                          top: point.y - 20 - lineOffset,
                          width: 40,
                          height: 40,
                          zIndex: 20 + index,
                        },
                      ]}
                    >
                      <Animated.View
                        style={[
                          styles.linePoint,
                          {
                            left: 14,
                            top: 14,
                            backgroundColor: colors[index],
                            opacity: progress,
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: '#151419',
                          },
                        ]}
                      />
                    </Pressable>
                    );
                    })}
                </View>
              );
            })}
          </View>
        </View>
      )}
      
      {/* X-axis labels */}
      {isSmallScreen ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: chartPadding + 30 }}
        >
          <View style={[styles.lineXAxisContainer, { width: chartWidth }]}>
            {labels.map((label, index) => (
              <Text key={index} style={styles.lineXAxisLabel}>
                {label}
              </Text>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.lineXAxisContainer}>
          {labels.map((label, index) => (
            <Text key={index} style={styles.lineXAxisLabel}>
              {label}
            </Text>
          ))}
        </View>
      )}

      {/* Tooltip with smooth animations - appears instantly on touch */}
      {tooltipVisible && tooltipData && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              left: tooltipData.x,
              top: tooltipData.y,
              opacity: tooltipOpacity,
              transform: [
                { scale: tooltipScale },
                {
                  translateY: tooltipScale.interpolate({
                    inputRange: [0.8, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.tooltipTitle}>{tooltipData.month}</Text>
          {tooltipData.values.map((item, index) => (
            <View key={index} style={styles.tooltipItem}>
              <View style={[styles.tooltipDot, { backgroundColor: item.color }]} />
              <Text style={styles.tooltipText}>
                {item.label}: {item.value}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
};

// Professional Bar Chart Component (smaller version)
const BarChart = ({ 
  title, 
  value, 
  change, 
  data, 
  labels, 
  colors, 
  height = 280 
}: { 
  title: string;
  value?: string;
  change?: number;
  data: number[]; 
  labels: string[]; 
  colors: string[]; 
  height?: number 
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipScale = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const maxValue = Math.max(...data, 1);
  const chartWidth = isSmallScreen 
    ? width - 60
    : (width - 60) * 0.33 - 40;
  const barWidth = (chartWidth - 20) / data.length - 5;
  const chartHeight = isSmallScreen ? 120 : 150;
  const isPositive = (change || 0) > 0;
  const changeColor = isPositive ? '#34a853' : '#ea4335';

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const handleBarPressIn = (index: number, barX: number, barY: number, barHeight: number) => {
    setTooltipData({
      x: barX + barWidth / 2,
      y: barY - barHeight - 30,
      label: labels[index],
      value: data[index],
    });
    setTooltipVisible(true);
    
    // Reset animation values and animate tooltip appearance instantly on touch
    tooltipOpacity.setValue(0);
    tooltipScale.setValue(0.8);
    Animated.parallel([
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(tooltipScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleBarPressOut = () => {
    // Animate tooltip disappearance
    Animated.parallel([
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(tooltipScale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTooltipVisible(false);
    });
  };

  return (
    <Animated.View 
      style={[
        styles.barChartCard, 
        { 
          height,
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        }
      ]}
    >
      <View style={styles.barChartCardHeader}>
        <Text style={styles.barChartCardTitle}>{title}</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={18} color="#878787" />
        </TouchableOpacity>
      </View>
      
      {value && (
        <View style={styles.barChartCardValue}>
          <Text style={styles.barChartValueText}>{value}</Text>
          {change !== undefined && (
            <View style={styles.barChartCardTrend}>
              <Ionicons 
                name={isPositive ? "arrow-up" : "arrow-down"} 
                size={12} 
                color={changeColor} 
              />
              <Text style={[styles.barChartChangeText, { color: changeColor }]}>
                {Math.abs(change)}%
              </Text>
              <Text style={styles.barChartChangeSubtext}>from last week</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.barChartSmallContainer}>
        <View style={styles.barChartSmall}>
          {data.map((value, index) => {
            const barHeight = (value / maxValue) * chartHeight;
            const animatedHeight = progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, barHeight],
            });
            const barX = (index * (chartWidth / data.length)) + 10;
            const barY = chartHeight;

            return (
              <View key={index} style={styles.barGroupSmall}>
                <View style={styles.barWrapperSmall}>
                  <Pressable
                    onPressIn={() => handleBarPressIn(index, barX, barY, barHeight)}
                    onPressOut={handleBarPressOut}
                    onHoverIn={() => handleBarPressIn(index, barX, barY, barHeight)}
                    onHoverOut={handleBarPressOut}
                    style={[styles.barTouchable, { paddingHorizontal: 5 }]}
                  >
                    <Animated.View
                      style={[
                        styles.barSmall,
                        {
                          height: animatedHeight,
                          width: barWidth,
                          backgroundColor: colors[index % colors.length],
                          borderRadius: 4,
                        },
                      ]}
                    />
                  </Pressable>
                </View>
                <Text style={styles.barLabelSmall} numberOfLines={1}>
                  {labels[index]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Tooltip with smooth animations - appears instantly on touch */}
      {tooltipVisible && tooltipData && (
        <Animated.View
          style={[
            styles.barTooltip,
            {
              left: tooltipData.x - 40,
              top: tooltipData.y,
              opacity: tooltipOpacity,
              transform: [
                { scale: tooltipScale },
                {
                  translateY: tooltipScale.interpolate({
                    inputRange: [0.8, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.tooltipTitle}>{tooltipData.label}</Text>
          <Text style={styles.tooltipValue}>{tooltipData.value.toLocaleString()}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInterns: 0,
    totalCoordinators: 0,
    totalAdminCoordinators: 0,
    totalCompanies: 0,
    activeInternships: 0,
    pendingApplications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [newSignups, setNewSignups] = useState<NewSignup[]>([]);
  const [dimensions, setDimensions] = useState({ width, height });
  const [growthData, setGrowthData] = useState<{
    monthlyInterns: number[];
    monthlyCoordinators: number[];
    monthlyCompanies: number[];
    months: string[];
  }>({
    monthlyInterns: new Array(12).fill(0),
    monthlyCoordinators: new Array(12).fill(0),
    monthlyCompanies: new Array(12).fill(0),
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    return () => subscription?.remove();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [platformStatsResponse, coordinatorsResponse, companiesResponse, studentsResponse] = await Promise.all([
        apiService.getPlatformStats(),
        apiService.getCoordinators(),
        apiService.getCompanies(),
        apiService.getAllStudents(),
      ]);

      // Get platform stats
      const platformStats = platformStatsResponse.success ? platformStatsResponse.data : null;
      
      // Get coordinators data
      const coordinators = coordinatorsResponse.success && coordinatorsResponse.coordinators 
        ? coordinatorsResponse.coordinators 
        : [];
      
      console.log('📊 Coordinators response:', {
        success: coordinatorsResponse.success,
        count: coordinators.length,
        coordinators: coordinators.map((c: any) => ({
          id: c.id,
          userId: c.userId,
          name: c.name || `${c.firstName} ${c.lastName}`,
          status: c.status,
        })),
      });
      
      // Get companies data
      const companies = companiesResponse.success && companiesResponse.companies 
        ? companiesResponse.companies 
        : [];

      // Get students data
      const studentsResponseData = studentsResponse as any;
      const students = studentsResponse.success && (studentsResponseData.students || studentsResponseData.data?.students || studentsResponseData.data)
        ? (studentsResponseData.students || studentsResponseData.data?.students || studentsResponseData.data)
        : [];

      // Count admin coordinators
      const adminCoordinators = coordinators.filter((coord: any) => coord.isAdminCoordinator || coord.isAdmin).length;
      
      // Calculate changes (mock for now - you can implement real comparison with previous month data)
      const internsChange = 25; // TODO: Calculate from previous month
      const coordinatorsChange = -5; // TODO: Calculate from previous month
      const companiesChange = 15; // TODO: Calculate from previous month

      // Set stats
      setStats({
        totalInterns: platformStats?.studentCount || 0,
        totalCoordinators: coordinators.length,
        totalAdminCoordinators: adminCoordinators,
        totalCompanies: companies.length,
        activeInternships: 0, // TODO: Fetch from internships table
        pendingApplications: 0, // TODO: Fetch from applications table
        internsChange,
        coordinatorsChange,
        companiesChange,
      });

      // Fetch new signups - get recent users from the database
      const recentSignups: NewSignup[] = [];
      
      // Get recent students/interns (last 5)
      const recentStudents = students
        .sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5)
        .map((student: any) => ({
          id: student.id?.toString() || '',
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown',
          email: student.email || '',
          type: 'Intern' as const,
          signupDate: student.created_at || new Date().toISOString(),
        }));

      // Get recent coordinators (last 5)
      const recentCoordinators = coordinators
        .sort((a: any, b: any) => {
          const dateA = new Date(a.joinDate || a.created_at || 0);
          const dateB = new Date(b.joinDate || b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5)
        .map((coord: any) => ({
          id: coord.id?.toString() || coord.userId?.toString() || '',
          name: coord.name || `${coord.firstName || ''} ${coord.lastName || ''}`.trim() || 'Unknown',
          email: coord.email || '',
          type: 'Coordinator' as const,
          signupDate: coord.joinDate || coord.created_at || new Date().toISOString(),
        }));

      // Get recent companies (last 5)
      const recentCompanies = companies
        .sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || a.partnershipDate || 0);
          const dateB = new Date(b.created_at || b.partnershipDate || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5)
        .map((company: any) => ({
          id: company.id?.toString() || company.userId?.toString() || '',
          name: company.companyName || company.name || 'Unknown Company',
          email: company.email || company.contactEmail || '',
          type: 'Company' as const,
          signupDate: company.created_at || company.partnershipDate || new Date().toISOString(),
        }));

      // Combine and sort by date
      const allSignups = [...recentStudents, ...recentCoordinators, ...recentCompanies].sort((a, b) => {
        const dateA = new Date(a.signupDate);
        const dateB = new Date(b.signupDate);
        return dateB.getTime() - dateA.getTime();
      });

      setNewSignups(allSignups.slice(0, 8));

      // Calculate monthly growth data for the line chart
      const currentYear = new Date().getFullYear();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Initialize monthly counts
      const monthlyCounts = {
        interns: new Array(12).fill(0),
        coordinators: new Array(12).fill(0),
        companies: new Array(12).fill(0),
      };

      // Calculate monthly counts for students/interns
      students.forEach((student: any) => {
        if (student.created_at) {
          const date = new Date(student.created_at);
          if (date.getFullYear() === currentYear) {
            const month = date.getMonth();
            monthlyCounts.interns[month]++;
          }
        }
      });

      // Calculate monthly counts for coordinators
      coordinators.forEach((coord: any) => {
        const dateStr = coord.joinDate || coord.created_at || coord.createdAt;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime()) && date.getFullYear() === currentYear) {
            const month = date.getMonth();
            monthlyCounts.coordinators[month]++;
          }
        }
      });
      
      console.log('📊 Coordinators monthly counts:', monthlyCounts.coordinators);
      console.log('📊 Total coordinators:', coordinators.length);

      // Calculate monthly counts for companies
      companies.forEach((company: any) => {
        const dateStr = company.joinDate || company.created_at || company.createdAt || company.partnershipDate;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime()) && date.getFullYear() === currentYear) {
            const month = date.getMonth();
            monthlyCounts.companies[month]++;
          }
        }
      });
      
      console.log('📊 Companies monthly counts:', monthlyCounts.companies);
      console.log('📊 Total companies:', companies.length);
      console.log('📊 Sample company data:', companies.length > 0 ? {
        id: companies[0].id,
        name: companies[0].name,
        joinDate: companies[0].joinDate,
        created_at: companies[0].created_at,
        partnershipDate: companies[0].partnershipDate,
      } : 'No companies');

      // Calculate cumulative counts for each month
      const cumulativeInterns = [];
      const cumulativeCoordinators = [];
      const cumulativeCompanies = [];
      
      let internSum = 0;
      let coordinatorSum = 0;
      let companySum = 0;

      for (let i = 0; i < 12; i++) {
        internSum += monthlyCounts.interns[i];
        coordinatorSum += monthlyCounts.coordinators[i];
        companySum += monthlyCounts.companies[i];
        
        cumulativeInterns.push(internSum);
        cumulativeCoordinators.push(coordinatorSum);
        cumulativeCompanies.push(companySum);
      }
      
      console.log('📊 Cumulative Coordinators:', cumulativeCoordinators);
      console.log('📊 Cumulative Interns:', cumulativeInterns);
      console.log('📊 Cumulative Companies:', cumulativeCompanies);

      // Store growth data for the line chart
      setGrowthData({
        monthlyInterns: cumulativeInterns,
        monthlyCoordinators: cumulativeCoordinators,
        monthlyCompanies: cumulativeCompanies,
        months,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set default values on error
      setStats({
        totalInterns: 0,
        totalCoordinators: 0,
        totalAdminCoordinators: 0,
        totalCompanies: 0,
        activeInternships: 0,
        pendingApplications: 0,
      });
      setNewSignups([]);
      setGrowthData({
        monthlyInterns: new Array(12).fill(0),
        monthlyCoordinators: new Array(12).fill(0),
        monthlyCompanies: new Array(12).fill(0),
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    change,
    onPress 
  }: {
    title: string;
    value: number;
    icon: string;
    color: string;
    change?: number;
    onPress?: () => void;
  }) => {
    const isPositive = (change || 0) > 0;
    const changeColor = isPositive ? '#34a853' : '#ea4335';
    
    return (
    <TouchableOpacity 
        style={styles.statCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.statCardContent}>
        <View style={styles.statCardHeader}>
          <View style={[styles.statIcon, { backgroundColor: color }]}>
              <MaterialIcons name={icon as any} size={24} color="#fff" />
          </View>
            <Text style={styles.statCardTitle}>{title}</Text>
            <View style={styles.statCardGraphIcon}>
              <Ionicons name="stats-chart" size={16} color="#878787" />
            </View>
        </View>
        <Text style={styles.statValue}>{value.toLocaleString()}</Text>
          <Text style={styles.statSubtext}>From last month</Text>
          <View style={styles.statCardTrend}>
            <Ionicons 
              name={isPositive ? "arrow-up" : "arrow-down"} 
              size={12} 
              color={changeColor} 
            />
            <Text style={[styles.statCardChange, { color: changeColor }]}>
              {Math.abs(change || 0)}%
            </Text>
      </View>
      </View>
    </TouchableOpacity>
  );
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F56E0F" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Statistics Grid - 3 Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Interns"
          value={stats.totalInterns}
          icon="school"
          color="#4285f4"
          change={stats.internsChange}
        />
        <StatCard
          title="Coordinators"
          value={stats.totalCoordinators}
          icon="people"
          color="#34a853"
          change={stats.coordinatorsChange}
        />
        <StatCard
          title="Companies"
          value={stats.totalCompanies}
          icon="business"
          color="#ea4335"
          change={stats.companiesChange}
        />
      </View>

      {/* Charts Section - Responsive Layout */}
      <View style={isSmallScreen ? styles.chartsColumn : styles.chartsRow}>
        {/* Line Chart */}
        <LineChart
          title="Yearly Growth Rate"
          data={[
            { label: 'Interns', values: growthData.monthlyInterns },
            { label: 'Coordinators', values: growthData.monthlyCoordinators },
            { label: 'Company', values: growthData.monthlyCompanies },
          ]}
          labels={growthData.months}
          colors={['#4285f4', '#34a853', '#ea4335']}
          height={isSmallScreen ? 280 : 320}
        />

        {/* Bar Chart */}
        <BarChart
          title="Weekly Statistics"
          value={stats.totalInterns.toString()}
          change={stats.internsChange}
          data={[stats.totalInterns, stats.totalCoordinators, stats.totalCompanies]}
          labels={['Interns', 'Coords', 'Companies']}
          colors={['#4285f4', '#34a853', '#ea4335']}
          height={isSmallScreen ? 280 : 320}
          />
        </View>

      {/* New Signups Table */}
      <View style={styles.tableSection}>
        <View style={styles.tableHeader}>
          <Text style={styles.sectionTitle}>Newly Signup Accounts</Text>
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#F56E0F" />
          </TouchableOpacity>
      </View>

        <View style={styles.tableCard}>
          {isSmallScreen ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Table Header */}
                <View style={styles.tableRowHeader}>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Name</Text>
                  <Text style={[styles.tableHeaderText, { width: 150 }]}>Email</Text>
                  <Text style={[styles.tableHeaderText, { width: 80 }]}>Type</Text>
                  <Text style={[styles.tableHeaderText, { width: 80 }]}>Date</Text>
            </View>
                
                {/* Table Rows */}
                <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
                  {newSignups.map((signup, index) => (
                    <View 
                      key={`signup-${signup.id}-${index}`} 
                      style={[
                        styles.tableRow,
                        index !== newSignups.length - 1 && styles.tableRowBorder
                      ]}
                    >
                      <Text style={[styles.tableCellText, { width: 100 }]} numberOfLines={1}>
                        {signup.name}
                      </Text>
                      <Text style={[styles.tableCellText, { width: 150, fontSize: 12 }]} numberOfLines={1}>
                        {signup.email}
                      </Text>
                      <View style={[styles.tableCellText, { width: 80 }]}>
                        <View style={[
                          styles.typeBadge,
                          { 
                            backgroundColor: signup.type === 'Intern' ? 'rgba(66, 133, 244, 0.2)' :
                                            signup.type === 'Company' ? 'rgba(234, 67, 53, 0.2)' :
                                            'rgba(52, 168, 83, 0.2)',
                            borderColor: signup.type === 'Intern' ? '#4285f4' :
                                        signup.type === 'Company' ? '#ea4335' :
                                        '#34a853',
                          }
                        ]}>
                          <Text style={[
                            styles.typeBadgeText,
                            { 
                              color: signup.type === 'Intern' ? '#4285f4' :
                                     signup.type === 'Company' ? '#ea4335' :
                                     '#34a853',
                            }
                          ]}>
                            {signup.type}
                          </Text>
            </View>
          </View>
                      <Text style={[styles.tableCellText, { width: 80, fontSize: 12 }]}>
                        {new Date(signup.signupDate).toLocaleDateString()}
                      </Text>
            </View>
                  ))}
                </ScrollView>
            </View>
            </ScrollView>
          ) : (
            <>
              {/* Table Header */}
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Name</Text>
                <Text style={[styles.tableHeaderText, { flex: 2.5 }]}>Email</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Type</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Date</Text>
          </View>
          
              {/* Table Rows */}
              <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
                {newSignups.map((signup, index) => (
                  <View 
                    key={`signup-${signup.id}-${index}`} 
                    style={[
                      styles.tableRow,
                      index !== newSignups.length - 1 && styles.tableRowBorder
                    ]}
                  >
                    <Text style={[styles.tableCellText, { flex: 2 }]} numberOfLines={1}>
                      {signup.name}
                    </Text>
                    <Text style={[styles.tableCellText, { flex: 2.5, fontSize: 12 }]} numberOfLines={1}>
                      {signup.email}
                    </Text>
                    <View style={[styles.tableCellText, { flex: 1.5 }]}>
                      <View style={[
                        styles.typeBadge,
                        { 
                          backgroundColor: signup.type === 'Intern' ? 'rgba(66, 133, 244, 0.2)' :
                                          signup.type === 'Company' ? 'rgba(234, 67, 53, 0.2)' :
                                          'rgba(52, 168, 83, 0.2)',
                          borderColor: signup.type === 'Intern' ? '#4285f4' :
                                      signup.type === 'Company' ? '#ea4335' :
                                      '#34a853',
                        }
                      ]}>
                        <Text style={[
                          styles.typeBadgeText,
                          { 
                            color: signup.type === 'Intern' ? '#4285f4' :
                                   signup.type === 'Company' ? '#ea4335' :
                                   '#34a853',
                          }
                        ]}>
                          {signup.type}
                        </Text>
            </View>
            </View>
                    <Text style={[styles.tableCellText, { flex: 1.5, fontSize: 12 }]}>
                      {new Date(signup.signupDate).toLocaleDateString()}
                    </Text>
          </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2A2A2E', // Dark background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#151419',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#878787', // Muted gray
  },
  welcomeSection: {
    padding: 24,
    backgroundColor: '#1B1B1E', // Dark secondary background
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#878787', // Muted gray
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    paddingHorizontal: isSmallScreen ? 12 : 20,
    marginBottom: isSmallScreen ? 16 : 20,
    gap: isSmallScreen ? 12 : 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 12,
    padding: isSmallScreen ? 16 : 20,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: isSmallScreen ? 0 : 0,
  },
  statCardContent: {
    flex: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statCardTitle: {
    flex: 1,
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
  },
  statCardGraphIcon: {
    marginLeft: 'auto',
  },
  statValue: {
    fontSize: isSmallScreen ? 28 : 32,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#878787', // Muted gray
    marginBottom: 8,
  },
  statCardTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statCardChange: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#878787', // Muted gray
    fontWeight: '500',
  },
  chartsRow: {
    flexDirection: 'row',
    paddingHorizontal: isSmallScreen ? 12 : 20,
    marginBottom: isSmallScreen ? 16 : 20,
    gap: isSmallScreen ? 12 : 16,
  },
  chartsColumn: {
    flexDirection: 'column',
    paddingHorizontal: isSmallScreen ? 12 : 20,
    marginBottom: isSmallScreen ? 16 : 20,
    gap: isSmallScreen ? 12 : 16,
  },
  chartsSection: {
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 20,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: isSmallScreen ? 12 : 20,
  },
  chartCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    marginBottom: 20,
    textAlign: 'center',
  },
  // Line Chart Styles
  lineChartCard: {
    flex: isSmallScreen ? 1 : 2,
    backgroundColor: '#1B1B1E',
    borderRadius: 12,
    padding: isSmallScreen ? 12 : 20,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: isSmallScreen ? 12 : 0,
  },
  lineChartHeader: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isSmallScreen ? 'flex-start' : 'center',
    marginBottom: isSmallScreen ? 12 : 20,
    gap: isSmallScreen ? 8 : 0,
  },
  lineChartTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#FBFBFB',
  },
  lineChartLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItemInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendTextInline: {
    fontSize: 12,
    color: '#878787',
    fontWeight: '500',
  },
  lineChartContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  lineChartScrollView: {
    flex: 1,
  },
  lineChartScrollContainer: {
    flex: 1,
    maxHeight: 400,
    minHeight: 300,
  },
  lineYAxisContainer: {
    width: 30,
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 20,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  lineYAxisLabel: {
    fontSize: 11,
    color: '#878787',
    fontWeight: '500',
  },
  lineChartArea: {
    flex: 1,
    position: 'relative',
    paddingLeft: 10,
    paddingTop: 20,
    paddingBottom: 40,
    minHeight: 200,
  },
  lineGridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    left: 0,
  },
  lineContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  lineSegment: {
    position: 'absolute',
    transformOrigin: 'left center',
    borderRadius: 1.5,
  },
  linePointTouchable: {
    position: 'absolute',
    zIndex: 10,
  },
  linePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#151419',
  },
  lineXAxisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingLeft: 40,
  },
  lineXAxisLabel: {
    fontSize: 11,
    color: '#878787',
    fontWeight: '500',
  },
  // Bar Chart Card Styles (Smaller)
  barChartCard: {
    flex: 1,
    backgroundColor: '#1B1B1E',
    borderRadius: 12,
    padding: isSmallScreen ? 12 : 20,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: isSmallScreen ? 12 : 0,
  },
  barChartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 12 : 16,
  },
  barChartCardTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#FBFBFB',
  },
  barChartCardValue: {
    marginBottom: 16,
  },
  barChartValueText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginBottom: 8,
  },
  barChartCardTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  barChartChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  barChartChangeSubtext: {
    fontSize: 12,
    color: '#878787',
    marginLeft: 4,
  },
  barChartSmallContainer: {
    flex: 1,
    marginTop: 10,
    minHeight: 150,
  },
  barChartSmall: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 150,
    paddingBottom: 30,
  },
  barGroupSmall: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapperSmall: {
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barSmall: {
    minHeight: 4,
  },
  barLabelSmall: {
    fontSize: 10,
    color: '#878787',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  barTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  // Tooltip Styles
  tooltip: {
    position: 'absolute',
    backgroundColor: '#1B1B1E',
    borderRadius: 8,
    padding: 12,
    minWidth: 120,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    zIndex: 1000,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginBottom: 8,
  },
  tooltipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  tooltipText: {
    fontSize: 12,
    color: '#FBFBFB',
    fontWeight: '500',
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F56E0F',
    marginTop: 4,
  },
  barTooltip: {
    position: 'absolute',
    backgroundColor: '#1B1B1E',
    borderRadius: 8,
    padding: 10,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    zIndex: 1000,
  },
  // Table Styles
  tableSection: {
    padding: isSmallScreen ? 12 : 20,
    marginBottom: isSmallScreen ? 16 : 20,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 12 : 20,
    flexWrap: 'wrap',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
  },
  viewAllText: {
    color: '#F56E0F',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  tableCard: {
    backgroundColor: '#1B1B1E',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tableRowHeader: {
    flexDirection: 'row',
    paddingVertical: isSmallScreen ? 12 : 16,
    paddingHorizontal: isSmallScreen ? 8 : 16,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  tableHeaderText: {
    fontSize: isSmallScreen ? 11 : 13,
    fontWeight: 'bold',
    color: '#F56E0F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    maxHeight: isSmallScreen ? 300 : 400,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: isSmallScreen ? 12 : 16,
    paddingHorizontal: isSmallScreen ? 8 : 16,
    alignItems: 'center',
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.1)',
  },
  tableCellText: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#FBFBFB',
    marginRight: isSmallScreen ? 4 : 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartVisual: {
    width: 200,
    height: 200,
    borderRadius: 100,
    position: 'relative',
    backgroundColor: '#151419',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartCenter: {
    backgroundColor: '#151419',
    position: 'absolute',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  pieChartCenterText: {
    fontSize: 12,
    color: '#878787',
    fontWeight: '500',
  },
  pieChartCenterValue: {
    fontSize: 18,
    color: '#FBFBFB',
    fontWeight: 'bold',
    marginTop: 4,
  },
  pieSegmentCircle: {
    position: 'absolute',
  },
  pieSlice: {
    position: 'absolute',
    overflow: 'hidden',
  },
  pieSliceMask: {
    position: 'absolute',
  },
  pieSliceOverlay: {
    position: 'absolute',
    overflow: 'hidden',
  },
  pieChart: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartInner: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  pieSliceContainer: {
    position: 'absolute',
  },
  pieSliceIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
  },
  pieSegmentContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  pieSegment: {
    position: 'absolute',
  },
  pieSegmentLabel: {
    position: 'absolute',
  },
  pieSegmentText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  pieLegend: {
    marginTop: 20,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
    color: '#F56E0F', // Primary orange
    fontWeight: 'bold',
    marginRight: 8,
  },
  legendPercentage: {
    fontSize: 12,
    color: '#878787', // Muted gray
  },
});

