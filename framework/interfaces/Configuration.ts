/**
 * Configuration options for the migrator, defining the script tracking details and execution behavior.
 */
export type Configuration = {
  /**
   * The name of the table, file, or other storage location where executed scripts are recorded.
   * This store tracks previously executed scripts to avoid re-execution.
   */
  scriptStore: string;
  /**
   * The unique name or identifier for the migration/seed script.
   * Used to log this specific script in `scriptStore` to prevent accidental re-execution.
   */
  scriptName: string;
};
