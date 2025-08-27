import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, ScatterChart, Scatter
} from 'recharts';

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

const darkTheme = {
  background: '#1a1a1a',
  gridColor: '#374151',
  textColor: '#E5E7EB',
  tooltipBg: '#374151',
};

interface EnhancedChartsProps {
  data: {
    utilization: Array<{ name: string; utilization: number; fill: string }>;
    queuePerformance: Array<{ name: string; calls: number; abandoned: number; rate: number; fill: string }>;
    hourlyTrend: Array<{ hour: string; calls: number; abandoned: number; efficiency: number }>;
    performanceMetrics: Array<{ name: string; value: number; target: number; fill: string }>;
  };
}

const EnhancedCharts: React.FC<EnhancedChartsProps> = ({ data }) => {
  // Custom tooltip for dark theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl">
          <p className="text-gray-200 font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}${entry.dataKey.includes('rate') || entry.dataKey.includes('utilization') || entry.dataKey.includes('efficiency') ? '%' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Real-time Performance Radar */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></div>
          Performance vs Target Metrics
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={data.performanceMetrics}>
                <RadialBar dataKey="value" cornerRadius={10} fill={googleColors.blue} />
                <Tooltip content={<CustomTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            {data.performanceMetrics.map((metric, index) => (
              <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300 font-medium">{metric.name}</span>
                  <span className="text-white font-bold">{metric.value.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${(metric.value / metric.target) * 100}%`,
                      background: `linear-gradient(90deg, ${metric.fill}, ${metric.fill}dd)`
                    }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">Target: {metric.target}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Trend Analysis */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-6">24-Hour Call Volume & Efficiency Trends</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.hourlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkTheme.gridColor} />
              <XAxis 
                dataKey="hour" 
                stroke={darkTheme.textColor}
                tick={{ fill: darkTheme.textColor, fontSize: 12 }}
              />
              <YAxis 
                stroke={darkTheme.textColor}
                tick={{ fill: darkTheme.textColor, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="calls" 
                stroke={googleColors.blue} 
                strokeWidth={3}
                dot={{ fill: googleColors.blue, strokeWidth: 2, r: 4 }}
                name="Total Calls"
              />
              <Line 
                type="monotone" 
                dataKey="abandoned" 
                stroke={googleColors.red} 
                strokeWidth={2}
                dot={{ fill: googleColors.red, strokeWidth: 2, r: 3 }}
                name="Abandoned Calls"
              />
              <Line 
                type="monotone" 
                dataKey="efficiency" 
                stroke={googleColors.green} 
                strokeWidth={2}
                dot={{ fill: googleColors.green, strokeWidth: 2, r: 3 }}
                name="Efficiency %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Queue Performance Matrix */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-6">Queue Performance Matrix</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80">
            <h4 className="text-lg text-gray-300 mb-4">Call Volume Distribution</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.queuePerformance}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="calls"
                >
                  {data.queuePerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="h-80">
            <h4 className="text-lg text-gray-300 mb-4">Abandonment Rate vs Volume</h4>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={data.queuePerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkTheme.gridColor} />
                <XAxis 
                  dataKey="calls" 
                  stroke={darkTheme.textColor}
                  tick={{ fill: darkTheme.textColor, fontSize: 12 }}
                  name="Call Volume"
                />
                <YAxis 
                  dataKey="rate"
                  stroke={darkTheme.textColor}
                  tick={{ fill: darkTheme.textColor, fontSize: 12 }}
                  name="Abandonment Rate"
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter dataKey="rate" fill={googleColors.purple} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Agent Utilization Heatmap */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-6">Agent Utilization Performance</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.utilization.slice(0, 20)}>
              <defs>
                <linearGradient id="utilizationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={googleColors.blue} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={googleColors.blue} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkTheme.gridColor} />
              <XAxis 
                dataKey="name" 
                stroke={darkTheme.textColor}
                tick={{ fill: darkTheme.textColor, fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                stroke={darkTheme.textColor}
                tick={{ fill: darkTheme.textColor, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="utilization" 
                stroke={googleColors.blue} 
                fillOpacity={1} 
                fill="url(#utilizationGradient)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCharts;