const express = require("express");
const app = express();
const path = require("path");
var cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const FormData = require("form-data");
const mongoose = require("mongoose");
const multer = require("multer");

const port = process.env.PORT || 4000;
require("dotenv").config();

var UPLOAD_FOLDER = "uploads/";

//middleware
app.use(bodyParser.json());
app.set("view engin", "ejs");
app.use(cors());
app.use(express.json());
var jwt = require('jsonwebtoken');
// var token = jwt.sign({ foo: 'bar' }, 'shhhhh');

// Set up Multer storage options
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Uploads will be stored in the 'uploads/' directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name as the file name
  },
});

//npm run start-dev

const { MongoClient, ServerApiVersion } = require("mongodb");
const { query } = require("express");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qdbumy3.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const conn = mongoose.createConnection(uri);

// Api Naming Conversion


function verifyJWT(req, res, next) {

  const bearerHeader = req.headers.authorization;

if(!bearerHeader){
  return res.status(401).send({message:"Unauthorized Access"});
}
const token = bearerHeader.split(' ')[1];
jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, function(err,decoded){
  if(err){
  return res.status(401).send({message:"Unauthorized Access"});
  }
  req.decoded = decoded;
  next();
})


}


async function run() {
  try {
    await client.connect();
    console.log("DB connected!!!");


    const editorCollection = client.db("ejournal20").collection("editor");
    const reviewerCollection = client.db("ejournal20").collection("reviewer");
    const dataCollection = client.db("ejournal20").collection("submittedData");
    const usersCollection = client.db("ejournal20").collection("users");

    // author Post Coding
    app.post("/author",async (req, res) => {
      const author = req.body;
      const query = { authorEmail: author.authorEmail };
      const exists = await usersCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, authorEmai: exists });
      }
      const result =await usersCollection.insertOne(author);
      return res.send({ success: true, result });
    });
//All users Post Method 

   // author Post Coding
  //  app.post("/users",async(req, res) => {
  //   const user = req.body;
  //   const query = { authorEmail: author.authorEmail };
  //   const exists = authorCollection.findOne(query);
  //   if (exists) {
  //     return res.send({ success: false, authorEmai: exists });
  //   }
  //   const result = authorCollection.insertOne(author);
  //   return res.send({ success: true, result });
  // });

    const upload = multer({ storage: storage });

    // Define the route for handling file uploads
    app.post("/file", upload.single("file"), function (req, res, next) {
      // Access the uploaded file using req.file
      const file = req.file;

      // Create a URL to the uploaded file
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
        file.filename
      }`;

      // Do something with the file URL, such as saving it to a database

      res.send(`${fileUrl}`);
    });

    app.post('/jwt',(req,res)=>{
      const user =req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET, { expiresIn:'72h'});
      res.send({token})


    })

    app.post("/submittedData", async (req, res) => {
      try {
        // Get the uploaded file from the request

        const articleType = req.body.articleType;
        const title = req.body.title;
        const email = req.body.email;
        const abstract = req.body.abstract;
        const keyword = req.body.keyword;
        const url = req.body.url;
        const fileName = req.body.fileName;
        const comment = req.body.comment;
        const reviewer = req.body.reviewer;

        // Store the file in MongoDB
        const db = client.db("ejournal20");
        const collection = db.collection("submittedData");
        const result = await collection.insertOne({
          url: url,
          email: email,
          fileName: fileName,
          title: title,
          articleType: articleType,
          abstract: abstract,
          keyword: keyword,
          reviewer: reviewer,
          comment: comment,
        });

        // Send a success response
        res.send(`File uploaded successfully. ID: ${result.insertedId}`);
      } catch (error) {
        // Send an error response
        res.status(500).send(error.message);
      }
    });



    // get file  from submittedData

    const { ObjectId } = require("mongodb");

    app.get("/submittedData",verifyJWT, async (req, res) => {
      const decoded = req.decoded;

      if(decoded.email !== req.query.email) {
return res.status(401).send({message:'Unauthorized Access'})
      }
      let query = {};

      if(req.query.email){
        query={
          email:req.query.email
        }
      }
const cursor= dataCollection.find(query);
const data=await cursor.toArray();
res.send(data);
    });
  
    app.get("/uploads/:filename", (req, res) => {
      const { filename } = req.params;
      const filePath = path.join(__dirname, "uploads", filename);
      res.sendFile(filePath);
    });

    // author GET Coding
    app.get("/author", async (req, res) => {
      const author = await usersCollection.find({ query }).toArray();
      res.send(author);
    });

    // Editor GET Coding
    app.get("/editor", async (req, res) => {
      const editor = await editorCollection.find({ query }).toArray();
      res.send(editor);
    });


        ///////////Delete Opatation////////////
        app.delete("/submittedData/:id", (req, res) => {
          dataCollection.deleteOne({ _id: ObjectId(req.params.id) })
              .then((result) => {
                  res.send(result.deletedCount > 0);
              })
      })

      //submitted data get ops

        // Retrieve the data for the requested ID from the database
        app.get('/submittedData/:id', (req, res) => {
          const id = req.params.id;
          const objectId = ObjectId(id);
  dataCollection.findOne({ _id: objectId }, (err, data) => {
            if (err) {
              console.error(err);
              res.status(500).send('An error occurred while retrieving data');
              return;
            }
            if (!data) {
              res.status(404).send('Data not found');
              return;
            }
        
            res.send(data);
          });
        });



    // Editor GET Coding
    app.get("/reviewer", async (req, res) => {
      const editor = await reviewerCollection.find({ query }).toArray();
      res.send(editor);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
