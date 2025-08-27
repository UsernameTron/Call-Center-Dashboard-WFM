# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Call Center Training Data Analyzer** - a comprehensive React-based dashboard for analyzing call center performance metrics, workforce management, and operational efficiency. The application processes multiple CSV data sources to provide detailed insights into agent performance, queue management, and schedule adherence.

## Development Commands

All commands should be run from the `call-center-dashboard` directory:

```bash
cd call-center-dashboard

# Development
npm start                    # Start development server (http://localhost:3000)
npm test                     # Run tests in watch mode
npm run test -- --coverage  # Run tests with coverage report
npm run build               # Production build

# Single test file
npm test -- --testNamePattern="ComponentName"
```

## Core Architecture

### Technology Stack
- **React 19.1.1** with TypeScript and functional components/hooks
- **Create React App** foundation with TypeScript template
- **CSV Processing**: Client-side data processing (Papa Parse expected)
- **Visualization**: Recharts for charts, Lucide React for icons
- **Styling**: Tailwind CSS 4.x (to be added)

### Expected Project Structure
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

## CSV Data Processing

The application processes 5 CSV file types for call center analytics:

### Required Files (Core Analytics)
1. **Agent Status Summary** - Time tracking and utilization data
2. **Agent Performance Summary** - Call handling metrics and KPIs  
3. **Training Interactions** - Individual call records with queue times

### Optional Files (Enhanced Analytics)
4. **Historical Adherence** - Schedule compliance data
5. **Calculated Time Summary** - Payroll and workforce planning data

## Key Performance Indicators

### Critical Calculations
- **Total Calls Answered**: Sum of 'Answered' column from Agent Performance data
- **Transfer Rate**: (Total Calls Transferred ÷ Total Calls Answered) × 100
- **Abandonment Rate**: (Abandoned Calls ÷ Total Interactions) × 100
- **Average Speed of Answer (ASA)**: Σ(Queue Wait Time for answered calls) ÷ Number of Answered Calls
- **Average Handle Time (AHT)**: Σ(Talk Time + Hold Time + ACW Time) ÷ Number of Handled Calls
- **Productive Utilization**: Σ(Talk Time + Hold Time + ACW Time) ÷ Σ(Agent Login Time) × 100
- **Shrinkage**: (Break + Meal + Away + Not Responding + Off Queue) ÷ Logged In × 100

### Data Processing Notes
- **Time Format Conversion**: HH:MM:SS format must be converted to minutes/seconds for calculations
- **Agent Filtering**: Previous implementations had issues showing only 21 agents instead of 137-192 total agents
- **Validation Script**: `validation.py` exists as Python baseline for verifying JavaScript calculations
- **Critical Fix**: Must include abandoned calls even without agent assignment

## Known Issues & Solutions

### Agent Count Discrepancy
- **Problem**: Dashboard showing only 21 agents instead of full 137-192 agent dataset
- **Root Cause**: Excessive filtering removing valid agent records
- **Solution**: Remove EXCLUDED_AGENTS filtering, ensure proper data validation without over-filtering

### Time Display Formatting
- **Problem**: Time metrics showing as decimal minutes instead of readable HH:MM:SS format
- **Solution**: Use timeFormatter.js utilities for proper display formatting

### Metric Validation
- **Validation**: Python script shows baseline metrics (58,273 calls, 6.88% transfer rate, 9.01% abandonment rate)
- **Cross-Reference**: JavaScript calculations should match Python validation output

## Client-Side Architecture

- **No Server Required**: All CSV processing happens in browser
- **Privacy Focused**: Data remains on user's machine, no external transmission
- **Export Capability**: HTML report generation for standalone analysis files
- **Performance**: Optimized for large datasets with efficient filtering algorithms

## Missing Dependencies

The fresh React app will need these packages added:
```bash
npm install papaparse @types/papaparse recharts tailwindcss lucide-react
```