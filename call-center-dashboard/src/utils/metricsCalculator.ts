// Comprehensive Metrics Calculator with Detailed Formulas and Debugging

export interface DetailedMetrics {
  totalCalls: number;
  transferRate: number;
  productiveUtilization: number;
  onQueueUtilization: number;
  avgSpeedOfAnswer: number;
  abandonmentRate: number;
  avgHandleTime: number;
  shrinkage: number;
  calculationDetails: {
    [key: string]: {
      formula: string;
      values: any;
      calculation: string;
      result: number | string;
    };
  };
}

export class MetricsCalculator {
  private parseTimeToMinutes(timeStr: string): number {
    if (!timeStr || timeStr.trim() === '') return 0;
    
    // Remove leading/trailing spaces and handle format " HH:MM:SS.mmm"
    const cleanTime = timeStr.trim();
    const parts = cleanTime.split(':');
    
    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0; 
      const seconds = parseFloat(parts[2]) || 0;
      return hours * 60 + minutes + seconds / 60;
    }
    return 0;
  }

  private parseTimeToSeconds(timeStr: string): number {
    return this.parseTimeToMinutes(timeStr) * 60;
  }

  calculateDetailedMetrics(
    agentPerformance: any[], 
    agentStatus: any[], 
    trainingInteractions: any[],
    timeSummary: any[] = []
  ): DetailedMetrics {
    const calculationDetails: any = {};
    
    // Step 1: Data Filtering and Validation
    console.log('=== DATA FILTERING ANALYSIS ===');
    
    const validAgentPerformance = agentPerformance.filter(agent => {
      const hasAnswered = agent.Answered && !isNaN(parseInt(agent.Answered)) && parseInt(agent.Answered) > 0;
      const notTemplate = !agent['Agent Name']?.includes('Template');
      return hasAnswered && notTemplate;
    });
    
    const validAgentStatus = agentStatus.filter(agent => {
      const hasLoggedTime = agent['Logged In'] && agent['Logged In'].trim() !== '';
      const notTemplate = !agent['Agent Name']?.includes('Template');
      return hasLoggedTime && notTemplate;
    });

    const validInteractions = trainingInteractions.filter(interaction => 
      interaction['Initial Direction'] && interaction['Queue']
    );

    // Step 2: Prepare data for analysis
    const inboundCalls = validInteractions.filter(call => call['Initial Direction'] === 'Inbound');
    
    console.log('=== DATA SOURCE RECONCILIATION ===');
    
    // Compare call totals between data sources
    const agentPerformanceTotal = validAgentPerformance.reduce((sum, agent) => 
      sum + (parseInt(agent.Answered) || 0), 0);
    
    const interactionsAnsweredTotal = validInteractions.filter(call => 
      call.Abandoned === 'NO').length;
    
    const callDiscrepancy = Math.abs(agentPerformanceTotal - interactionsAnsweredTotal);
    const discrepancyPercent = agentPerformanceTotal > 0 ? 
      (callDiscrepancy / agentPerformanceTotal) * 100 : 0;
    
    console.log('Agent Performance Total Calls:', agentPerformanceTotal);
    console.log('Interactions Answered Total:', interactionsAnsweredTotal);
    console.log('Discrepancy:', callDiscrepancy, `(${discrepancyPercent.toFixed(2)}%)`);
    
    if (discrepancyPercent > 5) {
      console.warn('⚠️ CRITICAL: >5% discrepancy between data sources!');
    }

    calculationDetails.dataReconciliation = {
      formula: 'Compare call totals across data sources to identify discrepancies',
      values: {
        agentPerformanceCallTotal: agentPerformanceTotal,
        interactionsAnsweredTotal: interactionsAnsweredTotal,
        callDiscrepancy: callDiscrepancy,
        discrepancyPercent: discrepancyPercent.toFixed(2) + '%',
        dataQualityFlag: discrepancyPercent > 5 ? '🚨 CRITICAL DISCREPANCY' : '✅ Acceptable variance',
        totalInteractions: validInteractions.length,
        inboundInteractions: inboundCalls.length,
        outboundInteractions: validInteractions.length - inboundCalls.length,
        agentCoverage: {
          performanceAgents: validAgentPerformance.length,
          statusAgents: validAgentStatus.length,
          missingAgents: validAgentStatus.length - validAgentPerformance.length,
          possibleCallsPerMissingAgent: Math.round(callDiscrepancy / (validAgentStatus.length - validAgentPerformance.length))
        },
        recommendedAction: discrepancyPercent > 30 ? 'URGENT: Investigate missing agent data' : 
                          discrepancyPercent > 10 ? 'Review data export timeframes' : 'Monitor trends'
      },
      calculation: `Agent Performance: ${agentPerformanceTotal} calls vs Interactions: ${interactionsAnsweredTotal} answered calls = ${callDiscrepancy} difference (${discrepancyPercent.toFixed(2)}%)`,
      result: discrepancyPercent > 30 ? `🚨 ${discrepancyPercent.toFixed(2)}% discrepancy - URGENT DATA ISSUE` : 
              discrepancyPercent > 5 ? `⚠️ ${discrepancyPercent.toFixed(2)}% discrepancy - DATA INTEGRITY ISSUE` : 
              `✅ ${discrepancyPercent.toFixed(2)}% variance - acceptable`
    };

    calculationDetails.dataFiltering = {
      formula: 'Filter out templates and agents with no activity',
      values: {
        totalAgentPerformanceRows: agentPerformance.length,
        validAgentPerformanceRows: validAgentPerformance.length,
        totalAgentStatusRows: agentStatus.length,
        validAgentStatusRows: validAgentStatus.length,
        totalInteractions: trainingInteractions.length,
        validInteractions: validInteractions.length
      },
      calculation: 'Removed template rows and empty data',
      result: `Performance: ${validAgentPerformance.length}, Status: ${validAgentStatus.length}, Interactions: ${validInteractions.length}`
    };

    // Step 3: Total Calls Calculation - DECISION: Use Interactions as single source of truth
    // Agent Performance shows 58,273 but misses 17,741 calls (30.44% discrepancy)
    const totalCallsFromAgentPerformance = validAgentPerformance.reduce((sum, agent) => {
      const answered = parseInt(agent.Answered) || 0;
      return sum + answered;
    }, 0);
    
    const totalCallsFromInteractions = validInteractions.filter(call => call.Abandoned === 'NO').length;
    
    // Use Interactions as authoritative source for consistency across all KPIs
    const totalCalls = totalCallsFromInteractions;


    calculationDetails.totalCalls = {
      formula: 'Count of answered interactions (authoritative source for all KPIs)',
      values: {
        totalInteractions: validInteractions.length,
        answeredInteractions: totalCalls,
        abandonedInteractions: validInteractions.length - totalCalls,
        agentPerformanceTotal: totalCallsFromAgentPerformance,
        discrepancyFromAgentData: totalCalls - totalCallsFromAgentPerformance,
        dataSourceUsed: 'Training Interactions (complete dataset)'
      },
      calculation: `${totalCalls} answered interactions from ${validInteractions.length} total interactions`,
      result: totalCalls
    };

    // Step 4: Transfer Rate Calculation - CRITICAL MIXED DATA ISSUE
    const totalTransferred = validAgentPerformance.reduce((sum, agent) => {
      return sum + (parseInt(agent.Transferred) || 0);
    }, 0);
    
    // BUSINESS CRITICAL: Transfer rate calculation using mixed data sources
    // Transfers: 4,008 from Agent Performance (58,273 calls baseline)
    // Denominator: 76,014 calls from Training Interactions  
    // Risk: 30% understatement if missing agents handled proportional transfers
    
    const agentPerformanceTransferRate = totalCallsFromAgentPerformance > 0 ? 
      (totalTransferred / totalCallsFromAgentPerformance) * 100 : 0;
    
    const mixedSourceTransferRate = totalCalls > 0 ? (totalTransferred / totalCalls) * 100 : 0;
    
    // Use Agent Performance rate as it's internally consistent, but flag the issue
    const transferRate = agentPerformanceTransferRate;
    
    console.log('🚨 TRANSFER RATE CRITICAL ANALYSIS:');
    console.log(`Agent Performance Rate: ${agentPerformanceTransferRate.toFixed(2)}% (consistent data)`);
    console.log(`Mixed Source Rate: ${mixedSourceTransferRate.toFixed(2)}% (potentially understated)`);
    console.log(`Potential understatement: ${((agentPerformanceTransferRate - mixedSourceTransferRate) / agentPerformanceTransferRate * 100).toFixed(1)}%`);

    calculationDetails.transferRate = {
      formula: '(Total Calls Transferred ÷ Total Calls Answered) × 100 [BUSINESS CRITICAL: Data source consistency issue]',
      values: {
        totalTransferred: totalTransferred,
        reportedRate: transferRate,
        rateCalculationBasis: 'Agent Performance (internally consistent)',
        agentPerformanceRate: agentPerformanceTransferRate,
        mixedSourceRate: mixedSourceTransferRate,
        potentialUnderstatement: ((agentPerformanceTransferRate - mixedSourceTransferRate) / agentPerformanceTransferRate * 100).toFixed(1) + '%',
        businessImpact: {
          currentReported: transferRate.toFixed(2) + '%',
          ifMixedSources: mixedSourceTransferRate.toFixed(2) + '%',
          differenceInTransfers: Math.round((agentPerformanceTransferRate - mixedSourceTransferRate) / 100 * totalTransferred),
          riskAssessment: 'HIGH - Transfer rate accuracy depends on data coverage completeness'
        },
        recommendedAction: 'URGENT: Verify transfer data exists for all 76,014 calls or use Agent Performance baseline'
      },
      calculation: `CONSISTENT: ${totalTransferred} transfers ÷ ${totalCallsFromAgentPerformance} Agent Perf calls = ${transferRate.toFixed(2)}% | MIXED: ÷ ${totalCalls} Interaction calls = ${mixedSourceTransferRate.toFixed(2)}%`,
      result: `${transferRate.toFixed(2)}% (Agent Perf baseline) - Mixed source would show ${mixedSourceTransferRate.toFixed(2)}%`
    };

    // Step 5: Abandonment Rate Calculation
    const abandonedCalls = inboundCalls.filter(call => call.Abandoned === 'YES');
    const abandonmentRate = inboundCalls.length > 0 ? (abandonedCalls.length / inboundCalls.length) * 100 : 0;

    calculationDetails.abandonmentRate = {
      formula: '(Abandoned Inbound Calls ÷ Total Inbound Calls) × 100 [INBOUND ONLY - Cannot abandon outbound calls]',
      values: {
        totalInteractions: validInteractions.length,
        totalInboundCalls: inboundCalls.length,
        outboundCallsExcluded: validInteractions.length - inboundCalls.length,
        abandonedInboundCalls: abandonedCalls.length,
        answeredInboundCalls: inboundCalls.length - abandonedCalls.length,
        percentage: abandonmentRate
      },
      calculation: `(${abandonedCalls.length} abandoned ÷ ${inboundCalls.length} inbound calls) × 100 = ${abandonmentRate.toFixed(2)}%`,
      result: abandonmentRate
    };

    // Step 6: Average Speed of Answer
    const answeredInbound = inboundCalls.filter(call => call.Abandoned === 'NO');
    let totalQueueTime = 0;
    const queueTimeSamples: number[] = [];
    
    answeredInbound.forEach(call => {
      const queueTime = this.parseTimeToMinutes(call['Total Queue'] || '0:00:00.000');
      totalQueueTime += queueTime;
      if (queueTimeSamples.length < 10) queueTimeSamples.push(queueTime);
    });
    
    const avgSpeedOfAnswer = answeredInbound.length > 0 ? totalQueueTime / answeredInbound.length : 0;

    calculationDetails.avgSpeedOfAnswer = {
      formula: 'Σ(Queue Wait Time for answered calls) ÷ Number of Answered Calls',
      values: {
        answeredInboundCalls: answeredInbound.length,
        totalQueueTimeMinutes: totalQueueTime,
        sampleQueueTimes: queueTimeSamples.slice(0, 5),
        averageMinutes: avgSpeedOfAnswer
      },
      calculation: `${totalQueueTime.toFixed(2)} total queue minutes ÷ ${answeredInbound.length} answered calls = ${avgSpeedOfAnswer.toFixed(2)} minutes`,
      result: avgSpeedOfAnswer
    };

    // Step 7: Average Handle Time  
    let totalHandleTime = 0;
    const handleTimeSamples: number[] = [];
    
    answeredInbound.forEach(call => {
      const handleTime = this.parseTimeToMinutes(call['Total Handle'] || '0:00:00.000');
      const acwTime = this.parseTimeToMinutes(call['Total ACW'] || '0:00:00.000');
      const combinedTime = handleTime + acwTime;
      totalHandleTime += combinedTime;
      if (handleTimeSamples.length < 10) handleTimeSamples.push(combinedTime);
    });
    
    const avgHandleTime = answeredInbound.length > 0 ? totalHandleTime / answeredInbound.length : 0;

    calculationDetails.avgHandleTime = {
      formula: 'Σ(Talk Time + Hold Time + ACW Time) ÷ Number of Handled Calls',
      values: {
        handledCalls: answeredInbound.length,
        totalHandleTimeMinutes: totalHandleTime,
        sampleHandleTimes: handleTimeSamples.slice(0, 5),
        averageMinutes: avgHandleTime
      },
      calculation: `${totalHandleTime.toFixed(2)} total handle minutes ÷ ${answeredInbound.length} handled calls = ${avgHandleTime.toFixed(2)} minutes`,
      result: avgHandleTime
    };

    // Step 8: Utilization and Shrinkage Calculations
    let totalLoggedTime = 0;
    let totalOnQueueTime = 0;
    let totalBreakTime = 0;
    let totalMealTime = 0;
    let totalAwayTime = 0;
    let totalNotRespondingTime = 0;
    let totalOffQueueTime = 0;
    
    const utilizationSamples: any[] = [];
    const shrinkageSamples: any[] = [];

    console.log('=== AGENT STATUS ANALYSIS ===');
    if (validAgentStatus.length > 0) {
      console.log('Sample agent columns:', Object.keys(validAgentStatus[0]));
    }

    validAgentStatus.forEach((agent, index) => {
      const loggedTime = this.parseTimeToMinutes(agent['Logged In'] || '0:00:00.000');
      const onQueueTime = this.parseTimeToMinutes(agent['On Queue'] || '0:00:00.000');
      const breakTime = this.parseTimeToMinutes(agent['Break'] || '0:00:00.000');
      const mealTime = this.parseTimeToMinutes(agent['Meal'] || '0:00:00.000');
      const awayTime = this.parseTimeToMinutes(agent['Away'] || '0:00:00.000');
      const notRespondingTime = this.parseTimeToMinutes(agent['Not Responding'] || '0:00:00.000');
      const offQueueTime = this.parseTimeToMinutes(agent['Off Queue'] || '0:00:00.000');
      
      totalLoggedTime += loggedTime;
      totalOnQueueTime += onQueueTime;
      totalBreakTime += breakTime;
      totalMealTime += mealTime;
      totalAwayTime += awayTime;
      totalNotRespondingTime += notRespondingTime;
      totalOffQueueTime += offQueueTime;
      
      if (utilizationSamples.length < 5) {
        const agentShrinkage = loggedTime > 0 ? 
          ((breakTime + mealTime + awayTime + notRespondingTime + offQueueTime) / loggedTime) * 100 : 0;
        
        utilizationSamples.push({
          agent: agent['Agent Name'],
          loggedMinutes: loggedTime.toFixed(1),
          onQueueMinutes: onQueueTime.toFixed(1),
          utilization: loggedTime > 0 ? ((onQueueTime / loggedTime) * 100).toFixed(1) : '0.0'
        });
        
        shrinkageSamples.push({
          agent: agent['Agent Name'],
          shrinkage: agentShrinkage.toFixed(1) + '%',
          breakTime: breakTime.toFixed(1),
          mealTime: mealTime.toFixed(1),
          awayTime: awayTime.toFixed(1)
        });
      }
    });

    // Calculate productive time from interactions
    const allAnsweredCalls = validInteractions.filter(call => call.Abandoned === 'NO');
    let totalProductiveTime = 0;
    
    allAnsweredCalls.forEach(call => {
      totalProductiveTime += this.parseTimeToMinutes(call['Total Handle'] || '0:00:00.000');
      totalProductiveTime += this.parseTimeToMinutes(call['Total ACW'] || '0:00:00.000');
    });

    const productiveUtilization = totalLoggedTime > 0 ? (totalProductiveTime / totalLoggedTime) * 100 : 0;
    const onQueueUtilization = totalLoggedTime > 0 ? (totalOnQueueTime / totalLoggedTime) * 100 : 0;
    
    // Traditional WFM Shrinkage: Non-productive time as percentage of logged time
    const totalShrinkageTime = totalBreakTime + totalMealTime + totalAwayTime + 
                              totalNotRespondingTime + totalOffQueueTime;
    const shrinkage = totalLoggedTime > 0 ? (totalShrinkageTime / totalLoggedTime) * 100 : 0;
    
    console.log('Shrinkage Components:');
    console.log(`- Break: ${totalBreakTime.toFixed(1)} min`);
    console.log(`- Meal: ${totalMealTime.toFixed(1)} min`);
    console.log(`- Away: ${totalAwayTime.toFixed(1)} min`);
    console.log(`- Not Responding: ${totalNotRespondingTime.toFixed(1)} min`);
    console.log(`- Off Queue: ${totalOffQueueTime.toFixed(1)} min`);
    console.log(`- Total Shrinkage Time: ${totalShrinkageTime.toFixed(1)} min`);
    console.log(`- Total Logged Time: ${totalLoggedTime.toFixed(1)} min`);
    console.log(`- Shrinkage %: ${shrinkage.toFixed(2)}%`);

    calculationDetails.productiveUtilization = {
      formula: 'Σ(Talk Time + Hold Time + ACW Time from all interactions) ÷ Σ(Agent Login Time) × 100',
      values: {
        totalProductiveTimeMinutes: totalProductiveTime.toFixed(1),
        totalLoggedTimeMinutes: totalLoggedTime.toFixed(1),
        productiveCallsAnalyzed: allAnsweredCalls.length,
        percentage: productiveUtilization
      },
      calculation: `(${totalProductiveTime.toFixed(1)} ÷ ${totalLoggedTime.toFixed(1)}) × 100 = ${productiveUtilization.toFixed(2)}%`,
      result: productiveUtilization
    };

    calculationDetails.onQueueUtilization = {
      formula: 'Σ(On-Queue Time) ÷ Σ(Agent Login Time) × 100',
      values: {
        totalOnQueueTimeMinutes: totalOnQueueTime.toFixed(1),
        totalLoggedTimeMinutes: totalLoggedTime.toFixed(1),
        utilizationSamples: utilizationSamples,
        percentage: onQueueUtilization
      },
      calculation: `(${totalOnQueueTime.toFixed(1)} ÷ ${totalLoggedTime.toFixed(1)}) × 100 = ${onQueueUtilization.toFixed(2)}%`,
      result: onQueueUtilization
    };

    calculationDetails.shrinkage = {
      formula: '(Break + Meal + Away + Not Responding + Off Queue) ÷ Logged In Time × 100',
      values: {
        totalBreakTime: totalBreakTime.toFixed(1),
        totalMealTime: totalMealTime.toFixed(1),
        totalAwayTime: totalAwayTime.toFixed(1),
        totalNotRespondingTime: totalNotRespondingTime.toFixed(1),
        totalOffQueueTime: totalOffQueueTime.toFixed(1),
        totalShrinkageTime: totalShrinkageTime.toFixed(1),
        totalLoggedTime: totalLoggedTime.toFixed(1),
        agentSamples: shrinkageSamples,
        percentage: shrinkage
      },
      calculation: `(${totalBreakTime.toFixed(1)} + ${totalMealTime.toFixed(1)} + ${totalAwayTime.toFixed(1)} + ${totalNotRespondingTime.toFixed(1)} + ${totalOffQueueTime.toFixed(1)}) ÷ ${totalLoggedTime.toFixed(1)} × 100 = ${shrinkage.toFixed(2)}%`,
      result: shrinkage
    };

    // Log all calculation details
    console.log('=== DETAILED CALCULATION ANALYSIS ===');
    Object.entries(calculationDetails).forEach(([key, details]) => {
      const calculationDetail = details as {
        formula: string;
        values: any;
        calculation: string;
        result: number | string;
      };
      console.log(`\n${key.toUpperCase()}:`);
      console.log(`Formula: ${calculationDetail.formula}`);
      console.log(`Values:`, calculationDetail.values);
      console.log(`Calculation: ${calculationDetail.calculation}`);
      console.log(`Result: ${calculationDetail.result}`);
    });

    // Compare with Python validation baseline
    console.log('\n=== PYTHON VALIDATION COMPARISON ===');
    console.log('Python Baseline vs React Calculated:');
    
    const pythonBaseline = {
      totalCalls: 58273,
      transferRate: 6.88,
      abandonmentRate: 9.01,
      avgSpeedOfAnswer: 6.93,
      avgHandleTime: 9.94,
      productiveUtilization: 45.47,
      onQueueUtilization: 60.14
    };
    
    const reactCalculated = {
      totalCalls,
      transferRate: Number(transferRate.toFixed(2)),
      abandonmentRate: Number(abandonmentRate.toFixed(2)),
      avgSpeedOfAnswer: Number(avgSpeedOfAnswer.toFixed(2)),
      avgHandleTime: Number(avgHandleTime.toFixed(2)),
      productiveUtilization: Number(productiveUtilization.toFixed(2)),
      onQueueUtilization: Number(onQueueUtilization.toFixed(2))
    };
    
    let validationPassed = 0;
    let totalValidations = 0;
    
    Object.keys(pythonBaseline).forEach(metric => {
      const pythonValue = pythonBaseline[metric as keyof typeof pythonBaseline];
      const reactValue = reactCalculated[metric as keyof typeof reactCalculated];
      const tolerance = metric === 'totalCalls' ? 100 : 0.1;
      const isValid = Math.abs(reactValue - pythonValue) < tolerance;
      
      console.log(`${metric}: ${reactValue} (Python: ${pythonValue}) - ${isValid ? '✓' : '✗'}`);
      if (isValid) validationPassed++;
      totalValidations++;
    });
    
    console.log(`Shrinkage: ${shrinkage.toFixed(2)}% (New WFM Formula) - Traditional calculation using agent states`);
    console.log(`\n🔍 DATA QUALITY SCORE: ${validationPassed}/${totalValidations} metrics passed validation`);
    
    if (validationPassed === totalValidations) {
      console.log('✅ ALL VALIDATIONS PASSED - High confidence in calculations');
    } else if (validationPassed >= totalValidations * 0.8) {
      console.log('⚠️ MOST VALIDATIONS PASSED - Minor discrepancies detected');
    } else {
      console.log('🚨 VALIDATION FAILURES - Major data integrity issues detected');
    }

    return {
      totalCalls,
      transferRate,
      productiveUtilization,
      onQueueUtilization,
      avgSpeedOfAnswer,
      abandonmentRate,
      avgHandleTime,
      shrinkage,
      calculationDetails
    };
  }
}