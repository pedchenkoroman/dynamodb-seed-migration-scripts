import ora, { Ora } from 'ora';
import { ScriptTracker } from './interfaces/ScriptTracker';
import { Operations } from './interfaces/Operations';

/**
 * Migrator depends only on ScriptTracker and Operations. This makes it truly generic and agnostic of where tracking data is stored.
 */
export class Migrator {
  private readonly spinner: Ora;

  constructor(
    private scriptTracker: ScriptTracker,
    private readonly operations: Operations,
    /**
     * An optional flag that, when set to `true`, skips execution checks and runs the script directly.
     * Useful for forced migrations where repeated execution is necessary.
     */
    private force = false,
  ) {
    this.spinner = ora({ text: `The script is running.` }).start();
  }

  async run() {
    try {
      this.spinner.info(`Checking if the script has been run before`);
      if (!this.force && (await this.scriptTracker.isExecuted())) {
        return this.spinner.fail(`The script has already been run!`);
      }
      this.spinner.info('Start execution!');
      await this.start();
      this.spinner.succeed(`The script has finished successfully`);
    } catch (e) {
      console.error('Method run: ', e);
      this.spinner.fail(`Something went wrong; please see logs! ${e}`);
    }
  }

  private async write<T>(items: T[]): Promise<void> {
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      await this.operations.write(batch);
    }
    return;
  }

  private async start(pageToken?: any): Promise<void> {
    this.spinner.info('Reading data in chunks');

    const { items: items, nextPageToken } = await this.operations.read(pageToken);

    const newItems = this.operations.transform ? this.operations.transform(items) : items;

    this.spinner.info('Saving data');
    await this.write(newItems);

    if (nextPageToken) {
      this.spinner.info('Fetching the next chunk');
      return this.start(nextPageToken);
    }

    this.spinner.info(`Recording the script execution`);
    await this.scriptTracker.storeExecution();
  }
}
