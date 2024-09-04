const { Stack, Duration, RemovalPolicy } = require("aws-cdk-lib");
const { bedrock } = require("@cdklabs/generative-ai-cdk-constructs");
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const lambda = require("aws-cdk-lib/aws-lambda");
const ses = require('aws-cdk-lib/aws-ses');
const iam = require('aws-cdk-lib/aws-iam');
const path = require("path");

class AgentStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        this.agent = new bedrock.Agent(this, 'Agent', {
            foundationModel: bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_V2_1,
            instruction: "You are a helpful and friendly agent that answers questions about generative ai tour event",
            knowledgeBases: [props.kb],
            aliasName: "latest",
            enableUserInput: true,
            shouldPrepareAgent: true
        });

        const registerTable = new dynamodb.Table(this, 'RegisterTable', {
            partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'email', type: dynamodb.AttributeType.STRING },
            tableName: 'registerTable',
            removalPolicy: RemovalPolicy.DESTROY
        });

        const actionGroupFunction = new lambda.Function(this, 'ActionGroupFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            timeout: Duration.seconds(30),
            code: lambda.Code.fromAsset('src/registerActionGroup'),
            environment: {
                TABLE_NAME: registerTable.tableName,
                FROM_EMAIL: process.env.FROM_EMAIL
            }
        });

        registerTable.grantWriteData(actionGroupFunction);

        new ses.EmailIdentity(this, 'EmailIdentity', {
            identity: ses.Identity.domain(process.env.EMAIL_DOMAIN)
        });

        // Grant Lambda permission to send emails using SES
        actionGroupFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ses:SendEmail'],
            resources: ['*'],
        }));    

        const actionGroup = new bedrock.AgentActionGroup(this, 'registerActionGroup', {
            actionGroupName: 'registerActionGroup',
            description: "Use these functions to register user into generative ai tour event by requesting their name and email",
            actionGroupExecutor: {
                lambda: actionGroupFunction
            },
            actionGroupState: "ENABLED",
            apiSchema: bedrock.ApiSchema.fromAsset(path.join(__dirname,"../src/registerActionGroup/action-group.yaml"))
        });

        this.agent.addActionGroup(actionGroup);
    }
}

module.exports = { AgentStack };