const { Stack, RemovalPolicy, CfnOutput } = require('aws-cdk-lib');
const s3 = require('aws-cdk-lib/aws-s3');
const cloudfront = require('aws-cdk-lib/aws-cloudfront');
const deployment = require('aws-cdk-lib/aws-s3-deployment');
const path = require('path');

class FrontendStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        const webBucket = new s3.Bucket(this, 'WebBucket', {
            websiteIndexDocument: 'index.html',
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            autoDeleteObjects: true,
        });

        const webDeployment = new deployment.BucketDeployment(this, 'DeployWebsite', {
            sources: [deployment.Source.asset(path.join(__dirname, '../src/web/public'))],
            destinationBucket: webBucket
        });

        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
            comment: 'CloudFront Origin Access Identity'
        });
        webBucket.grantRead(originAccessIdentity);
        
        const webDistribution = new cloudfront.CloudFrontWebDistribution(this, 'WebDistribution', {
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: webBucket,originAccessIdentity
                    },
                    behaviors: [{ isDefaultBehavior: true }]
                }
            ]
        });
        
        webDeployment.distribution = webDistribution;

        new CfnOutput(this, 'WebUrl', {
            value: `https://${webDeployment.distribution.distributionDomainName}`
        });
    }
}

module.exports  = { FrontendStack }