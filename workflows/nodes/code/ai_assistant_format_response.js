// Format the AI response for output
const items = $input.all();
const formattedResponses = [];

for (const item of items) {
  const aiResponse = item.json;
  
  // Parse the AI response if it's a string
  let parsedResponse;
  try {
    parsedResponse = typeof aiResponse === 'string' 
      ? JSON.parse(aiResponse) 
      : aiResponse;
  } catch (error) {
    // If parsing fails, create a fallback response
    parsedResponse = {
      summary: 'Failed to parse AI response',
      error: error.message,
      originalResponse: aiResponse
    };
  }
  
  // Format the response for output
  const formatted = {
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substring(7),
    
    // Core response data
    summary: parsedResponse.summary || 'No summary provided',
    confidence: parsedResponse.confidence || 0,
    
    // Detailed sections
    solution: {
      overview: parsedResponse.solution?.steps?.join('\n') || 'No solution steps provided',
      requirements: parsedResponse.solution?.requirements || [],
      estimatedTime: calculateEstimatedTime(parsedResponse.solution?.steps)
    },
    
    // Implementation guide
    implementation: {
      hasCode: !!parsedResponse.implementation?.code,
      code: parsedResponse.implementation?.code || null,
      configuration: parsedResponse.implementation?.config || null
    },
    
    // Risk assessment
    risks: {
      challenges: parsedResponse.challenges || [],
      severity: assessRiskSeverity(parsedResponse.challenges),
      mitigations: generateMitigations(parsedResponse.challenges)
    },
    
    // Recommendations
    recommendations: {
      optimizations: parsedResponse.optimizations || [],
      priority: prioritizeOptimizations(parsedResponse.optimizations),
      nextSteps: generateNextSteps(parsedResponse)
    },
    
    // Metadata
    metadata: {
      processingTime: Date.now() - (item.startTime || Date.now()),
      aiModel: 'gpt-4',
      workflowVersion: '1.0.0',
      additionalNotes: parsedResponse.additionalNotes || null
    }
  };
  
  formattedResponses.push({
    json: formatted
  });
}

// Helper functions
function calculateEstimatedTime(steps) {
  if (!steps || !Array.isArray(steps)) return 'Unknown';
  const minutes = steps.length * 5; // Assume 5 minutes per step
  if (minutes < 60) return `${minutes} minutes`;
  return `${Math.round(minutes / 60)} hours`;
}

function assessRiskSeverity(challenges) {
  if (!challenges || challenges.length === 0) return 'Low';
  if (challenges.length <= 2) return 'Medium';
  return 'High';
}

function generateMitigations(challenges) {
  if (!challenges || !Array.isArray(challenges)) return [];
  
  return challenges.map(challenge => ({
    challenge: challenge,
    mitigation: `Implement validation and error handling for: ${challenge}`
  }));
}

function prioritizeOptimizations(optimizations) {
  if (!optimizations || optimizations.length === 0) return [];
  
  // Simple prioritization based on common keywords
  return optimizations.map(opt => {
    let priority = 'Low';
    if (opt.toLowerCase().includes('performance')) priority = 'High';
    if (opt.toLowerCase().includes('security')) priority = 'Critical';
    if (opt.toLowerCase().includes('automation')) priority = 'Medium';
    
    return {
      optimization: opt,
      priority: priority
    };
  });
}

function generateNextSteps(response) {
  const steps = [];
  
  if (response.solution?.steps?.length > 0) {
    steps.push('Begin implementation of proposed solution');
  }
  
  if (response.challenges?.length > 0) {
    steps.push('Review and address identified challenges');
  }
  
  if (response.optimizations?.length > 0) {
    steps.push('Evaluate optimization opportunities');
  }
  
  if (steps.length === 0) {
    steps.push('Review the analysis and provide feedback');
  }
  
  return steps;
}

return formattedResponses;