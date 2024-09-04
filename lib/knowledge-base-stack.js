require("dotenv").config();

const { Stack, SecretValue, Duration, RemovalPolicy } = require("aws-cdk-lib");
const { bedrock, pinecone } = require('@cdklabs/generative-ai-cdk-constructs');
const secretsmanager = require('aws-cdk-lib/aws-secretsmanager');

const s3 = require("aws-cdk-lib/aws-s3");
const lambda = require("aws-cdk-lib/aws-lambda");

const { S3EventSource } = require("aws-cdk-lib/aws-lambda-event-sources");
const iam = require("aws-cdk-lib/aws-iam");

const { QueryStack } = require("./knowledge-base-query-stack");


class KnowledgeBaseStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.dataSourceBucket = new s3.Bucket(this, "DataSourceBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const secret = new secretsmanager.Secret(this, 'PineconeSecret', {
      secretName: 'pinecone-secret',
      secretObjectValue: {
        apiKey: SecretValue.unsafePlainText(process.env.PINECONE_API_KEY),
      }
    });

    const vectorStore = new pinecone.PineconeVectorStore({
      connectionString: process.env.PINECONE_CONNECTION_STRING,
      credentialsSecretArn: secret.secretArn,
      textField: 'question',
      metadataField: 'metadata'
    });

    const knowledgeBase = new bedrock.KnowledgeBase(this, 'KnowledgeBase', {
      name: 'genaitour-knowledge-base',
      vectorStore: vectorStore,
      embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
      instruction: 'use this knowledge base to answer questions about generative ai tour event, speaker details, schedule, event location and more',
    });

    this.kb = knowledgeBase;
    this.knowledgeBaseId = knowledgeBase.knowledgeBaseId;

    const bucketDataSource = new bedrock.S3DataSource(this, 'BucketDataSource', {
      bucket: this.dataSourceBucket,
      knowledgeBase: knowledgeBase,
      dataSourceName: 'genaitour-events',
      chunkingStrategy: bedrock.ChunkingStrategy.DEFAULT,
    });


    const s3PutEventSource = new S3EventSource(this.dataSourceBucket, {
      events: [s3.EventType.OBJECT_CREATED_PUT],
    });

    const lambdaIngestionJob = new lambda.Function(this, "IngestionJob", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("./src/IngestJob"),
      timeout: Duration.minutes(5),
      environment: {
        KNOWLEDGE_BASE_ID: knowledgeBase.knowledgeBaseId,
        DATA_SOURCE_ID: bucketDataSource.dataSourceId,
      },
    });

    lambdaIngestionJob.addEventSource(s3PutEventSource);

    lambdaIngestionJob.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:StartIngestionJob",
          "bedrock:AssociateThirdPartyKnowledgeBase"],
        resources: [knowledgeBase.knowledgeBaseArn],
      })
    );
  }
}

module.exports = { KnowledgeBaseStack }
