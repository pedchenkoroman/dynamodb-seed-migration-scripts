/**
 * Represents the output of a read operation, which retrieves items in chunks.
 * This output format is designed to support paginated reading from various sources.
 */
export type ReadOutput = {
  /**
   * The items retrieved from the read operation.
   */
  items: any[];
  /**
   * Token indicating the next page in a paginated read.
   * If undefined, there are no additional pages to read.
   */
  nextPageToken?: any;
};

/**
 * Defines the operations used by the migrator, including reading, transforming, and writing data.
 * This structure allows flexibility in handling different sources and destinations of data.
 */
export type Operations = {
  /**
   * A required read function that retrieves items in chunks.
   *
   * @param pageToken - Optional token for paginated reading, to get the next chunk of items.
   * @returns A Promise that resolves to a `ReadOutput` containing the items and the next page token (if any).
   */
  read: (pageToken?: any) => Promise<ReadOutput>;
  /**
   * An optional transform function that applies transformations to an array of items.
   *
   * @param arr - Array of items to transform.
   * @returns A transformed array of items, preserving type `T`.
   */
  transform?: <T>(arr: T[]) => T[];
  /**
   * A required write function that writes a batch of items to a target resource.
   *
   * @param arr - Array of items to write.
   * @returns A Promise that resolves once the items are written.
   */
  write: <T>(arr: T) => Promise<void>;
};
