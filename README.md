# Call Center Training Data Analyzer

A comprehensive React-based dashboard for analyzing call center performance metrics, workforce management, and operational efficiency. This application processes multiple CSV data sources to provide detailed insights into agent performance, queue management, and schedule adherence.

## 🏗️ Architecture Overview

This is a React single-page application that processes CSV files client-side to generate comprehensive call center analytics and reports.

### Core Components
- **React 19.1.1** with functional components and hooks
- **Tailwind CSS 4.x** for responsive styling
- **Papa Parse 5.x** for CSV processing
- **Recharts 3.x** for data visualization
- **Lucide React** for icons

### Project Structure
```
src/
├── components/           # React UI components
│   ├── Dashboard.js      # Main analytics dashboard
│   ├── FileUpload.js     # CSV file upload interface
│   ├── FormulaDocumentation.js  # Expandable calculation reference
│   ├── MetricsCard.js    # Individual metric display component
│   └── UtilizationHeatmap.js    # Agent utilization visualization
├── utils/               # Core business logic
│   ├── csvParser.js     # CSV processing and data cleaning
│   ├── dataAnalyzer.js  # All KPI calculations and analytics
│   └── htmlExporter.js  # Professional report export
└── App.js              # Main application orchestration
```

## 📊 Supported Data Sources

The application processes 5 CSV file types:

### Required Files (Core Analytics)
1. **Agent Status Summary** - Time tracking and utilization data
2. **Agent Performance Summary** - Call handling metrics and KPIs  
3. **Training Interactions** - Individual call records with queue times

### Optional Files (Enhanced Analytics)
4. **Historical Adherence** - Schedule compliance and conformance data
5. **Calculated Time Summary** - Payroll and workforce planning data

## 🧮 Key Performance Indicators & Formulas

### Call Volume Metrics

**Total Calls Answered**
```
Σ(Calls Answered across all agents)
```
*Sum of 'Answered' column from Agent Performance data*

**Transfer Rate**
```
(Total Calls Transferred ÷ Total Calls Answered) × 100
```
*Percentage of calls transferred to another agent*

**Abandonment Rate** 
```
(Abandoned Calls ÷ Total Interactions) × 100
```
*Percentage of calls abandoned by customers before being answered*

### Service Level Metrics

**Average Speed of Answer (ASA)**
```
Σ(Queue Wait Time for answered calls) ÷ Number of Answered Calls
```
*Average queue time for calls that were answered (excludes abandoned calls)*
*Converted from HH:MM:SS format to seconds, displayed in minutes*

**Service Level Agreement (SLA) Thresholds**
```
Count(answered AND queue_time ≤ threshold) ÷ Count(answered) × 100
```
*Calculated for 30s, 60s, 90s thresholds*
*Percentage of answered calls handled within specified time limits*

### Handle Time Analysis

**Average Handle Time (AHT)**
```
Σ(Talk Time + Hold Time + ACW Time) ÷ Number of Handled Calls
```
*Weighted average based on call volume per agent*
*Uses individual agent AHT weighted by their call volume*

**Handle Time Distribution**
- Under 5 min, 5-10 min, 10-15 min, 15-20 min, Over 20 min
- Categorizes agents by their average handle time performance

### Utilization Calculations

**Productive Utilization (Industry Standard)**
```
Σ(Talk Time + Hold Time + ACW Time) ÷ Σ(Agent Login Time) × 100
```
*Measures actual productive work time vs total logged time*
*Includes all customer-facing activities*

**On-Queue Utilization (Traditional)**
```
Σ(On-Queue Time) ÷ Σ(Agent Login Time) × 100  
```
*Traditional utilization showing time available for calls vs total logged time*
*Measures availability rather than productivity*

### Workforce Management

**Shrinkage Calculation**
```
(Break + Meal + Away + Not Responding + Off Queue) ÷ Logged In × 100
```
*Non-productive time as percentage of total logged time*
*Includes scheduled and unscheduled non-productive activities*

**Active Agents**
```
Count of agents with Logged In time > 0
```
*Agents who worked during the reporting period*

### Schedule Adherence (Optional)

**Adherence Percentage**
```
Time in correct scheduled state ÷ Total scheduled time × 100
```
*Percentage of time agents followed their scheduled activities*

**Conformance Percentage** 
```
Time in correct work state ÷ Total work time × 100
```
*Percentage of time agents were in correct state when working*

## 🔧 Technical Implementation

### Data Processing Pipeline

1. **CSV Parsing** (`csvParser.js`)
   - Handles multiple CSV column name variations
   - Converts HH:MM:SS time formats to minutes/seconds
   - Filters out template records and invalid data
   - **Critical Fix**: Includes abandoned calls even without agent assignment

2. **Time Parsing Function**
   ```javascript
   parseTimeToMinutes(timeString) {
     // Converts "HH:MM:SS" to decimal minutes
     // Example: "01:30:00" → 90.0 minutes
   }
   ```

3. **Data Analysis** (`dataAnalyzer.js`)
   - Processes all CSV data sources
   - Calculates weighted averages for performance metrics
   - Generates top/bottom performer rankings
   - **Enhanced**: Queue time distribution analysis for SLA validation

### Mathematical Validation

The system includes comprehensive validation to prevent impossible metric combinations:

- **ASA vs SLA Consistency**: High average speeds should correlate with low service level percentages
- **Time Accounting**: On-Queue + Shrinkage should not exceed Login Time  
- **Distribution Analysis**: Percentile calculations to identify data anomalies

### Queue Analysis

**Top 12 High-Volume Queues**
- Sorted by total call volume
- Color-coded abandonment rates (Green: <10%, Yellow: 10-15%, Red: >15%)
- Visual progress bars for abandonment rates

## 📈 Dashboard Features

### Performance Metrics Display
- **Metric Cards**: Key KPIs with trend indicators
- **Service Level Grid**: Multiple SLA threshold tracking  
- **Utilization Comparison**: Productive vs Traditional calculations
- **Handle Time Analysis**: Distribution and weighted averages

### Agent Performance Analysis
- **Top 10 Performers**: Ranked by calls answered
- **Bottom 10 Performers**: Coaching opportunity identification
- **Utilization Heatmap**: Visual representation of agent efficiency
- **Adherence Tracking**: Schedule compliance analysis (when data available)

### Queue Management
- **Abandonment Analysis**: 12 highest volume queues
- **Performance Trending**: Historical queue performance
- **Capacity Planning**: Volume distribution analysis

### Export Capabilities
- **HTML Report Export**: Self-contained professional reports
- **Offline Viewing**: No external dependencies
- **Print Optimization**: Formatted for hard copy reports
- **Timestamped Files**: Automatic naming with generation time

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn package manager

### Installation
```bash
# Clone the repository
git clone https://github.com/UsernameTron/Call-Center-Dashboard-WFM.git
cd Call-Center-Dashboard-WFM

# Install dependencies
npm install

# Start development server
npm start
```

### Usage
1. **Launch Application**: Navigate to `http://localhost:3000`
2. **Upload CSV Files**: Use the file upload interface to load your data
   - Minimum: Agent Status, Agent Performance, Training Interactions
   - Optional: Historical Adherence, Calculated Time Summary
3. **View Analytics**: Dashboard auto-generates upon uploading required files
4. **Export Reports**: Click "Export HTML Report" for standalone analysis files

## 🔍 Data Quality & Debugging

### Built-in Validation
- **Raw Data Logging**: Console output shows data parsing statistics
- **Mathematical Consistency**: Flags impossible metric combinations
- **Time Accounting**: Validates sum of time categories
- **Distribution Analysis**: Percentile calculations for anomaly detection

### Common Issues & Solutions
- **Low Abandonment Rates**: Check for missing abandoned call records
- **High Shrinkage**: Verify time category overlap (Break/Meal may be subsets of Not Ready)
- **ASA/SLA Mismatch**: Review queue time parsing and data filtering

## 🏢 Industry Applications

### Workforce Management
- **Capacity Planning**: Utilization analysis and forecasting
- **Performance Management**: Agent ranking and coaching identification  
- **Schedule Optimization**: Adherence tracking and improvement

### Operations Management  
- **Queue Optimization**: Abandonment analysis and service level tracking
- **Cost Management**: Handle time analysis and efficiency metrics
- **Quality Assurance**: Performance trending and anomaly detection

### Reporting & Compliance
- **Executive Dashboards**: KPI tracking and business intelligence
- **Regulatory Reporting**: Service level and performance documentation
- **Client Reporting**: Professional HTML export capabilities

## 🛠️ Technical Notes

### Performance Optimizations
- **Client-side Processing**: No server requirements for data processing
- **Efficient Filtering**: Optimized algorithms for large datasets  
- **Memory Management**: Selective data loading and processing

### Browser Compatibility
- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)
- Responsive design for desktop and tablet viewing

### Security Considerations
- **Client-side Only**: No data transmission to external servers
- **Local Processing**: All calculations performed in browser
- **Privacy Focused**: CSV data remains on user's machine

---

**Built with React and modern web technologies for comprehensive call center analytics and workforce management.**
