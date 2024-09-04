const {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} = require("@aws-sdk/client-bedrock-agent-runtime");

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION,
});

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    // Handle CORS preflight request
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust this to your specific origin
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      },
    };
  }

  const { question } = JSON.parse(event.body);

  console.log("question",question);

  const input = {
    agentAliasId: process.env.AGENT_ALIAS_ID,
    agentId: process.env.AGENT_ID,
    sessionId: "3543511C-152A-4987-9026-0DFE665EC36C", //unique session id from frontend
    inputText: question,
  }

  const command = new InvokeAgentCommand(input);
  const response = await client.send(command);

  let completion = "";

  console.log("response",response);

  for await (let chunkEvent of response.completion) {
      const chunk = chunkEvent.chunk;
      console.log(chunk);
      const decodedResponse = new TextDecoder("utf-8").decode(chunk.bytes);
      completion += decodedResponse;
  }
  
  console.log(completion);

  return {
    statusCode: 200,
    body: JSON.stringify({
      reply: completion
    }),
  };
};
