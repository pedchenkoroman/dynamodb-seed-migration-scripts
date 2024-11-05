import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

import { Migrator } from '../../framework/migrator';
import { Operations } from '../../framework/interfaces/Operations';
import { DynamodbScriptTracker } from '../../framework/dynamodb-script-tracker';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

const documentClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true },
});

export const scriptTracker = new DynamodbScriptTracker(documentClient, {
  scriptName: 'accounts-dynamodb',
  scriptStore: 'migration-seed-scripts-table',
});

const operations: Operations = {
  read: async () => {
    const queryCommand = new QueryCommand({
      TableName: 'accounts',
      KeyConditionExpression: '#type = :type',
      ExpressionAttributeValues: {
        '#type': 'user',
      },
    });
    const { Items = [], LastEvaluatedKey } = await documentClient.send(queryCommand);

    return { items: Items, nextPageToken: LastEvaluatedKey };
  },
  transform: (data: any) =>
    data.map(({ name, ...rest }: any) => ({ firstName: String(name).toUpperCase(), ...rest })),
  write: async (data: any) => {
    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: data.map((modifiedItem: any) => ({
          Put: {
            TableName: 'accounts',
            Item: modifiedItem,
            ConditionExpression: '#type = :type',
            ExpressionAttributeValues: {
              ':type': modifiedItem.type,
            },
          },
        })),
      }),
    );
  },
};

export const migration = new Migrator(scriptTracker, operations, false);
