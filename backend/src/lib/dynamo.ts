import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  TransactWriteCommand,
  BatchWriteCommand,
  type GetCommandInput,
  type PutCommandInput,
  type QueryCommandInput,
  type UpdateCommandInput,
  type DeleteCommandInput,
  type TransactWriteCommandInput,
  type BatchWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME ?? 'LMS';

const clientConfig: ConstructorParameters<typeof DynamoDBClient>[0] = {};
if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  clientConfig.region = 'local';
  clientConfig.credentials = { accessKeyId: 'local', secretAccessKey: 'local' };
}

const rawClient = new DynamoDBClient(clientConfig);
export const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export function tableName(): string {
  return TABLE_NAME;
}

export async function getItem(key: Record<string, string>) {
  const params: GetCommandInput = { TableName: TABLE_NAME, Key: key };
  const result = await docClient.send(new GetCommand(params));
  return result.Item;
}

export async function putItem(item: Record<string, any>, condition?: string) {
  const params: PutCommandInput = {
    TableName: TABLE_NAME,
    Item: item,
    ...(condition ? { ConditionExpression: condition } : {}),
  };
  await docClient.send(new PutCommand(params));
}

export async function queryItems(params: Omit<QueryCommandInput, 'TableName'>) {
  const result = await docClient.send(
    new QueryCommand({ TableName: TABLE_NAME, ...params })
  );
  return result.Items ?? [];
}

export async function updateItem(params: Omit<UpdateCommandInput, 'TableName'>) {
  const result = await docClient.send(
    new UpdateCommand({ TableName: TABLE_NAME, ...params })
  );
  return result.Attributes;
}

export async function deleteItem(key: Record<string, string>) {
  await docClient.send(
    new DeleteCommand({ TableName: TABLE_NAME, Key: key })
  );
}

export async function transactWrite(params: TransactWriteCommandInput) {
  await docClient.send(new TransactWriteCommand(params));
}

export async function batchWrite(params: BatchWriteCommandInput) {
  await docClient.send(new BatchWriteCommand(params));
}
