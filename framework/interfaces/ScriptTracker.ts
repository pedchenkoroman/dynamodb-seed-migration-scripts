/**
 * Interface for tracking the execution status of a migration script.
 *
 * Implementations of this interface should provide mechanisms to check
 * whether a script has already been executed and to record new executions.
 * This allows for idempotent migrations by ensuring scripts are only run once.
 */
export interface ScriptTracker {
  /**
   * Checks if the current script has already been executed.
   *
   * @returns A Promise that resolves to `true` if the script has been executed before,
   * and `false` otherwise.
   */
  isExecuted: () => Promise<boolean>;
  /**
   * Records the execution of the current script.
   *
   * @returns A Promise that resolves once the script execution has been stored.
   * This method should ensure that the script's execution is persisted in a way
   * that can be checked later by `isExecuted`.
   */
  storeExecution: () => Promise<void>;
}
