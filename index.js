const express = require('express')
const app = express();
const path = require('path');
var cors = require('cors');
const bodyParser = require('body-parser');
const crypto= require('crypto');
const FormData = require('form-data');
const mongoose= require('mongoose');
const multer = require('multer');



const port =process.env.PORT || 4000
require('dotenv').config();

var UPLOAD_FOLDER='uploads/' ;


//middleware
app.use(bodyParser.json());
app.set('view engin','ejs');
app.use(cors());
app.use(express.json());
var jwt = require('jsonwebtoken');


// Set up Multer storage options
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Uploads will be stored in the 'uploads/' directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname) // Use the original file name as the file name
  }
})

//npm run start-dev



const { MongoClient, ServerApiVersion } = require('mongodb');
const { query } = require('express');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qdbumy3.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const conn=mongoose.createConnection(uri);





// Api Naming Conversion

async function run() {
    try {
   await client.connect();
    console.log("DB connected!!!");
      
      const authorCollection= client.db("ejournal20").collection("author");
      const editorCollection= client.db("ejournal20").collection("editor");
          const dataCollection= client.db("ejournal20").collection("submittedData")


// author Post Coding
    app.post('/author', (req, res) => {
      const author = req.body;
      const query={authorEmail:author.authorEmail};
      const exists =  authorCollection.findOne(query)
      if(exists){
        return res.send({success:false,authorEmai:exists});
      }
    const result = authorCollection.insertOne(author);
   return res.send({success:true,result});
   })


const upload = multer({ storage: storage })

// Define the route for handling file uploads
app.post('/file', upload.single('file'), function (req, res, next) {
  // Access the uploaded file using req.file
  const file = req.file;

  // Create a URL to the uploaded file
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

  // Do something with the file URL, such as saving it to a database

  res.send(`${fileUrl}`);

 
});



app.post('/submittedData', async (req, res) => {
  try {
    // Get the uploaded file from the request
 
    const articleType = req.body.articleType;
    const title = req.body.title;
    const abstract = req.body.abstract;
    const keyword = req.body.keyword;
    const url = req.body.url;
    const fileName=req.body.fileName;
    const comment = req.body.comment;
    const reviewer = req.body.reviewer;
   





    // Store the file in MongoDB
    const db = client.db('ejournal20');
    const collection = db.collection('submittedData');
    const result = await collection.insertOne({ 

      
url:url,
fileName:fileName,
title:title,
articleType:articleType,
abstract:abstract,
keyword:keyword,
reviewer:reviewer,
comment:comment,

       });


    // Send a success response
    res.send(`File uploaded successfully. ID: ${result.insertedId}`);
  } catch (error) {
    // Send an error response
    res.status(500).send(error.message);
  }
});



// get file  from submittedData

app.get('/submittedData',async (req, res) => {
  const author = await  dataCollection.find({query}).toArray();
  res.send(author);   
  })

  app.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);
    res.sendFile(filePath);
  });
  

// author GET Coding
app.get('/author',async (req, res) => {
const author = await  authorCollection.find({query}).toArray();
res.send(author);   
})




// Editor GET Coding
app.get('/editor',async (req, res) => {
const editor = await  editorCollection.find({query}).toArray();
  res.send(editor);
          
    })



}

finally {
    // await client.close();
  }

}
run().catch(console.dir);

app.get('/', (req, res) => {

  res.send('Hello World!')

})





app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


