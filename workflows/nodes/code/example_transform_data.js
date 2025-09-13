// Transform and enrich the parsed data
const items = $input.all();
const transformedItems = [];

for (const item of items) {
  const data = item.json;
  
  // Skip error items
  if (data.error) {
    transformedItems.push(item);
    continue;
  }
  
  // Apply transformations
  const transformed = {
    // Original fields
    id: data.id,
    name: data.name,
    
    // Calculated fields
    displayName: `${data.name} (${data.id})`,
    valueCategory: categorizeValue(data.value),
    processedAt: new Date().toISOString(),
    
    // Status mapping
    statusCode: mapStatusToCode(data.status),
    isActive: data.status === 'active',
    
    // Metadata
    metadata: {
      originalValue: data.value,
      originalStatus: data.status,
      transformationVersion: '1.0.0'
    }
  };
  
  transformedItems.push({
    json: transformed
  });
}

// Helper functions
function categorizeValue(value) {
  if (value < 10) return 'low';
  if (value < 50) return 'medium';
  if (value < 100) return 'high';
  return 'very-high';
}

function mapStatusToCode(status) {
  const statusMap = {
    'pending': 1,
    'active': 2,
    'completed': 3,
    'failed': -1
  };
  return statusMap[status] || 0;
}

return transformedItems;