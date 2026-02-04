import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { restaurantPanelAPI } from '../../src/services/api';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';

const { width } = Dimensions.get('window');
const chartWidth = width - SPACING.lg * 2;

interface ReportData {
  period: string;
  summary: {
    total_orders: number;
    completed_orders: number;
    cancelled_orders: number;
    pending_orders: number;
    completion_rate: number;
    total_revenue: number;
    avg_order_value: number;
    avg_rating: number;
    total_reviews: number;
  };
  top_items: Array<{ name: string; quantity: number; revenue: number }>;
  chart_data: Array<{ date: string; orders: number; revenue: number }>;
  payment_methods: Array<{ method: string; count: number; total: number }>;
  delivery_modes: Array<{ mode: string; count: number }>;
  peak_hours: Array<{ hour: number; orders: number }>;
}

const PERIODS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
  { id: 'year', label: 'سنة' },
];

const chartConfig = {
  backgroundGradientFrom: COLORS.surface,
  backgroundGradientTo: COLORS.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 150, 136, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '5',
    strokeWidth: '2',
    stroke: COLORS.primary,
  },
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: COLORS.divider,
  },
};

export default function RestaurantReports() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [activeChartTab, setActiveChartTab] = useState<'orders' | 'revenue'>('orders');
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    try {
      const data = await restaurantPanelAPI.getReports(selectedPeriod);
      setReport(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReport();
    }, [selectedPeriod])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReport();
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'today': return 'اليوم';
      case 'week': return 'الأسبوع';
      case 'month': return 'الشهر';
      case 'year': return 'السنة';
      default: return period;
    }
  };

  const exportToPDF = async () => {
    if (!report) return;

    setExporting(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Arial', sans-serif;
              padding: 20px;
              direction: rtl;
              background: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #009688;
            }
            .header h1 {
              color: #009688;
              margin-bottom: 5px;
            }
            .header p {
              color: #666;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 18px;
              color: #333;
              margin-bottom: 15px;
              padding-bottom: 5px;
              border-bottom: 1px solid #eee;
            }
            .summary-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              margin-bottom: 20px;
            }
            .summary-card {
              flex: 1;
              min-width: 120px;
              background: #f5f5f5;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
            }
            .summary-value {
              font-size: 24px;
              font-weight: bold;
              color: #009688;
            }
            .summary-label {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              padding: 12px;
              text-align: right;
              border-bottom: 1px solid #eee;
            }
            th {
              background: #f5f5f5;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🍔 يلا ناكل؟</h1>
            <p>تقرير ${getPeriodLabel(selectedPeriod)} - ${new Date().toLocaleDateString('ar-SA')}</p>
          </div>

          <div class="section">
            <h2 class="section-title">ملخص الأداء</h2>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-value">${report.summary.total_orders}</div>
                <div class="summary-label">إجمالي الطلبات</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">${report.summary.completed_orders}</div>
                <div class="summary-label">طلبات مكتملة</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">${report.summary.completion_rate}%</div>
                <div class="summary-label">نسبة الإكمال</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">${report.summary.total_revenue.toLocaleString()}</div>
                <div class="summary-label">الإيرادات (ل.س)</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">${report.summary.avg_order_value.toLocaleString()}</div>
                <div class="summary-label">متوسط الطلب (ل.س)</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">${report.summary.avg_rating}</div>
                <div class="summary-label">التقييم</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">الأصناف الأكثر مبيعاً</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>الصنف</th>
                  <th>الكمية</th>
                  <th>الإيرادات</th>
                </tr>
              </thead>
              <tbody>
                ${report.top_items.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.revenue.toLocaleString()} ل.س</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2 class="section-title">طرق الدفع</h2>
            <table>
              <thead>
                <tr>
                  <th>الطريقة</th>
                  <th>عدد الطلبات</th>
                  <th>المجموع</th>
                </tr>
              </thead>
              <tbody>
                ${report.payment_methods.map(method => `
                  <tr>
                    <td>${method.method === 'COD' ? 'كاش عند التسليم' : 'ShamCash'}</td>
                    <td>${method.count}</td>
                    <td>${method.total.toLocaleString()} ل.س</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            تم إنشاء التقرير بواسطة تطبيق يلا ناكل؟ - ${new Date().toLocaleString('ar-SA')}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      if (Platform.OS === 'web') {
        // For web, open in new tab
        window.open(uri, '_blank');
      } else {
        // For mobile, share the PDF
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `تقرير ${getPeriodLabel(selectedPeriod)}`,
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('تم', 'تم حفظ التقرير بنجاح');
        }
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('خطأ', 'فشل في تصدير التقرير');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toLocaleString();
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'COD': return 'كاش عند التسليم';
      case 'SHAMCASH': return 'ShamCash';
      default: return method;
    }
  };

  const getDeliveryModeLabel = (mode: string) => {
    switch (mode) {
      case 'restaurant_driver': return 'سائق المطعم';
      case 'platform_driver': return 'سائق المنصة';
      default: return mode;
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 ص';
    if (hour === 12) return '12 م';
    if (hour < 12) return `${hour} ص`;
    return `${hour - 12} م`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>جاري تحميل التقرير...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>التقارير والإحصائيات</Text>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={exportToPDF}
            disabled={exporting || !report}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={COLORS.textWhite} />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={COLORS.textWhite} />
                <Text style={styles.exportButtonText}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>تحليل أداء مطعمك</Text>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {PERIODS.map((period) => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.periodButton,
                selectedPeriod === period.id && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.id && styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.revenueCard]}>
            <LinearGradient
              colors={[COLORS.success, '#43A047']}
              style={styles.summaryCardGradient}
            >
              <View style={styles.summaryIconContainer}>
                <Ionicons name="cash" size={24} color="#FFF" />
              </View>
              <Text style={styles.summaryValue}>
                {formatCurrency(report?.summary.total_revenue || 0)}
              </Text>
              <Text style={styles.summaryLabel}>الإيرادات</Text>
            </LinearGradient>
          </View>

          <View style={[styles.summaryCard, styles.ordersCard]}>
            <LinearGradient
              colors={[COLORS.info, '#1976D2']}
              style={styles.summaryCardGradient}
            >
              <View style={styles.summaryIconContainer}>
                <Ionicons name="receipt" size={24} color="#FFF" />
              </View>
              <Text style={styles.summaryValue}>{report?.summary.total_orders || 0}</Text>
              <Text style={styles.summaryLabel}>إجمالي الطلبات</Text>
            </LinearGradient>
          </View>

          <View style={[styles.summaryCard, styles.avgCard]}>
            <LinearGradient
              colors={[COLORS.accent, '#F57C00']}
              style={styles.summaryCardGradient}
            >
              <View style={styles.summaryIconContainer}>
                <Ionicons name="trending-up" size={24} color="#FFF" />
              </View>
              <Text style={styles.summaryValue}>
                {formatCurrency(report?.summary.avg_order_value || 0)}
              </Text>
              <Text style={styles.summaryLabel}>متوسط الطلب</Text>
            </LinearGradient>
          </View>

          <View style={[styles.summaryCard, styles.ratingCard]}>
            <LinearGradient
              colors={['#FFD700', '#FFC107']}
              style={styles.summaryCardGradient}
            >
              <View style={styles.summaryIconContainer}>
                <Ionicons name="star" size={24} color="#FFF" />
              </View>
              <Text style={styles.summaryValue}>
                {report?.summary.avg_rating || 0}
              </Text>
              <Text style={styles.summaryLabel}>التقييم ({report?.summary.total_reviews})</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Charts Section */}
        {report?.chart_data && report.chart_data.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الرسم البياني</Text>
            
            {/* Chart Tabs */}
            <View style={styles.chartTabs}>
              <TouchableOpacity
                style={[styles.chartTab, activeChartTab === 'orders' && styles.chartTabActive]}
                onPress={() => setActiveChartTab('orders')}
              >
                <Ionicons 
                  name="receipt-outline" 
                  size={18} 
                  color={activeChartTab === 'orders' ? COLORS.primary : COLORS.textSecondary} 
                />
                <Text style={[styles.chartTabText, activeChartTab === 'orders' && styles.chartTabTextActive]}>
                  الطلبات
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartTab, activeChartTab === 'revenue' && styles.chartTabActive]}
                onPress={() => setActiveChartTab('revenue')}
              >
                <Ionicons 
                  name="cash-outline" 
                  size={18} 
                  color={activeChartTab === 'revenue' ? COLORS.success : COLORS.textSecondary} 
                />
                <Text style={[styles.chartTabText, activeChartTab === 'revenue' && styles.chartTabTextActive]}>
                  الإيرادات
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chartCard}>
              {activeChartTab === 'orders' ? (
                <LineChart
                  data={{
                    labels: report.chart_data.slice(-7).map(d => d.date.slice(5)),
                    datasets: [{
                      data: report.chart_data.slice(-7).map(d => d.orders || 0),
                      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                      strokeWidth: 2,
                    }],
                  }}
                  width={chartWidth}
                  height={200}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                  }}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines={false}
                />
              ) : (
                <BarChart
                  data={{
                    labels: report.chart_data.slice(-7).map(d => d.date.slice(5)),
                    datasets: [{
                      data: report.chart_data.slice(-7).map(d => (d.revenue || 0) / 1000),
                    }],
                  }}
                  width={chartWidth}
                  height={200}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                  }}
                  style={styles.chart}
                  showValuesOnTopOfBars
                  withInnerLines={false}
                  yAxisLabel=""
                  yAxisSuffix="K"
                />
              )}
            </View>
          </View>
        )}

        {/* Orders Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>حالة الطلبات</Text>
          
          {/* Pie Chart for Order Status */}
          {report?.summary && (report.summary.completed_orders > 0 || report.summary.pending_orders > 0 || report.summary.cancelled_orders > 0) && (
            <View style={styles.pieChartContainer}>
              <PieChart
                data={[
                  {
                    name: 'مكتمل',
                    population: report.summary.completed_orders || 0,
                    color: COLORS.success,
                    legendFontColor: COLORS.textSecondary,
                    legendFontSize: 12,
                  },
                  {
                    name: 'قيد التنفيذ',
                    population: report.summary.pending_orders || 0,
                    color: COLORS.warning,
                    legendFontColor: COLORS.textSecondary,
                    legendFontSize: 12,
                  },
                  {
                    name: 'ملغي',
                    population: report.summary.cancelled_orders || 0,
                    color: COLORS.error,
                    legendFontColor: COLORS.textSecondary,
                    legendFontSize: 12,
                  },
                ]}
                width={chartWidth}
                height={160}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          )}
          
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.statusLabel}>مكتمل</Text>
                <Text style={styles.statusValue}>{report?.summary.completed_orders || 0}</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.warning }]} />
                <Text style={styles.statusLabel}>قيد التنفيذ</Text>
                <Text style={styles.statusValue}>{report?.summary.pending_orders || 0}</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.error }]} />
                <Text style={styles.statusLabel}>ملغي</Text>
                <Text style={styles.statusValue}>{report?.summary.cancelled_orders || 0}</Text>
              </View>
            </View>

            {/* Completion Rate Bar */}
            <View style={styles.completionContainer}>
              <View style={styles.completionHeader}>
                <Text style={styles.completionRate}>{report?.summary.completion_rate || 0}%</Text>
                <Text style={styles.completionLabel}>نسبة الإكمال</Text>
              </View>
              <View style={styles.completionBar}>
                <View
                  style={[
                    styles.completionFill,
                    { width: `${report?.summary.completion_rate || 0}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Top Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الأصناف الأكثر مبيعاً</Text>
          <View style={styles.topItemsCard}>
            {report?.top_items && report.top_items.length > 0 ? (
              report.top_items.map((item, index) => (
                <View key={index} style={styles.topItemRow}>
                  <View style={styles.topItemRank}>
                    <Text style={styles.topItemRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.topItemInfo}>
                    <Text style={styles.topItemName}>{item.name}</Text>
                    <Text style={styles.topItemStats}>
                      {item.quantity} وحدة • {formatCurrency(item.revenue)} ل.س
                    </Text>
                  </View>
                  <View style={styles.topItemBadge}>
                    <Ionicons
                      name={index === 0 ? 'trophy' : index === 1 ? 'medal' : 'ribbon'}
                      size={20}
                      color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}
                    />
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={40} color={COLORS.textLight} />
                <Text style={styles.emptyText}>لا توجد بيانات كافية</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>طرق الدفع</Text>
          <View style={styles.paymentCard}>
            {report?.payment_methods && report.payment_methods.length > 0 ? (
              report.payment_methods.map((method, index) => (
                <View key={index} style={styles.paymentRow}>
                  <View style={styles.paymentInfo}>
                    <Ionicons
                      name={method.method === 'COD' ? 'wallet' : 'card'}
                      size={24}
                      color={method.method === 'COD' ? COLORS.warning : COLORS.success}
                    />
                    <View style={styles.paymentDetails}>
                      <Text style={styles.paymentLabel}>{getPaymentMethodLabel(method.method)}</Text>
                      <Text style={styles.paymentCount}>{method.count} طلب</Text>
                    </View>
                  </View>
                  <Text style={styles.paymentTotal}>{formatCurrency(method.total)} ل.س</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="card-outline" size={40} color={COLORS.textLight} />
                <Text style={styles.emptyText}>لا توجد بيانات</Text>
              </View>
            )}
          </View>
        </View>

        {/* Delivery Modes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>طرق التوصيل</Text>
          <View style={styles.deliveryCard}>
            {report?.delivery_modes && report.delivery_modes.length > 0 ? (
              <View style={styles.deliveryGrid}>
                {report.delivery_modes.map((mode, index) => (
                  <View key={index} style={styles.deliveryItem}>
                    <View
                      style={[
                        styles.deliveryIcon,
                        {
                          backgroundColor:
                            mode.mode === 'restaurant_driver'
                              ? `${COLORS.primary}15`
                              : `${COLORS.info}15`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={mode.mode === 'restaurant_driver' ? 'bicycle' : 'globe'}
                        size={28}
                        color={mode.mode === 'restaurant_driver' ? COLORS.primary : COLORS.info}
                      />
                    </View>
                    <Text style={styles.deliveryCount}>{mode.count}</Text>
                    <Text style={styles.deliveryLabel}>{getDeliveryModeLabel(mode.mode)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={40} color={COLORS.textLight} />
                <Text style={styles.emptyText}>لا توجد بيانات</Text>
              </View>
            )}
          </View>
        </View>

        {/* Peak Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>أوقات الذروة</Text>
          <View style={styles.peakCard}>
            {report?.peak_hours && report.peak_hours.length > 0 ? (
              report.peak_hours.map((peak, index) => (
                <View key={index} style={styles.peakRow}>
                  <View style={styles.peakRank}>
                    <Ionicons
                      name="time"
                      size={20}
                      color={index === 0 ? COLORS.error : COLORS.warning}
                    />
                  </View>
                  <View style={styles.peakInfo}>
                    <Text style={styles.peakTime}>{formatHour(peak.hour)}</Text>
                    <Text style={styles.peakOrders}>{peak.orders} طلب</Text>
                  </View>
                  <View
                    style={[
                      styles.peakBar,
                      {
                        width: `${(peak.orders / (report.peak_hours[0]?.orders || 1)) * 100}%`,
                        backgroundColor: index === 0 ? COLORS.error : COLORS.warning,
                      },
                    ]}
                  />
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={40} color={COLORS.textLight} />
                <Text style={styles.emptyText}>لا توجد بيانات كافية</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textWhite,
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
    marginTop: 4,
  },

  // Period Selector
  periodSelector: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.surface,
  },
  periodButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },

  // Chart Styles
  chartTabs: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
  },
  chartTab: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
  },
  chartTabActive: {
    backgroundColor: COLORS.surface,
  },
  chartTabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  chartTabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  chart: {
    borderRadius: RADIUS.md,
  },
  pieChartContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.small,
  },

  // Summary Grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  summaryCard: {
    width: (width - SPACING.md * 3) / 2,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  summaryCardGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  revenueCard: {},
  ordersCard: {},
  avgCard: {},
  ratingCard: {},

  // Section
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },

  // Status Card
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  statusRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: SPACING.sm,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  completionContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.lg,
  },
  completionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  completionLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  completionRate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  completionBar: {
    height: 8,
    backgroundColor: COLORS.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },

  // Top Items
  topItemsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  topItemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  topItemRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topItemRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  topItemInfo: {
    flex: 1,
    marginRight: SPACING.md,
    alignItems: 'flex-end',
  },
  topItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  topItemStats: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  topItemBadge: {
    marginLeft: SPACING.sm,
  },

  // Payment Card
  paymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  paymentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  paymentInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  paymentDetails: {
    alignItems: 'flex-end',
  },
  paymentLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  paymentCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  paymentTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.success,
  },

  // Delivery Card
  deliveryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  deliveryGrid: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
  },
  deliveryItem: {
    alignItems: 'center',
  },
  deliveryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  deliveryCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  deliveryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Peak Card
  peakCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  peakRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    position: 'relative',
  },
  peakRank: {
    marginLeft: SPACING.md,
  },
  peakInfo: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  peakTime: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  peakOrders: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  peakBar: {
    position: 'absolute',
    left: 0,
    top: '50%',
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
});
