import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

import { Configuration } from './interfaces/Configuration';
import { ScriptTracker } from './interfaces/ScriptTracker';

/**
 * Create a specific ScriptTracker that uses DynamoDB for script execution tracking.
 */
export class DynamodbScriptTracker implements ScriptTracker {
  private readonly scriptName: string;
  private readonly scriptStore: string;

  constructor(
    private dynamoDBClient: DynamoDBDocumentClient,
    { scriptName, scriptStore }: Configuration,
  ) {
    this.scriptName = scriptName;
    this.scriptStore = scriptStore;
  }

  async isExecuted(): Promise<boolean> {
    const queryCommand = new QueryCommand({
      TableName: this.scriptStore,
      KeyConditionExpression: `#script = :scriptName`,
      ExpressionAttributeValues: {
        ':scriptName': this.scriptName,
      },
      ExpressionAttributeNames: {
        '#script': 'script',
      },
    });

    const { Items } = await this.dynamoDBClient.send(queryCommand);

    return Boolean(Items?.length);
  }

  async storeExecution(): Promise<void> {
    const putCommand = new PutCommand({
      TableName: this.scriptStore,
      Item: {
        script: this.scriptName,
      },
    });

    await this.dynamoDBClient.send(putCommand);
  }
}
