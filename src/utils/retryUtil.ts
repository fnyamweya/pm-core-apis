/**
 * A utility function to retry an asynchronous operation with exponential backoff.
 * @param operation - The asynchronous operation to retry.
 * @param retries - The maximum number of retries.
 * @param delay - The initial delay between retries in milliseconds.
 * @param factor - The factor by which the delay increases after each retry.
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  retries: number = 5,
  delay: number = 1000,
  factor: number = 2
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryOperation(operation, retries - 1, delay * factor, factor);
    } else {
      throw error;
    }
  }
}
