const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { PutCommand, DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
 const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");
        
const dyanmoDBclient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dyanmoDBclient);

const SESclient = new SESv2Client({ region: process.env.AWS_REGION });


module.exports.handler = async (event) => {
    let response_code = 200;
    const { parameters ,actionGroup, apiPath, httpMethod } = event;
    
    let body = {};

    if (apiPath == '/{name}/{email}/{city}') {
        const result = Object.fromEntries(parameters.map((param) => [param.name, param.value]));

        const putCommand = new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: {
                name: result.name,
                email: result.email,
                city: result.city
            }
        });

        await docClient.send(putCommand);

        const SendEmailcommand = new SendEmailCommand({
            FromEmailAddress: process.env.FROM_EMAIL,
            Destination: {
              ToAddresses: [result.email],
            },
            Content: {
              Simple: {
                Body: {
                  Text: {
                    Data: `Terima kasih ${result.name}, kamu sudah terdaftar di event generative ai tour di ${result.city}`,
                  },
                },
                Subject: {
                  Data: "Registrasi berhasil",
                },
              },
            }
        });
        
        await SESclient.send(SendEmailcommand);

        body = {
            response: "user registered successfully"
        }
    } else {
        response_code = 400;
        body = {
            message: 'invalid api path'
        };
    }

    const response_body = JSON.stringify({
        "application/json": {
            body
        }
    });

    return {
        "messageVersion": "1.0",
        "response": {
            'actionGroup': actionGroup,
            'apiPath': apiPath,
            'httpMethod': httpMethod,
            'httpStatusCode': response_code,
            'responseBody': response_body
        }
    };
};