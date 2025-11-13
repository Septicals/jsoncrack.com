/**
 * Utility function to update a JSON value at a specific path
 */

export function updateJsonValue(json: string, path: (string | number)[], newValue: any): string {
  try {
    const obj = JSON.parse(json);
    
    if (path.length === 0) {
      // Root level update
      return JSON.stringify(newValue, null, 2);
    }

    // Navigate to the parent object
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      current = current[key];
    }

    // Update the value
    const lastKey = path[path.length - 1];
    current[lastKey] = newValue;

    return JSON.stringify(obj, null, 2);
  } catch (err) {
    throw new Error(`Failed to update JSON value: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}
