// Jest global setup — runs before each test suite
// Set DynamoDB to use localstack instead of production AWS

process.env.DYNAMODB_ENDPOINT = 'http://localhost:4566';
process.env.TABLE_NAME = 'LMS';
process.env.AWS_REGION = 'local';
process.env.AWS_ACCESS_KEY_ID = 'local';
process.env.AWS_SECRET_ACCESS_KEY = 'local';
