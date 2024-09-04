const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const axios = require('axios');

const s3Client = new S3Client({
  region: process.env.AWS_REGION, // Replace with your region
});

exports.handler = async (event) => {
  const url = process.env.TARGET_URL; // Assuming the URL is passed in the event object

  try {
    const response = await axios.get(url);
    const htmlContent = response.data;

    const params = {
      Bucket: process.env.BUCKET_NAME, // Replace with your bucket name
      Key: `genaitour.dev.html`, // Define the S3 object key
      Body: htmlContent,
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "HTML page saved successfully" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error saving HTML page" }),
    };
  }
};