const { Duration, Stack, CfnOutput } = require('aws-cdk-lib');
const lambda = require('aws-cdk-lib/aws-lambda');
const iam = require('aws-cdk-lib/aws-iam');

const path = require('path');


class KnowledgeBaseQueryStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        const queryHandler = new lambda.Function(this, 'QueryHandler', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../src/queryKnowledgeBase')),
            timeout: Duration.seconds(30),
            environment: {
                KNOWLEDGE_BASE_ID: props.knowledgeBaseId,
                AGENT_ID: props.agent.agentId,
                AGENT_ALIAS_ID: props.agent.aliasId,
            }
        });

        const functionUrl = queryHandler.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
            invokeMode: lambda.InvokeMode.BUFFERED,
            cors: {
                allowedOrigins: ['*'],
                allowedMethods: ['*'],
                allowedHeaders: ['Content-Type'],
            }
        });

        queryHandler.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    "bedrock:RetrieveAndGenerate",
                    "bedrock:Retrieve",
                    "bedrock:InvokeModel",
                    "bedrock:InvokeAgent",
                ],
                resources: ['*']
            })
        );

        new CfnOutput(this, 'QueryHandlerArn', {
            value: functionUrl.url,
            description: 'Query handler Function URL',
        });
    }
}

module.exports = { KnowledgeBaseQueryStack }