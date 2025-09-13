You are analyzing the following data: {{ $json.data }}

Please provide a comprehensive analysis that includes:

## Data Quality Assessment
- Identify any missing or incomplete data
- Check for inconsistencies or anomalies
- Evaluate the overall reliability of the data

## Key Insights
- Extract the most important findings
- Identify patterns and trends
- Highlight any unexpected discoveries

## Recommendations
Based on your analysis, provide actionable recommendations for:
- Data improvement strategies
- Next steps for investigation
- Risk mitigation approaches

Format your response as structured JSON with these sections:
{
  "quality": {
    "score": 0-100,
    "issues": [],
    "strengths": []
  },
  "insights": {
    "key_findings": [],
    "patterns": [],
    "anomalies": []
  },
  "recommendations": {
    "immediate_actions": [],
    "long_term_strategies": [],
    "risks_to_monitor": []
  }
}