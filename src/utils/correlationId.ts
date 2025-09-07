import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

/**
 * CorrelationIdUtil class for managing and tracking correlation IDs.
 * Provides advanced methods to generate, retrieve, validate, and log correlation IDs,
 * ensuring consistent traceability across asynchronous operations.
 */
class CorrelationIdUtil {
  private static storage = new AsyncLocalStorage<Map<string, string>>();
  private static readonly CORRELATION_ID_KEY = 'correlationId';
  private static readonly DEFAULT_HEADER_NAME = 'x-correlation-id';

  /**
   * Generates a new correlation ID using `randomUUID`.
   * @returns {string} A new unique correlation ID.
   */
  private static generateCorrelationId(): string {
    return randomUUID();
  }

  /**
   * Retrieves the current correlation ID.
   * @returns {string | undefined} The current correlation ID, or undefined if not set.
   */
  public static getCorrelationId(): string | undefined {
    const store = this.storage.getStore();
    return store?.get(this.CORRELATION_ID_KEY);
  }

  /**
   * Validates whether a given string is a valid UUID format.
   * @param {string} id - The string to validate as a UUID.
   * @returns {boolean} True if valid, false otherwise.
   */
  private static isValidUuid(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Sets a correlation ID for the current execution context.
   * If the ID is invalid, it generates a new one.
   * @param {string} correlationId - The correlation ID to set.
   */
  public static setCorrelationId(correlationId: string): void {
    const validId = this.isValidUuid(correlationId)
      ? correlationId
      : this.generateCorrelationId();
    const store = this.storage.getStore() || new Map<string, string>();
    store.set(this.CORRELATION_ID_KEY, validId);
    this.storage.enterWith(store);
  }

  /**
   * Runs a function within a context containing the correlation ID.
   * If no correlation ID is provided, it generates a new one.
   * @param {Function} fn - The function to run within the correlation ID context.
   * @param {string} [correlationId] - Optional correlation ID to use.
   * @returns {T} The result of the function execution.
   */
  public static runWithCorrelationId<T>(
    fn: () => T,
    correlationId?: string
  ): T {
    const id =
      correlationId && this.isValidUuid(correlationId)
        ? correlationId
        : this.generateCorrelationId();
    const store = new Map<string, string>([[this.CORRELATION_ID_KEY, id]]);
    return this.storage.run(store, fn);
  }

  /**
   * Middleware to attach a correlation ID to every request in an Express app.
   * Generates a new correlation ID if not present or invalid in the request headers.
   * @param {string} [headerName] - Custom header name for the correlation ID. Defaults to 'x-correlation-id'.
   * @returns {Function} The Express middleware function.
   */
  public static correlationIdMiddleware(
    headerName: string = this.DEFAULT_HEADER_NAME
  ) {
    return (req: any, res: any, next: Function) => {
      let correlationId = req.headers[headerName]?.toString();
      if (!correlationId || !this.isValidUuid(correlationId)) {
        correlationId = this.generateCorrelationId();
      }

      this.runWithCorrelationId(() => {
        req.correlationId = correlationId;
        res.setHeader(headerName, correlationId);
        next();
      }, correlationId);
    };
  }

  /**
   * Logs the current correlation ID for traceability.
   * @param {string} message - The message to log with the correlation ID.
   */
  public static logCorrelationId(message: string): void {
    const correlationId = this.getCorrelationId();
    console.log(`[CorrelationID: ${correlationId || 'N/A'}] ${message}`);
  }

  /**
   * Attaches the current correlation ID to external service requests (e.g., Axios).
   * @param {object} headers - The headers object to modify.
   * @param {string} [headerName] - Custom header name for the correlation ID. Defaults to 'x-correlation-id'.
   * @returns {object} The modified headers object with the correlation ID attached.
   */
  public static attachCorrelationIdToHeaders(
    headers: Record<string, string>,
    headerName: string = this.DEFAULT_HEADER_NAME
  ): Record<string, string> {
    const correlationId =
      this.getCorrelationId() || this.generateCorrelationId();
    return { ...headers, [headerName]: correlationId };
  }
}

export default CorrelationIdUtil;
