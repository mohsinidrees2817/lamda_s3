const AWS = require("aws-sdk");
const { fromPath, fromBuffer } = require("pdf2pic");
const path = require("path");
const fs = require("fs");
const os = require("os");

const s3 = new AWS.S3();

exports.handler = async (event) => {
  const sourceBucket = "inputbucketofchartdata"; // Replace with your S3 bucket name
  const sourcePdfKey = "cognitodetails.pdf"; // Replace with your PDF file name

  const targetBucket = "outputbucketofchartdata"; // Replace with your target S3 bucket name
  const targetFolder = "convertedimages"; // Replace with the folder where you want to save the images in the target bucket

  try {
    const s3GetObjectParams = {
      Bucket: sourceBucket,
      Key: sourcePdfKey,
    };
    let s3_response = await s3.getObject(s3GetObjectParams).promise();
    console.log("s3 response", s3_response);
    const pdfBuffer = s3_response.Body;

    const options = {
      density: 100,
      format: "png",
      width: 600,
      height: 600,
      savePath: os.tmpdir(),
    };
    const converter = fromBuffer(pdfBuffer, options);

    // Convert all pages to PNG images
    const pagesToConvert = -1;

    const images = await converter.bulk(pagesToConvert);

    console.log("Images converted:", images);

    // Now you have an array of PNG images in the `images` variable
    // You can upload these images to the target S3 bucket

    const uploadPromises = images.map((image, index) => {
      const imageName = `page_${index + 1}.png`;
      const imageKey = `${targetFolder}/${imageName}`;
      const uploadParams = {
        Bucket: targetBucket,
        Key: imageKey,
        Body: fs.readFileSync(image.path),
        ContentType: "image/png",
      };
      return s3.upload(uploadParams).promise();
    });

    await Promise.all(uploadPromises);

    console.log("Images uploaded to S3");

    return {
      statusCode: 200,
      body: "PDF conversion and image upload successful",
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      body: "Error converting PDF to images",
    };
  }
};
