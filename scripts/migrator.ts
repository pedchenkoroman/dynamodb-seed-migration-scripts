import {
  DynamoDBDocumentClient,
  ExecuteStatementCommandOutput,
  PutCommand,
  PutCommandOutput,
  QueryCommand,
  QueryCommandOutput,
  ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import ora, { Ora } from 'ora';

const REGION = String(process.env.AWS_REGION);
const ddbClient = new DynamoDBClient({ region: REGION });

type Configuration = {
  /**
   * The name of DynamoDb table where stored all scrips that were executed before
   */
  scriptTable: string;
  /**
   * The migration/seed script name will be stored in the DynamoDB table to prevent accidental re-execution
   */
  scriptName: string;
  /**
   * To skip all checks and run the script directly
   */
  force?: boolean;
};

type Key = { ExclusiveStartKey?: Record<string, any> };

export type Operations = {
  read?: (
    ExclusiveStartKey?: Key,
  ) => Promise<QueryCommandOutput | ScanCommandOutput | ExecuteStatementCommandOutput>;
  transform?: <T>(arr: T[]) => T[];
  write: <T>(arr: T) => Promise<void>;
};

export class Migrator {
  private readonly scriptTable: string;
  private readonly scriptName: string;
  private readonly force: boolean;
  private readonly client = DynamoDBDocumentClient.from(ddbClient);
  private readonly spinner: Ora;

  constructor(
    { scriptTable, scriptName, force = false }: Configuration,
    private readonly operations: Operations,
  ) {
    this.scriptTable = scriptTable;
    this.scriptName = scriptName;
    this.force = force;
    this.spinner = ora({ text: `The ${scriptName} script is running.` }).start();
  }

  async run() {
    try {
      this.spinner.info(`Checking the ${this.scriptName} script has been run before!`);
      if (!this.force && (await this.isExecuted())) {
        return this.spinner.fail(`The ${this.scriptName} script has been already run!`);
      }
      this.spinner.info('Start execution!');
      await this.start();
      this.spinner.succeed(`The ${this.scriptName} has been successfully finished`);
    } catch (e) {
      console.log('Method run: ', e);
      this.spinner.succeed('Something went wrong, please see logs!');
    }
  }

  private read(
    ExclusiveStartKey?: Key,
  ): Promise<QueryCommandOutput | ScanCommandOutput | ExecuteStatementCommandOutput> {
    if (this.operations.read) {
      return this.operations.read(ExclusiveStartKey);
    }

    return Promise.resolve({ Items: [], Count: 0, $metadata: {} });
  }

  private transform<T>(data: T[]): T[] {
    if (this.operations.transform) {
      return this.operations.transform(data);
    }

    return data;
  }

  private async write<T>(items: T[]): Promise<void> {
    // TransactWriteItems is a synchronous write operation that groups up to 100 action requests
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

  private async start(ExclusiveStartKey?: Key): Promise<void> {
    this.spinner.info('Reading data');
    const { Items = [], LastEvaluatedKey } = await this.read(ExclusiveStartKey);
    this.spinner.info('Mutating data');
    const newItems = this.transform(Items);

    this.spinner.info('Saving data');
    await this.write(newItems);

    if (LastEvaluatedKey) {
      this.spinner.info('Goes for the next chunk');
      return this.start(LastEvaluatedKey);
    }

    this.spinner.info(`Store the ${this.scriptName} script execution to ${this.scriptTable}`);

    await this.storeScriptExecution();
    return;
  }

  private async isExecuted(): Promise<boolean> {
    const queryCommand = new QueryCommand({
      TableName: this.scriptTable,
      KeyConditionExpression: `#script = :scriptName`,
      ExpressionAttributeValues: {
        ':scriptName': this.scriptName,
      },
      ExpressionAttributeNames: {
        '#script': 'script',
      },
    });

    const { Items } = await this.client.send(queryCommand);

    return Boolean(Items?.length);
  }

  private storeScriptExecution(): Promise<PutCommandOutput> {
    const putCommand = new PutCommand({
      TableName: this.scriptTable,
      Item: {
        script: this.scriptName,
      },
    });

    return this.client.send(putCommand);
  }
}
