#!/usr/bin/env node
require('dotenv').config();

const cdk = require('aws-cdk-lib');
const { CrawlerStack } = require('../lib/crawler-stack');
const { FrontendStack } = require("../lib/frontend-stack");
const { KnowledgeBaseStack } = require("../lib/knowledge-base-stack");
const { KnowledgeBaseQueryStack } = require("../lib/knowledge-base-query-stack");
const { AgentStack } = require("../lib/agent-stack");

const app = new cdk.App();

const env = {
  region: process.env.AWS_REGION,
};

const knowledgeBase = new KnowledgeBaseStack(app, 'KnowledgeBaseStack', {});

new CrawlerStack(app, 'CrawlerWebStack', {
  bucket: knowledgeBase.dataSourceBucket,
});


const agentStack = new AgentStack(app, 'AgentStack', {
  kb: knowledgeBase.kb,
});

new KnowledgeBaseQueryStack(app, 'QueryStack', {
  knowledgeBaseId: knowledgeBase.knowledgeBaseId,
  agent: agentStack.agent,
});

new FrontendStack(app, 'FrontendStack', {});

