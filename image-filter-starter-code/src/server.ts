import express from 'express';
import bodyParser from 'body-parser';
import {filterImageFromURL, deleteLocalFiles} from './util/util';

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
        const image_url = req.query.image_url;

        // validate the image_url query        
        if (!image_url) return res.status(400).send({ message: 'image url is required' });

        // call filterImageFromURL(image_url) to filter the image
        const filterImagePath = await filterImageFromURL(image_url);

        // show result 
        res.status(200).sendFile(filterImagePath, err => {
          if (err) throw err;

          // deletes any files on the server on finish of the response
          deleteLocalFiles([filterImagePath]);
       });
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