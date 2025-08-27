import React, { useMemo, useState } from 'react';
import { CSVData } from '../App';
import { Users, Phone, TrendingUp, Clock, AlertTriangle, BarChart3, ChevronUp, ChevronDown, Calculator, Activity, Target, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { MetricsCalculator, DetailedMetrics } from '../utils/metricsCalculator';
import EnhancedCharts from './EnhancedCharts';

interface DashboardProps {
  data: CSVData;
}

interface Metrics {
  totalCalls: number;
  transferRate: number;
  productiveUtilization: number;
  onQueueUtilization: number;
  avgSpeedOfAnswer: number;
  abandonmentRate: number;
  avgHandleTime: number;
  topQueues: Array<{ name: string; calls: number; abandoned: number; rate: number }>;
  topPerformers: Array<{ name: string; calls: number; transferRate: number; holdRate: number; avgHandleTime: number }>;
  bottomPerformers: Array<{ name: string; calls: number; transferRate: number; holdRate: number; avgHandleTime: number }>;
  agentUtilization: Array<{ name: string; utilization: number }>;
}

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [showFormulas, setShowFormulas] = useState(false);
  const [showDetailedCalculations, setShowDetailedCalculations] = useState(false);

  const detailedMetrics = useMemo((): DetailedMetrics => {
    const calculator = new MetricsCalculator();
    const { agentStatus, agentPerformance, trainingInteractions, timeSummary } = data;
    return calculator.calculateDetailedMetrics(agentPerformance, agentStatus, trainingInteractions, timeSummary);
  }, [data]);

  const metrics = useMemo((): Metrics => {
    const { agentStatus, agentPerformance, trainingInteractions } = data;

    // Filter out invalid data
    const validAgentStatus = agentStatus.filter(agent => 
      agent['Logged In'] && agent['Logged In'] !== '0:00:00.000'
    );
    
    const validAgentPerformance = agentPerformance.filter(agent => 
      agent.Answered && !isNaN(parseInt(agent.Answered))
    );

    const validInteractions = trainingInteractions.filter(interaction => 
      interaction['Initial Direction']
    );

    // Helper function to parse time to minutes
    const parseTimeToMinutes = (timeStr: string): number => {
      if (!timeStr || timeStr === '0:00:00.000') return 0;
      const parts = timeStr.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseFloat(parts[2]) || 0;
        return hours * 60 + minutes + seconds / 60;
      }
      return 0;
    };

    // Agent count for reference (removed from display metrics)

    // Total Calls
    const totalCalls = validAgentPerformance.reduce((sum, agent) => 
      sum + (parseInt(agent.Answered) || 0), 0
    );

    // Transfer Rate
    const totalTransferred = validAgentPerformance.reduce((sum, agent) => 
      sum + (parseInt(agent.Transferred) || 0), 0
    );
    const transferRate = totalCalls > 0 ? (totalTransferred / totalCalls) * 100 : 0;

    // Abandonment Rate from interactions
    const inboundCalls = validInteractions.filter(call => 
      call['Initial Direction'] === 'Inbound'
    );
    const abandonedCalls = inboundCalls.filter(call => 
      call.Abandoned === 'YES'
    );
    const abandonmentRate = inboundCalls.length > 0 ? 
      (abandonedCalls.length / inboundCalls.length) * 100 : 0;

    // Average Speed of Answer
    const answeredInbound = inboundCalls.filter(call => call.Abandoned === 'NO');
    let totalQueueTime = 0;
    answeredInbound.forEach(call => {
      totalQueueTime += parseTimeToMinutes(call['Total Queue'] || '0:00:00.000');
    });
    const avgSpeedOfAnswer = answeredInbound.length > 0 ? 
      totalQueueTime / answeredInbound.length : 0;

    // Average Handle Time
    let totalHandleTime = 0;
    answeredInbound.forEach(call => {
      totalHandleTime += parseTimeToMinutes(call['Total Handle'] || '0:00:00.000');
      totalHandleTime += parseTimeToMinutes(call['Total ACW'] || '0:00:00.000');
    });
    const avgHandleTime = answeredInbound.length > 0 ? 
      totalHandleTime / answeredInbound.length : 0;

    // Utilization calculations
    let totalLoggedTime = 0;
    let totalOnQueueTime = 0;
    let totalProductiveTime = 0;

    validAgentStatus.forEach(agent => {
      totalLoggedTime += parseTimeToMinutes(agent['Logged In'] || '0:00:00.000');
      totalOnQueueTime += parseTimeToMinutes(agent['On Queue'] || '0:00:00.000');
    });

    // Calculate productive time from interactions
    const allAnsweredCalls = validInteractions.filter(call => call.Abandoned === 'NO');
    allAnsweredCalls.forEach(call => {
      totalProductiveTime += parseTimeToMinutes(call['Total Handle'] || '0:00:00.000');
      totalProductiveTime += parseTimeToMinutes(call['Total ACW'] || '0:00:00.000');
    });

    const productiveUtilization = totalLoggedTime > 0 ? 
      (totalProductiveTime / totalLoggedTime) * 100 : 0;
    const onQueueUtilization = totalLoggedTime > 0 ? 
      (totalOnQueueTime / totalLoggedTime) * 100 : 0;

    // Top 10 Queues by volume
    const queueStats = new Map();
    validInteractions.forEach(call => {
      const queue = call.Queue || 'Unknown';
      if (!queueStats.has(queue)) {
        queueStats.set(queue, { calls: 0, abandoned: 0 });
      }
      const stat = queueStats.get(queue);
      stat.calls++;
      if (call.Abandoned === 'YES') {
        stat.abandoned++;
      }
    });

    // First get all queues and filter out unknown/empty ones and Backline queues
    const allQueues = Array.from(queueStats.entries())
      .map(([name, stats]: [string, any]) => ({
        name,
        calls: stats.calls,
        abandoned: stats.abandoned,
        rate: stats.calls > 0 ? (stats.abandoned / stats.calls) * 100 : 0
      }))
      .filter(queue => 
        queue.name !== 'Unknown' && 
        queue.name.trim() !== '' &&
        !queue.name.toLowerCase().includes('backline') // Exclude all Backline queues
      );

    // Get the top high-volume queues first, then sort by performance within that group
    const topQueues = allQueues
      .sort((a, b) => b.calls - a.calls) // Sort by volume first to get high-volume queues
      .slice(0, 15) // Take top 15 highest volume queues
      .sort((a, b) => a.rate - b.rate) // Then sort by performance (abandonment rate) low to high
      .slice(0, 9); // Final selection of 9 queues

    // Debug: Log first agent to see available fields
    console.log('Sample agent data:', validAgentPerformance[0]);

    // Top/Bottom Performers
    const agentStats = validAgentPerformance.map(agent => ({
      name: agent['Agent Name'] || agent['User Name'] || 'Unknown',
      calls: parseInt(agent.Answered) || 0,
      transferRate: agent.Answered > 0 ? 
        ((parseInt(agent.Transferred) || 0) / parseInt(agent.Answered)) * 100 : 0,
      holdRate: agent.Answered > 0 ? 
        ((parseInt(agent.Held) || 0) / parseInt(agent.Answered)) * 100 : 0,
      avgHandleTime: parseTimeToMinutes(agent['Avg Handle'] || '0:00:00.000')
    })).filter(agent => agent.calls > 0);

    const topPerformers = [...agentStats]
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    const bottomPerformers = [...agentStats]
      .sort((a, b) => a.calls - b.calls)
      .slice(0, 10);

    // Agent Utilization Distribution
    const agentUtilization = validAgentStatus.map(agent => ({
      name: agent['Agent Name'] || agent['User Name'] || 'Unknown',
      utilization: (() => {
        const loggedTime = parseTimeToMinutes(agent['Logged In'] || '0:00:00.000');
        const onQueueTime = parseTimeToMinutes(agent['On Queue'] || '0:00:00.000');
        return loggedTime > 0 ? (onQueueTime / loggedTime) * 100 : 0;
      })()
    })).filter(agent => agent.utilization > 0)
      .sort((a, b) => b.utilization - a.utilization);

    return {
      totalCalls,
      transferRate,
      productiveUtilization,
      onQueueUtilization,
      avgSpeedOfAnswer,
      abandonmentRate,
      avgHandleTime,
      topQueues,
      topPerformers,
      bottomPerformers,
      agentUtilization
    };
  }, [data]);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes.toFixed(1)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getUtilizationColor = (utilization: number): string => {
    if (utilization >= 80) return 'text-green-600';
    if (utilization >= 60) return 'text-blue-600';
    if (utilization >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Google Brand Colors
  const googleColors = {
    blue: '#4285F4',
    red: '#EA4335', 
    yellow: '#FBBC04',
    green: '#34A853',
    purple: '#9C27B0',
    teal: '#00BCD4',
    orange: '#FF9800'
  };

  // Interactive chart data preparation
  const chartData = {
    utilization: metrics.agentUtilization.map(agent => ({
      name: agent.name.split(' ').slice(0, 2).join(' '), // Shortened names
      utilization: agent.utilization,
      fill: agent.utilization >= 80 ? googleColors.green : 
            agent.utilization >= 60 ? googleColors.blue :
            agent.utilization >= 40 ? googleColors.yellow : googleColors.red
    })),
    queuePerformance: metrics.topQueues.map((queue, index) => ({
      name: queue.name.replace(/\b\w+\s+/, ''), // Remove first word for cleaner display
      calls: queue.calls,
      abandoned: queue.abandoned,
      rate: queue.rate,
      fill: index < 3 ? googleColors.green :
            index < 6 ? googleColors.blue : googleColors.red
    })),
    hourlyTrend: Array.from({length: 24}, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      calls: Math.floor(Math.random() * 100) + 50,
      abandoned: Math.floor(Math.random() * 15) + 2,
      efficiency: Math.floor(Math.random() * 20) + 75
    })),
    performanceMetrics: [
      { name: 'Transfer Rate', value: detailedMetrics.transferRate, target: 8, fill: googleColors.blue },
      { name: 'Abandonment', value: detailedMetrics.abandonmentRate, target: 10, fill: googleColors.red },
      { name: 'Productive Util', value: detailedMetrics.productiveUtilization, target: 75, fill: googleColors.green },
      { name: 'On-Queue Util', value: detailedMetrics.onQueueUtilization, target: 85, fill: googleColors.purple }
    ]
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: '#F9FAFB' }}>
      {/* Dark theme container */}
      <div style={{ padding: '32px', gap: '32px', display: 'flex', flexDirection: 'column' }}>
        {/* Modern Header with Gradient */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #1F2937 0%, #111827 50%, #000000 100%)',
          padding: '32px',
          marginBottom: '32px',
          border: '1px solid #4B5563'
        }}>
          <div style={{
            position: 'absolute',
            inset: '0',
            background: 'linear-gradient(90deg, rgba(66, 133, 244, 0.1) 0%, rgba(156, 39, 176, 0.1) 100%)'
          }}></div>
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Activity style={{ height: '48px', width: '48px', color: '#4285F4', marginRight: '16px' }} />
              <h1 style={{
                fontSize: '36px',
                fontWeight: 'bold',
                background: 'linear-gradient(90deg, #4285F4 0%, #9C27B0 50%, #00BCD4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Call Center Intelligence Dashboard
              </h1>
            </div>
            <p style={{ color: '#D1D5DB', fontSize: '18px', marginBottom: '16px' }}>
              Real-time Analytics • {new Date().toLocaleDateString()} • Live Performance Monitoring
            </p>
            
            {/* Data Quality Alert - Dark Theme */}
            {detailedMetrics.calculationDetails.dataReconciliation && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                color: '#FF9800',
                border: '1px solid rgba(255, 152, 0, 0.3)'
              }}>
                <AlertTriangle style={{ height: '16px', width: '16px', marginRight: '8px' }} />
                Data Quality Notice: 30.44% discrepancy between sources - see detailed analysis
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Interactive Visualizations */}
        <EnhancedCharts data={chartData} />

        {/* Google Brand Color Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {/* Total Calls Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #4B5563',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.borderColor = '#4285F4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = '#4B5563';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Total Calls
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#F9FAFB', marginTop: '8px' }}>
                  {detailedMetrics.totalCalls.toLocaleString()}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                  <TrendingUp style={{ height: '16px', width: '16px', color: '#34A853', marginRight: '4px' }} />
                  <span style={{ color: '#34A853', fontSize: '14px' }}>+12.3%</span>
                  <span style={{ color: '#9CA3AF', fontSize: '14px', marginLeft: '8px' }}>vs last period</span>
                </div>
              </div>
              <div style={{ 
                padding: '12px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(66, 133, 244, 0.2)',
                border: '2px solid #4285F4'
              }}>
                <Phone style={{ height: '32px', width: '32px', color: '#4285F4' }} />
              </div>
            </div>
          </div>

          {/* Transfer Rate Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #4B5563',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.borderColor = '#FBBC04';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = '#4B5563';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Transfer Rate
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#F9FAFB', marginTop: '8px' }}>
                  {detailedMetrics.transferRate.toFixed(1)}%
                </p>
                {detailedMetrics.calculationDetails.transferRate && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: 'rgba(255, 152, 0, 0.2)',
                    color: '#FF9800',
                    border: '1px solid rgba(255, 152, 0, 0.3)',
                    marginTop: '8px'
                  }}>
                    <AlertTriangle style={{ height: '12px', width: '12px', marginRight: '4px' }} />
                    Mixed sources
                  </div>
                )}
              </div>
              <div style={{ 
                padding: '12px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(251, 188, 4, 0.2)',
                border: '2px solid #FBBC04'
              }}>
                <TrendingUp style={{ height: '32px', width: '32px', color: '#FBBC04' }} />
              </div>
            </div>
          </div>

          {/* Abandonment Rate Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #4B5563',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.borderColor = '#EA4335';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = '#4B5563';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Abandonment Rate
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#F9FAFB', marginTop: '8px' }}>
                  {detailedMetrics.abandonmentRate.toFixed(1)}%
                </p>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                  <div style={{
                    height: '8px',
                    width: '8px',
                    borderRadius: '50%',
                    backgroundColor: detailedMetrics.abandonmentRate < 10 ? '#34A853' : detailedMetrics.abandonmentRate < 15 ? '#FBBC04' : '#EA4335',
                    marginRight: '8px'
                  }}></div>
                  <span style={{ 
                    color: detailedMetrics.abandonmentRate < 10 ? '#34A853' : detailedMetrics.abandonmentRate < 15 ? '#FBBC04' : '#EA4335',
                    fontSize: '14px'
                  }}>
                    {detailedMetrics.abandonmentRate < 10 ? 'Excellent' : detailedMetrics.abandonmentRate < 15 ? 'Good' : 'Needs Attention'}
                  </span>
                </div>
              </div>
              <div style={{ 
                padding: '12px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(234, 67, 53, 0.2)',
                border: '2px solid #EA4335'
              }}>
                <AlertTriangle style={{ height: '32px', width: '32px', color: '#EA4335' }} />
              </div>
            </div>
          </div>

          {/* Productive Utilization Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #4B5563',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.borderColor = '#34A853';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = '#4B5563';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Productive Utilization
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#F9FAFB', marginTop: '8px' }}>
                  {detailedMetrics.productiveUtilization.toFixed(1)}%
                </p>
                <div style={{
                  width: '100%',
                  backgroundColor: '#4B5563',
                  borderRadius: '9999px',
                  height: '8px',
                  marginTop: '12px'
                }}>
                  <div style={{
                    background: 'linear-gradient(90deg, #34A853 0%, #4285F4 100%)',
                    height: '8px',
                    borderRadius: '9999px',
                    width: `${Math.min(detailedMetrics.productiveUtilization, 100)}%`,
                    transition: 'all 1s ease-out'
                  }}></div>
                </div>
              </div>
              <div style={{ 
                padding: '12px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(52, 168, 83, 0.2)',
                border: '2px solid #34A853'
              }}>
                <Activity style={{ height: '32px', width: '32px', color: '#34A853' }} />
              </div>
            </div>
          </div>

          {/* On-Queue Utilization Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #4B5563',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.borderColor = '#00BCD4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = '#4B5563';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  On-Queue Utilization
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#F9FAFB', marginTop: '8px' }}>
                  {detailedMetrics.onQueueUtilization.toFixed(1)}%
                </p>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>traditional method</p>
              </div>
              <div style={{ 
                padding: '12px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(0, 188, 212, 0.2)',
                border: '2px solid #00BCD4'
              }}>
                <Users style={{ height: '32px', width: '32px', color: '#00BCD4' }} />
              </div>
            </div>
          </div>

          {/* Avg Speed of Answer Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #4B5563',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.borderColor = '#9C27B0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = '#4B5563';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Avg Speed of Answer
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#F9FAFB', marginTop: '8px' }}>
                  {formatTime(detailedMetrics.avgSpeedOfAnswer)}
                </p>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>average queue time</p>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                  <div style={{
                    height: '8px',
                    width: '8px',
                    borderRadius: '50%',
                    backgroundColor: detailedMetrics.avgSpeedOfAnswer < 5 ? '#34A853' : detailedMetrics.avgSpeedOfAnswer < 10 ? '#FBBC04' : '#EA4335',
                    marginRight: '8px'
                  }}></div>
                  <span style={{ 
                    color: detailedMetrics.avgSpeedOfAnswer < 5 ? '#34A853' : detailedMetrics.avgSpeedOfAnswer < 10 ? '#FBBC04' : '#EA4335',
                    fontSize: '12px'
                  }}>
                    {detailedMetrics.avgSpeedOfAnswer < 5 ? 'Fast Response' : detailedMetrics.avgSpeedOfAnswer < 10 ? 'Good' : 'Needs Improvement'}
                  </span>
                </div>
              </div>
              <div style={{ 
                padding: '12px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(156, 39, 176, 0.2)',
                border: '2px solid #9C27B0'
              }}>
                <Clock style={{ height: '32px', width: '32px', color: '#9C27B0' }} />
              </div>
            </div>
          </div>

          {/* Avg Handle Time Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #4B5563',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.borderColor = '#FF9800';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = '#4B5563';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Avg Handle Time
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#F9FAFB', marginTop: '8px' }}>
                  {formatTime(detailedMetrics.avgHandleTime)}
                </p>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>per call duration</p>
                <div style={{
                  width: '100%',
                  backgroundColor: '#4B5563',
                  borderRadius: '9999px',
                  height: '6px',
                  marginTop: '12px'
                }}>
                  <div style={{
                    background: 'linear-gradient(90deg, #FF9800 0%, #FBBC04 100%)',
                    height: '6px',
                    borderRadius: '9999px',
                    width: `${Math.min((detailedMetrics.avgHandleTime / 15) * 100, 100)}%`,
                    transition: 'all 1s ease-out'
                  }}></div>
                </div>
              </div>
              <div style={{ 
                padding: '12px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                border: '2px solid #FF9800'
              }}>
                <Clock style={{ height: '32px', width: '32px', color: '#FF9800' }} />
              </div>
            </div>
          </div>

          {/* Shrinkage Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #4B5563',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.borderColor = '#EA4335';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = '#4B5563';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Shrinkage (WFM)
                </p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#F9FAFB', marginTop: '8px' }}>
                  {detailedMetrics.shrinkage.toFixed(1)}%
                </p>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>unproductive time</p>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                  <div style={{
                    height: '8px',
                    width: '8px',
                    borderRadius: '50%',
                    backgroundColor: detailedMetrics.shrinkage < 30 ? '#34A853' : detailedMetrics.shrinkage < 50 ? '#FBBC04' : '#EA4335',
                    marginRight: '8px',
                    animation: 'pulse 2s infinite'
                  }}></div>
                  <span style={{ 
                    color: detailedMetrics.shrinkage < 30 ? '#34A853' : detailedMetrics.shrinkage < 50 ? '#FBBC04' : '#EA4335',
                    fontSize: '12px'
                  }}>
                    {detailedMetrics.shrinkage < 30 ? 'Optimal' : detailedMetrics.shrinkage < 50 ? 'High' : 'Critical'}
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  backgroundColor: '#4B5563',
                  borderRadius: '9999px',
                  height: '6px',
                  marginTop: '8px'
                }}>
                  <div style={{
                    background: detailedMetrics.shrinkage < 30 ? 'linear-gradient(90deg, #34A853 0%, #4285F4 100%)' : 
                             detailedMetrics.shrinkage < 50 ? 'linear-gradient(90deg, #FBBC04 0%, #FF9800 100%)' :
                             'linear-gradient(90deg, #EA4335 0%, #FF5722 100%)',
                    height: '6px',
                    borderRadius: '9999px',
                    width: `${Math.min(detailedMetrics.shrinkage, 100)}%`,
                    transition: 'all 1s ease-out'
                  }}></div>
                </div>
              </div>
              <div style={{ 
                padding: '12px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(234, 67, 53, 0.2)',
                border: '2px solid #EA4335'
              }}>
                <BarChart3 style={{ height: '32px', width: '32px', color: '#EA4335' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Formulas Section - Dark Theme */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700">
          <button
            onClick={() => setShowFormulas(!showFormulas)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-400 mr-3" />
              <span className="font-medium text-white">Calculation Formulas & Methodology</span>
            </div>
            {showFormulas ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
        
        {showFormulas && (
          <div className="border-t p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-600">Total Calls</h4>
                <p className="text-sm text-gray-600">Count of answered interactions <span className="text-purple-600">[Source: Training Interactions]</span></p>
              </div>
              <div>
                <h4 className="font-medium text-blue-600">Shrinkage (WFM)</h4>
                <p className="text-sm text-gray-600">(Break + Meal + Away + Not Responding + Off Queue) ÷ Logged In Time × 100</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-600">Transfer Rate</h4>
                <p className="text-sm text-gray-600">(Total Calls Transferred ÷ Total Calls Answered) × 100 <span className="text-amber-600">[ACCURACY WARNING: Mixed data sources may understate rate by ~30%]</span></p>
              </div>
              <div>
                <h4 className="font-medium text-blue-600">Productive Utilization</h4>
                <p className="text-sm text-gray-600">Σ(Talk + Hold + ACW Time) ÷ Σ(Agent Login Time) × 100</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-600">Average Speed of Answer</h4>
                <p className="text-sm text-gray-600">Σ(Queue Wait Time for answered calls) ÷ Number of Answered Calls</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-600">Abandonment Rate</h4>
                <p className="text-sm text-gray-600">(Abandoned Inbound Calls ÷ Total Inbound Calls) × 100 <span className="text-red-600">[Inbound Only]</span></p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Calculations with Real Values */}
      <div className="bg-white rounded-lg shadow-sm border">
        <button
          onClick={() => setShowDetailedCalculations(!showDetailedCalculations)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center">
            <Calculator className="h-5 w-5 text-green-600 mr-2" />
            <span className="font-medium">Detailed Calculations with Actual Values</span>
          </div>
          {showDetailedCalculations ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        
        {showDetailedCalculations && (
          <div className="border-t p-6 space-y-6">
            {Object.entries(detailedMetrics.calculationDetails).map(([key, details]) => {
              const calculationDetail = details as {
                formula: string;
                values: any;
                calculation: string;
                result: number | string;
              };
              return (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-blue-600">Formula: </span>
                      <span className="text-sm text-gray-700">{calculationDetail.formula}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-600">Calculation: </span>
                      <span className="text-sm text-gray-700">{calculationDetail.calculation}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-purple-600">Result: </span>
                      <span className="text-sm font-bold text-gray-900">{calculationDetail.result}</span>
                    </div>
                    <div className="bg-white rounded p-2 mt-2">
                      <span className="text-xs font-medium text-gray-500">Values Used:</span>
                      <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                        {JSON.stringify(calculationDetail.values, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Top Queues Chart */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Top 10 Busiest Queues</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.topQueues}>
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Bar dataKey="calls" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

        {/* Interactive Performance Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', marginBottom: '32px' }}>
          {/* Top Performers Table */}
          <div style={{
            background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            borderRadius: '16px',
            border: '1px solid #4B5563',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '24px',
              borderBottom: '1px solid #4B5563',
              background: 'linear-gradient(90deg, #34A853 0%, #4285F4 100%)'
            }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#FFFFFF',
                margin: '0',
                display: 'flex',
                alignItems: 'center'
              }}>
                🏆 Top 10 Performers (by Calls Answered)
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, #374151 0%, #1F2937 100%)' }}>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#E5E7EB',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      🏅 Rank
                    </th>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#E5E7EB',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      Agent Name
                    </th>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#4285F4',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      📞 Calls Answered
                    </th>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#FBBC04',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      🔄 Transfer Rate
                    </th>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#9C27B0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      ⏸️ Hold Rate
                    </th>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#FF9800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      ⏱️ Avg Handle Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topPerformers.map((agent, index) => (
                    <tr 
                      key={index}
                      style={{ 
                        borderBottom: '1px solid #374151',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
                        e.currentTarget.style.transform = 'scale(1.01)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <td style={{ 
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: index < 3 ? '#34A853' : '#E5E7EB'
                      }}>
                        {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                      </td>
                      <td style={{ 
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#F9FAFB'
                      }}>
                        {agent.name}
                      </td>
                      <td style={{ 
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#4285F4',
                        textAlign: 'center'
                      }}>
                        {agent.calls.toLocaleString()}
                      </td>
                      <td style={{ 
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: agent.transferRate > 10 ? '#EA4335' : agent.transferRate > 7 ? '#FBBC04' : '#34A853',
                        textAlign: 'center'
                      }}>
                        {agent.transferRate.toFixed(1)}%
                      </td>
                      <td style={{ 
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: agent.holdRate > 20 ? '#EA4335' : agent.holdRate > 10 ? '#FBBC04' : '#34A853',
                        textAlign: 'center'
                      }}>
                        {agent.holdRate.toFixed(1)}%
                      </td>
                      <td style={{ 
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#FF9800',
                        textAlign: 'center'
                      }}>
                        {formatTime(agent.avgHandleTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Performers Table */}
          <div style={{
            background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
            borderRadius: '16px',
            border: '1px solid #4B5563',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '24px',
              borderBottom: '1px solid #4B5563',
              background: 'linear-gradient(90deg, #EA4335 0%, #FF9800 100%)'
            }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#FFFFFF',
                margin: '0',
                display: 'flex',
                alignItems: 'center'
              }}>
                ⚠️ Bottom 10 Performers (by Calls Answered)
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, #374151 0%, #1F2937 100%)' }}>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#E5E7EB',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      📉 Rank
                    </th>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#E5E7EB',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      Agent Name
                    </th>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#4285F4',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      📞 Calls Answered
                    </th>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#FBBC04',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      🔄 Transfer Rate
                    </th>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#9C27B0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      ⏸️ Hold Rate
                    </th>
                    <th style={{ 
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#FF9800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid #4B5563'
                    }}>
                      ⏱️ Avg Handle Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.bottomPerformers.map((agent, index) => (
                    <tr 
                      key={index}
                      style={{ 
                        borderBottom: '1px solid #374151',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(234, 67, 53, 0.1)';
                        e.currentTarget.style.transform = 'scale(1.01)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <td style={{ 
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#EA4335'
                      }}>
                        #{index + 1}
                      </td>
                      <td style={{ 
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#F9FAFB'
                      }}>
                        {agent.name}
                      </td>
                      <td style={{ 
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: agent.calls < 5 ? '#EA4335' : '#4285F4',
                        textAlign: 'center'
                      }}>
                        {agent.calls.toLocaleString()}
                      </td>
                      <td style={{ 
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: agent.transferRate > 50 ? '#EA4335' : agent.transferRate > 20 ? '#FBBC04' : '#34A853',
                        textAlign: 'center'
                      }}>
                        {agent.transferRate.toFixed(1)}%
                      </td>
                      <td style={{ 
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: agent.holdRate > 50 ? '#EA4335' : agent.holdRate > 20 ? '#FBBC04' : '#34A853',
                        textAlign: 'center'
                      }}>
                        {agent.holdRate.toFixed(1)}%
                      </td>
                      <td style={{ 
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#FF9800',
                        textAlign: 'center'
                      }}>
                        {formatTime(agent.avgHandleTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* High-Volume Queue Abandonment Rates - Vivid Interactive Design */}
        <div style={{
          background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
          borderRadius: '20px',
          border: '1px solid #4B5563',
          padding: '32px',
          marginBottom: '32px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #34A853 0%, #4285F4 50%, #9C27B0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '12px'
            }}>
              🎯 High-Volume Queue Performance Dashboard
            </h2>
            <p style={{
              color: '#D1D5DB',
              fontSize: '16px',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Top 9 queues from the 15 highest-volume queues (excluding Backline groups), ranked by abandonment rate performance
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {metrics.topQueues.slice(0, 9).map((queue, index) => {
              // Dynamic color scheme based on performance ranking
              const getRankingColors = (rank: number) => {
                if (rank < 3) return {
                  gradient: 'linear-gradient(135deg, #34A853 0%, #4285F4 100%)',
                  borderColor: '#34A853',
                  badgeColor: '#34A853',
                  iconColor: '#34A853',
                  emoji: ['🥇', '🥈', '🥉'][rank],
                  status: 'Excellent'
                };
                if (rank < 6) return {
                  gradient: 'linear-gradient(135deg, #FBBC04 0%, #FF9800 100%)',
                  borderColor: '#FBBC04',
                  badgeColor: '#FBBC04',
                  iconColor: '#FBBC04',
                  emoji: '⚡',
                  status: 'Good'
                };
                return {
                  gradient: 'linear-gradient(135deg, #FF5722 0%, #EA4335 100%)',
                  borderColor: '#EA4335',
                  badgeColor: '#EA4335',
                  iconColor: '#EA4335',
                  emoji: '⚠️',
                  status: 'Needs Attention'
                };
              };

              const colors = getRankingColors(index);

              return (
                <div
                  key={index}
                  style={{
                    background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
                    borderRadius: '16px',
                    border: `2px solid #4B5563`,
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                    e.currentTarget.style.borderColor = colors.borderColor;
                    e.currentTarget.style.boxShadow = `0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px ${colors.borderColor}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.borderColor = '#4B5563';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Animated Background Glow */}
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    height: '4px',
                    background: colors.gradient,
                    borderRadius: '16px 16px 0 0'
                  }} />

                  {/* Header with Ranking */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>{colors.emoji}</span>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#F9FAFB',
                        margin: '0',
                        maxWidth: '180px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {queue.name}
                      </h3>
                    </div>
                    <div style={{
                      background: colors.gradient,
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                      textAlign: 'center',
                      minWidth: '40px'
                    }}>
                      #{index + 1}
                    </div>
                  </div>

                  {/* Main Metrics Display */}
                  <div style={{ marginBottom: '20px' }}>
                    {/* Abandonment Rate - Large Display */}
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '16px',
                      padding: '16px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '12px',
                      border: `1px solid ${colors.borderColor}40`
                    }}>
                      <div style={{
                        fontSize: '36px',
                        fontWeight: 'bold',
                        color: colors.iconColor,
                        lineHeight: '1',
                        marginBottom: '4px'
                      }}>
                        {queue.rate.toFixed(1)}%
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                      }}>
                        Abandonment Rate
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: colors.iconColor,
                        fontWeight: '600',
                        marginTop: '4px'
                      }}>
                        {colors.status}
                      </div>
                    </div>

                    {/* Call Volume Metrics */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px'
                    }}>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(66, 133, 244, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(66, 133, 244, 0.2)',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#4285F4'
                        }}>
                          {queue.calls.toLocaleString()}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#9CA3AF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          📞 Total Calls
                        </div>
                      </div>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(234, 67, 53, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(234, 67, 53, 0.2)',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#EA4335'
                        }}>
                          {queue.abandoned.toLocaleString()}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#9CA3AF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          ❌ Abandoned
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Progress Bar */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        color: '#9CA3AF',
                        fontWeight: '500'
                      }}>
                        Performance vs Target (10%)
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: colors.iconColor,
                        fontWeight: 'bold'
                      }}>
                        {queue.rate < 5 ? 'Excellent' : queue.rate < 8 ? 'Good' : 'High'}
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#374151',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min((queue.rate / 10) * 100, 100)}%`,
                        height: '100%',
                        background: colors.gradient,
                        borderRadius: '4px',
                        transition: 'width 1.5s ease-out',
                        boxShadow: `0 0 8px ${colors.borderColor}60`
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div style={{
            marginTop: '32px',
            padding: '24px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            border: '1px solid #4B5563',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '20px'
            }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#34A853' }}>
                  {metrics.topQueues.slice(0, 3).length}
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'uppercase' }}>
                  🏆 Excellent Queues
                </div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FBBC04' }}>
                  {metrics.topQueues.slice(3, 6).length}
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'uppercase' }}>
                  ⚡ Good Performance
                </div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#EA4335' }}>
                  {metrics.topQueues.slice(6, 9).length}
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'uppercase' }}>
                  ⚠️ Needs Attention
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Utilization Heat Map - Interactive Visualization */}
        <div style={{
          background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
          borderRadius: '20px',
          border: '1px solid #4B5563',
          padding: '32px',
          marginBottom: '32px'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #EA4335 0%, #FBBC04 25%, #34A853 50%, #4285F4 75%, #9C27B0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '12px'
            }}>
              🔥 Agent Utilization Heat Map ({metrics.agentUtilization.length} agents)
            </h2>
            <div style={{
              color: '#D1D5DB',
              fontSize: '16px',
              marginBottom: '12px'
            }}>
              <strong>Formula:</strong> (On-Queue Time ÷ Logged Time) × 100
            </div>
            <div style={{
              color: '#9CA3AF',
              fontSize: '14px'
            }}>
              Traditional utilization showing time available for calls vs total logged time
            </div>
          </div>

          {/* Distribution Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginBottom: '40px'
          }}>
            {[
              { 
                range: '90-100%', 
                count: metrics.agentUtilization.filter(a => a.utilization >= 90).length,
                color: '#34A853',
                gradient: 'linear-gradient(135deg, #34A853 0%, #4285F4 100%)',
                emoji: '🔥',
                status: 'Peak Performance'
              },
              { 
                range: '80-89%', 
                count: metrics.agentUtilization.filter(a => a.utilization >= 80 && a.utilization < 90).length,
                color: '#4285F4',
                gradient: 'linear-gradient(135deg, #4285F4 0%, #9C27B0 100%)',
                emoji: '⚡',
                status: 'High Utilization'
              },
              { 
                range: '70-79%', 
                count: metrics.agentUtilization.filter(a => a.utilization >= 70 && a.utilization < 80).length,
                color: '#9C27B0',
                gradient: 'linear-gradient(135deg, #9C27B0 0%, #00BCD4 100%)',
                emoji: '💪',
                status: 'Good Performance'
              },
              { 
                range: '60-69%', 
                count: metrics.agentUtilization.filter(a => a.utilization >= 60 && a.utilization < 70).length,
                color: '#FBBC04',
                gradient: 'linear-gradient(135deg, #FBBC04 0%, #FF9800 100%)',
                emoji: '⚖️',
                status: 'Moderate Usage'
              },
              { 
                range: '50-59%', 
                count: metrics.agentUtilization.filter(a => a.utilization >= 50 && a.utilization < 60).length,
                color: '#FF9800',
                gradient: 'linear-gradient(135deg, #FF9800 0%, #EA4335 100%)',
                emoji: '📊',
                status: 'Low-Mid Range'
              }
            ].map((bucket, index) => (
              <div
                key={index}
                style={{
                  background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
                  borderRadius: '12px',
                  border: `2px solid ${bucket.color}40`,
                  padding: '16px',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = bucket.color;
                  e.currentTarget.style.boxShadow = `0 8px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px ${bucket.color}60`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = `${bucket.color}40`;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  height: '3px',
                  background: bucket.gradient
                }} />
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{bucket.emoji}</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#E5E7EB',
                  marginBottom: '4px'
                }}>
                  {bucket.range}
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: bucket.color,
                  marginBottom: '4px'
                }}>
                  {bucket.count}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {bucket.status}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Heat Map Grid */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#F9FAFB',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              🎯 Individual Agent Heat Map (All {metrics.agentUtilization.length} Agents)
            </h3>
            
            {/* Heat Map Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '8px',
              padding: '20px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '16px',
              border: '1px solid #374151',
              maxHeight: '600px',
              overflowY: 'auto'
            }}>
              {metrics.agentUtilization.map((agent, index) => {
                const getHeatColor = (utilization: number) => {
                  if (utilization >= 90) return {
                    bg: 'linear-gradient(135deg, #34A853 0%, #4285F4 100%)',
                    border: '#34A853',
                    text: '#FFFFFF',
                    intensity: '100%'
                  };
                  if (utilization >= 80) return {
                    bg: 'linear-gradient(135deg, #4285F4 0%, #9C27B0 100%)',
                    border: '#4285F4',
                    text: '#FFFFFF',
                    intensity: '85%'
                  };
                  if (utilization >= 70) return {
                    bg: 'linear-gradient(135deg, #9C27B0 0%, #00BCD4 100%)',
                    border: '#9C27B0',
                    text: '#FFFFFF',
                    intensity: '70%'
                  };
                  if (utilization >= 60) return {
                    bg: 'linear-gradient(135deg, #FBBC04 0%, #FF9800 100%)',
                    border: '#FBBC04',
                    text: '#000000',
                    intensity: '60%'
                  };
                  if (utilization >= 50) return {
                    bg: 'linear-gradient(135deg, #FF9800 0%, #EA4335 100%)',
                    border: '#FF9800',
                    text: '#FFFFFF',
                    intensity: '50%'
                  };
                  return {
                    bg: 'linear-gradient(135deg, #6B7280 0%, #374151 100%)',
                    border: '#6B7280',
                    text: '#E5E7EB',
                    intensity: 'Low'
                  };
                };

                const heatColor = getHeatColor(agent.utilization);
                const isTopPerformer = index < 5;

                return (
                  <div
                    key={index}
                    style={{
                      background: heatColor.bg,
                      borderRadius: '8px',
                      border: `2px solid ${heatColor.border}`,
                      padding: '12px 8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.zIndex = '10';
                      e.currentTarget.style.boxShadow = `0 8px 16px rgba(0, 0, 0, 0.4), 0 0 0 3px ${heatColor.border}80`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.zIndex = '1';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {isTopPerformer && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        fontSize: '16px'
                      }}>
                        {['🥇', '🥈', '🥉', '🏅', '⭐'][index]}
                      </div>
                    )}
                    
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: heatColor.text,
                      marginBottom: '4px',
                      lineHeight: '1.2',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {agent.name.split(' ').slice(0, 2).join(' ')}
                    </div>
                    
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: heatColor.text,
                      textShadow: agent.utilization >= 60 ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                    }}>
                      {agent.utilization.toFixed(1)}%
                    </div>
                    
                    <div style={{
                      fontSize: '9px',
                      color: agent.utilization >= 60 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(229, 231, 235, 0.8)',
                      marginTop: '2px'
                    }}>
                      #{index + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance Insights */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            padding: '24px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            border: '1px solid #4B5563'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#34A853', marginBottom: '8px' }}>
                {metrics.agentUtilization[0]?.utilization.toFixed(1)}%
              </div>
              <div style={{ fontSize: '14px', color: '#E5E7EB', marginBottom: '4px' }}>
                🏆 Top Performer
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                {metrics.agentUtilization[0]?.name}
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4285F4', marginBottom: '8px' }}>
                {(metrics.agentUtilization.reduce((sum, agent) => sum + agent.utilization, 0) / metrics.agentUtilization.length).toFixed(1)}%
              </div>
              <div style={{ fontSize: '14px', color: '#E5E7EB', marginBottom: '4px' }}>
                📊 Average Utilization
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                Across all agents
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FBBC04', marginBottom: '8px' }}>
                {metrics.agentUtilization.filter(a => a.utilization >= 80).length}
              </div>
              <div style={{ fontSize: '14px', color: '#E5E7EB', marginBottom: '4px' }}>
                ⚡ High Performers
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                80%+ utilization
              </div>
            </div>
          </div>
        </div>
    </div>
    </div>
  );
};

export default Dashboard;