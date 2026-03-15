const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const docClient = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

exports.handler = async (event) => {
  const response = {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  };

  try {
    const { httpMethod, body } = event;

    if (httpMethod === 'POST') {
      const { email } = JSON.parse(body);
      
      if (!email) {
        response.statusCode = 400;
        response.body = JSON.stringify({ error: 'Email is required' });
        return response;
      }

      const resetToken = uuidv4();
      const expires = Date.now() + 3600000;

      await docClient.put({
        TableName: process.env.DYNAMODB_TABLE,
        Item: { email, token: resetToken, expires }
      }).promise();

      const message = `Your password reset token is: ${resetToken}`;
      await sns.publish({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Message: JSON.stringify({ email, message }),
        Subject: 'Password Reset Request - Online Book Store'
      }).promise();

      response.body = JSON.stringify({ message: 'Password reset instructions sent to email' });
    } else {
      response.statusCode = 405;
      response.body = JSON.stringify({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error:', error);
    response.statusCode = 500;
    response.body = JSON.stringify({ error: 'Internal server error' });
  }

  return response;
};
