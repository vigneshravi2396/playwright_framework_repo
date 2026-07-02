import { APIRequestContext, request, APIResponse } from '@playwright/test';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

export interface ApiResponse {
  status: number;
  ok: boolean;
  body: unknown;
  headers: Record<string, string>;
}

export class ApiUtility {
  private baseUrl: string;
  private requestContext!: APIRequestContext;
  private token: string | null = null;
  private globalHeaders: Record<string, string> = {};
  private defaultTimeout: number = 30000;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Initializes the API request context
   * @description Must be called before making any API requests to set up the request context
   * @returns Promise that resolves when initialization is complete
   * @throws Error if request context creation fails
   * @example
   * ```typescript
   * const api = new ApiUtility('https://api.example.com');
   * await api.init();
   * ```
   */
  async init(): Promise<void> {
    this.requestContext = await request.newContext();
  }

  /**
   * Disposes the API request context and cleans up resources
   * @description Call this method at the end of tests to free up resources
   * @returns Promise that resolves when disposal is complete
   * @throws Error if disposal fails
   * @example
   * ```typescript
   * await api.dispose();
   * ```
   */
  async dispose(): Promise<void> {
    await this.requestContext.dispose();
  }

  /**
   * Sets the authentication token for all API requests
   * @param token - Bearer token for authentication
   * @description Sets the token that will be included in Authorization header for all subsequent requests
   * @example
   * ```typescript
   * api.setAuthToken('your-jwt-token');
   * ```
   */
  setAuthToken(token: string): void {
    this.token = token;
  }

  /**
   * Removes the authentication token from all API requests
   * @description Clears the stored token, subsequent requests will not include Authorization header
   * @example
   * ```typescript
   * api.clearAuthToken();
   * ```
   */
  clearAuthToken(): void {
    this.token = null;
  }

  // Global headers are useful for:
  // - API versions (X-API-Version)
  // - Client identification (User-Agent, X-Client-Version)
  // - Environment headers (X-Environment)
  // - Common headers across all requests
  /**
   * Sets global headers that will be included in all API requests
   * @param headers - Object containing header key-value pairs
   * @description Useful for setting common headers like API version, client identification, environment headers
   * @example
   * ```typescript
   * api.setGlobalHeaders({
   *   'X-API-Version': 'v1',
   *   'User-Agent': 'MyApp/1.0',
   *   'X-Environment': 'test'
   * });
   * ```
   */
  setGlobalHeaders(headers: Record<string, string>): void {
    this.globalHeaders = { ...headers };
  }

  /**
   * Adds a single header to the global headers
   * @param key - Header name
   * @param value - Header value
   * @description Adds or updates a specific header in the global headers collection
   * @example
   * ```typescript
   * api.addGlobalHeader('X-Custom-Header', 'custom-value');
   * ```
   */
  addGlobalHeader(key: string, value: string): void {
    this.globalHeaders[key] = value;
  }

  /**
   * Removes a specific header from global headers
   * @param key - Header name to remove
   * @description Removes the specified header from the global headers collection
   * @example
   * ```typescript
   * api.removeGlobalHeader('X-Custom-Header');
   * ```
   */
  removeGlobalHeader(key: string): void {
    delete this.globalHeaders[key];
  }

  /**
   * Removes all global headers
   * @description Clears all headers from the global headers collection
   * @example
   * ```typescript
   * api.clearGlobalHeaders();
   * ```
   */
  clearGlobalHeaders(): void {
    this.globalHeaders = {};
  }

  /**
   * Gets a copy of all current global headers
   * @returns Object containing all global headers
   * @description Returns a copy of the current global headers without modifying the original
   * @example
   * ```typescript
   * const headers = api.getGlobalHeaders();
   * console.log(headers);
   * ```
   */
  getGlobalHeaders(): Record<string, string> {
    return { ...this.globalHeaders };
  }

  /**
   * Sets the default timeout for all API requests
   * @param timeout - Timeout in milliseconds
   * @description Sets the default timeout that will be used for all requests unless overridden
   * @example
   * ```typescript
   * api.setTimeout(60000); // 60 seconds
   * ```
   */
  setTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = `${this.baseUrl}${endpoint}`;
    
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const urlObj = new URL(url);
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.append(key, String(value));
    });
    
    return urlObj.toString();
  }

  private mergeHeaders(options?: ApiRequestOptions): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge in this order: base -> global -> auth -> request-specific
    const mergedHeaders = {
      ...baseHeaders,
      ...this.globalHeaders,
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options?.headers,
    };

    return mergedHeaders;
  }

  private async sendRequest(
    method: string,
    endpoint: string,
    data?: object,
    options?: ApiRequestOptions
  ): Promise<ApiResponse> {
    const headers = this.mergeHeaders(options);
    const url = this.buildUrl(endpoint, options?.params);
    const timeout = options?.timeout || this.defaultTimeout;

    const response: APIResponse = await this.requestContext.fetch(url, {
      method,
      headers,
      data: data ? JSON.stringify(data) : undefined,
      timeout,
    });

    const body = await this.safeParseJson(response);
    const responseHeaders = response.headers();
    
    return {
      status: response.status(),
      ok: response.ok(),
      body,
      headers: responseHeaders,
    };
  }

  private async safeParseJson(response: APIResponse): Promise<unknown> {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch {
      // If JSON parsing fails, try to return the raw text
      try {
        return await response.text();
      } catch {
        return {};
      }
    }
  }

  // HTTP Methods
  /**
   * Performs a GET request to the specified endpoint
   * @param endpoint - API endpoint path (e.g., '/users', '/api/v1/products')
   * @param options - Optional request configuration (headers, params, timeout)
   * @returns Promise resolving to ApiResponse with status, body, and headers
   * @throws Error with details if request fails
   * @example
   * ```typescript
   * const response = await api.get('/users');
   * console.log(response.body); // Array of users
   * ```
   * @example
   * ```typescript
   * const response = await api.get('/users', {
   *   params: { page: 1, limit: 10 },
   *   headers: { 'Accept': 'application/json' }
   * });
   * ```
   */
  async get(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse> {
    return this.sendRequest('GET', endpoint, undefined, options);
  }

  /**
   * Performs a POST request to create a new resource
   * @param endpoint - API endpoint path for the resource
   * @param data - Request body data to send (will be JSON stringified)
   * @param options - Optional request configuration (headers, params, timeout)
   * @returns Promise resolving to ApiResponse with created resource data
   * @throws Error with details if request fails
   * @example
   * ```typescript
   * const newUser = await api.post('/users', {
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   * console.log(newUser.body.id); // New user ID
   * ```
   */
  async post(endpoint: string, data?: object, options?: ApiRequestOptions): Promise<ApiResponse> {
    return this.sendRequest('POST', endpoint, data, options);
  }

  /**
   * Performs a PUT request to update an entire resource
   * @param endpoint - API endpoint path for the resource (usually includes ID)
   * @param data - Complete resource data to replace existing resource
   * @param options - Optional request configuration (headers, params, timeout)
   * @returns Promise resolving to ApiResponse with updated resource data
   * @throws Error with details if request fails
   * @example
   * ```typescript
   * const updatedUser = await api.put('/users/123', {
   *   name: 'Jane Doe',
   *   email: 'jane@example.com',
   *   status: 'active'
   * });
   * ```
   */
  async put(endpoint: string, data?: object, options?: ApiRequestOptions): Promise<ApiResponse> {
    return this.sendRequest('PUT', endpoint, data, options);
  }

  /**
   * Performs a PATCH request to partially update a resource
   * @param endpoint - API endpoint path for the resource (usually includes ID)
   * @param data - Partial resource data to update only specific fields
   * @param options - Optional request configuration (headers, params, timeout)
   * @returns Promise resolving to ApiResponse with updated resource data
   * @throws Error with details if request fails
   * @example
   * ```typescript
   * const updatedUser = await api.patch('/users/123', {
   *   status: 'inactive' // Only update the status field
   * });
   * ```
   */
  async patch(endpoint: string, data?: object, options?: ApiRequestOptions): Promise<ApiResponse> {
    return this.sendRequest('PATCH', endpoint, data, options);
  }

  /**
   * Performs a DELETE request to remove a resource
   * @param endpoint - API endpoint path for the resource (usually includes ID)
   * @param options - Optional request configuration (headers, params, timeout)
   * @returns Promise resolving to ApiResponse with deletion confirmation
   * @throws Error with details if request fails
   * @example
   * ```typescript
   * const result = await api.delete('/users/123');
   * console.log(result.status); // 204 or 200
   * ```
   */
  async delete(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse> {
    return this.sendRequest('DELETE', endpoint, undefined, options);
  }

  /**
   * Performs a HEAD request to get only response headers
   * @param endpoint - API endpoint path to check
   * @param options - Optional request configuration (headers, params, timeout)
   * @returns Promise resolving to ApiResponse with headers only (no body)
   * @throws Error with details if request fails
   * @example
   * ```typescript
   * const response = await api.head('/users/123');
   * console.log(response.headers['content-type']);
   * ```
   */
  async head(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse> {
    return this.sendRequest('HEAD', endpoint, undefined, options);
  }

  /**
   * Performs an OPTIONS request to get allowed HTTP methods
   * @param endpoint - API endpoint path to check
   * @param options - Optional request configuration (headers, params, timeout)
   * @returns Promise resolving to ApiResponse with allowed methods in headers
   * @throws Error with details if request fails
   * @example
   * ```typescript
   * const response = await api.options('/users');
   * console.log(response.headers['allow']); // GET, POST, OPTIONS
   * ```
   */
  async options(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse> {
    return this.sendRequest('OPTIONS', endpoint, undefined, options);
  }

  // Generic method for any HTTP method
  /**
   * Performs a request with any HTTP method
   * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)
   * @param endpoint - API endpoint path
   * @param data - Request body data (for POST, PUT, PATCH methods)
   * @param options - Optional request configuration (headers, params, timeout)
   * @returns Promise resolving to ApiResponse
   * @throws Error with details if request fails
   * @example
   * ```typescript
   * const response = await api.makeRequest('GET', '/users');
   * const response2 = await api.makeRequest('POST', '/users', { name: 'John' });
   * ```
   */
  async makeRequest(
    method: string, 
    endpoint: string, 
    data?: object, 
    options?: ApiRequestOptions
  ): Promise<ApiResponse> {
    return this.sendRequest(method.toUpperCase(), endpoint, data, options);
  }

  // Utility methods for common test scenarios
  /**
   * Polls an endpoint until it returns the expected status code
   * @param endpoint - API endpoint to poll
   * @param expectedStatus - Expected HTTP status code (default: 200)
   * @param maxRetries - Maximum number of retry attempts (default: 5)
   * @param retryDelay - Delay between retries in milliseconds (default: 1000)
   * @returns Promise resolving to ApiResponse when expected status is received
   * @throws Error if expected status is not received after max retries
   * @example
   * ```typescript
   * // Wait for a job to complete
   * const response = await api.waitForEndpoint('/jobs/123/status', 200, 10, 2000);
   * ```
   */
  async waitForEndpoint(
    endpoint: string, 
    expectedStatus: number = 200, 
    maxRetries: number = 5,
    retryDelay: number = 1000
  ): Promise<ApiResponse> {
    for (let i = 0; i < maxRetries; i++) {
      const response = await this.get(endpoint);
      if (response.status === expectedStatus) {
        return response;
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => (globalThis as any).setTimeout(resolve, retryDelay));
      }
    }
    throw new Error(
      `Endpoint ${endpoint} did not return expected status ${expectedStatus} after ${maxRetries} retries`
    );
  }

  /**
   * Polls an endpoint until a custom condition is met
   * @param endpoint - API endpoint to poll
   * @param condition - Function that evaluates the response and returns true when condition is met
   * @param maxRetries - Maximum number of retry attempts (default: 5)
   * @param retryDelay - Delay between retries in milliseconds (default: 1000)
   * @returns Promise resolving to ApiResponse when condition is satisfied
   * @throws Error if condition is not met after max retries
   * @example
   * ```typescript
   * // Wait for user count to reach 10
   * const response = await api.waitForCondition('/users', (res) => {
   *   return res.body.length >= 10;
   * });
   * ```
   */
  async waitForCondition(
    endpoint: string,
    // eslint-disable-next-line no-unused-vars
    condition: (response: ApiResponse) => boolean,
    maxRetries: number = 5,
    retryDelay: number = 1000
  ): Promise<ApiResponse> {
    for (let i = 0; i < maxRetries; i++) {
      const response = await this.get(endpoint);
      if (condition(response)) {
        return response;
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => (globalThis as any).setTimeout(resolve, retryDelay));
      }
    }
    throw new Error(`Condition not met for endpoint ${endpoint} after ${maxRetries} retries`);
  }

  // Helper method to validate response status
  /**
   * Validates that the response status matches the expected status
   * @param response - ApiResponse object to validate
   * @param expectedStatus - Expected HTTP status code
   * @throws Error if status doesn't match expected value
   * @example
   * ```typescript
   * const response = await api.get('/users');
   * api.assertStatus(response, 200);
   * ```
   */
  assertStatus(response: ApiResponse, expectedStatus: number): void {
    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus}, but got ${response.status}. Response: ${JSON.stringify(response.body)}`
      );
    }
  }

  // Helper method to validate response is OK
  /**
   * Validates that the response is successful (status 200-299)
   * @param response - ApiResponse object to validate
   * @throws Error if response is not successful
   * @example
   * ```typescript
   * const response = await api.post('/users', userData);
   * api.assertOk(response);
   * ```
   */
  assertOk(response: ApiResponse): void {
    if (!response.ok) {
      throw new Error(
        `Expected OK response, but got status ${response.status}. Response: ${JSON.stringify(response.body)}`
      );
    }
  }
}