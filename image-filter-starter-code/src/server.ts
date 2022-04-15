require('dotenv').config();

import express from 'express';
import bodyParser from 'body-parser';
import {filterImageFromURL, deleteLocalFiles} from './util/util';
import AWS = require('aws-sdk');
import { config } from './config/config';

(async () => {

  // Init the Express application
  const app = express();

  // Set the network port
  const port = process.env.PORT || 8082;
  
  // Use the body parser middleware for post requests
  app.use(bodyParser.json());

  // End point filteredimage
  app.get( "/filteredimage", async ( req, res ) => {
      try {
        const fs = require('fs');
        const image_url = req.query.image_url;

        // validate the image_url query        
        if (!image_url) return res.status(400).send({ message: 'image url is required' });

        // call filterImageFromURL(image_url) to filter the image
        let filterImagePath = await filterImageFromURL(image_url);
        
        // get file name
        let fileName = filterImagePath.split('/').pop();
        
        // upload file to s3
        const fileStream = fs.createReadStream(filterImagePath);

        const uploadParams = {
          Bucket: c.aws_media_bucket,
          Body: fileStream,
          Key: fileName,
        };
        
        // upload and get singed url
        const url = await s3.upload(uploadParams).promise()
        .then((data)=>{return getGetSignedUrl (fileName)})
        .catch(err=>console.log(err))

        // deletes any files on the server on finish of the response
        deleteLocalFiles([filterImagePath]);

        // show result 
        let img = '<img src="' + url + '">';
        res.send(img);

      } catch (error) {res.status(400).send('An unexpected error has occurred')}
  } );
  
  // Root Endpoint
  // Displays a simple message to the user
  app.get( "/", async ( req, res ) => {
    res.send("try GET /filteredimage?image_url={{}}")
  } );
  
  // Start the Server
  app.listen( port, () => {
      console.log( `server running http://localhost:${ port }` );
      console.log( `press CTRL+C to stop server` );
  } );
})();

//Configure AWS
const c = config.dev;

if(c.aws_profile !== "DEPLOYED") {
  var credentials = new AWS.SharedIniFileCredentials({profile: c.aws_profile});
 AWS.config.credentials = credentials;
}

export const s3 = new AWS.S3({
  signatureVersion: 'v4',
  region: c.aws_region,
  params: {Bucket: c.aws_media_bucket}
});

export function uploadFile(fileName: string, filePath: string): string {
  const fs = require('fs');
  const fileStream = fs.createReadStream(filePath);
  const uploadParams = {
    Bucket: c.aws_media_bucket,
    Body: fileStream,
    Key: fileName,
  };

  s3.upload(uploadParams).promise()
  .then((data)=>{return data.Location})
  .catch(err=>console.log(err))

  return;
}

export function getGetSignedUrl( key: string ): string{

  const signedUrlExpireSeconds = 60 * 5

  const url = s3.getSignedUrl('getObject', {
      Bucket: c.aws_media_bucket,
      Key: key,
      Expires: signedUrlExpireSeconds,
      ResponseContentType: 'image/jpeg'
  });

  return url;
}
