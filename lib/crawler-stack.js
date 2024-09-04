require("dotenv").config();

const { Stack, Duration, Fn } = require('aws-cdk-lib');
const lambda = require('aws-cdk-lib/aws-lambda');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');

class CrawlerStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        const crawlerLambda = new lambda.Function(this, 'CrawlerLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('src/crawler'),
            timeout: Duration.seconds(30),
            environment: {
                TARGET_URL: process.env.CRAWL_TARGET_URL,
                BUCKET_NAME: props.bucket.bucketName,
            },
        });
       
        props.bucket.grantReadWrite(crawlerLambda);

        new events.Rule(this, 'CrawlerRule', {
            schedule: events.Schedule.rate(Duration.days(1)),
            targets: [new targets.LambdaFunction(crawlerLambda)],
        });
    }
}   

module.exports = { CrawlerStack }