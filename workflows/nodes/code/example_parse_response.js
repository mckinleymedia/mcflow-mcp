// Parse the API response and extract relevant data
const items = $input.all();
const parsedItems = [];

for (const item of items) {
  const data = item.json;
  
  // Extract and validate the response
  if (data && data.results) {
    for (const result of data.results) {
      parsedItems.push({
        json: {
          id: result.id,
          name: result.name || 'Unknown',
          value: result.value || 0,
          timestamp: new Date().toISOString(),
          status: result.status || 'pending'
        }
      });
    }
  } else {
    // Handle empty or invalid response
    parsedItems.push({
      json: {
        error: 'Invalid response format',
        originalData: data,
        timestamp: new Date().toISOString()
      }
    });
  }
}

return parsedItems.length > 0 ? parsedItems : [{ json: { message: 'No data to process' } }];