const express = require("express");
const app = express();
const path = require("path");
var cors = require("cors");
const bodyParser = require("body-parser");

const mongoose = require("mongoose");
const multer = require("multer");
var morganLogger = require("morgan");
const port = process.env.PORT || 4000;
require("dotenv").config();

var UPLOAD_FOLDER = "uploads/";

//middleware
app.use(morganLogger("dev"));
app.use(bodyParser.json());
app.set("view engin", "ejs");
app.use(cors());
app.use(express.json());
var jwt = require("jsonwebtoken");

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
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized accesse 401");
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
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
    app.post("/author", async (req, res) => {
      const author = req.body;
      const query = { email: author.email };

      const exists = await usersCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, email: exists });
      }
      const result = await usersCollection.insertOne(author);
      return res.send({ success: true, result });
    });
    const upload = multer({ storage: storage });

    //reviewer add into db

    app.post("/addReviewer", async (req, res) => {
      const author = req.body;
      const query = { email: author.email };
      console.log("Hello", author);
      const exists = await reviewerCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, email: exists });
      }
      const result = await reviewerCollection.insertOne(author);
      return res.send({ success: true, author });
    });

    //get reviewer from db

    app.get("/getReviewer", async (req, res) => {
      try {
        const users = await reviewerCollection.find().toArray();
        return res.send(users);
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

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

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };

      const user = (await usersCollection) || reviewerCollection.findOne(query);

      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "72h",
        });

        return res.send({ accessToken: token });
      }

      res.status(403).send({ accessToken: "" });
    });

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

    app.get("/submittedData/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const objectId = ObjectId(id);

        const user = await dataCollection.findOne({ _id: objectId });

        if (!user) {
          res.status(404).send("Data not found");
          return;
        }

        res.send(user);
      } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while retrieving data");
      }
    });
    //get data collection
    app.get("/submittedData", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      if (decoded.email !== req.query.email) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      let query = {};

      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = dataCollection.find(query);
      const data = await cursor.toArray();
      res.send(data);
    });

    app.get("/adminData", async (req, res) => {
      const query = {};
      const cursor = dataCollection.find(query);
      const data = await cursor.toArray();
      res.send(data);
    });

    app.get("/revData", async (req, res) => {
      const email = req.query.email;

      const cursor = dataCollection.find({ assignReviewerEmail: email });
      const data = await cursor.toArray();
      res.send(data);
    });

    //npm run start-dev

    app.get("/uploads/:filename", (req, res) => {
      const { filename } = req.params;
      const filePath = path.join(__dirname, "uploads", filename);
      res.sendFile(filePath);
    });

    const lastAccessed = {};
    // author GET Coding
    app.get("/author", async (req, res) => {
      // Get the email parameter from the request query string
      const email = req.query.email;
      // Create a query object that matches the email field
      const query = { email: email };
      // Find the document that matches the query
      const cursor = usersCollection.find(query);
      const data = await cursor.toArray();
      res.send(data);
    });

    //update author data
    app.put("/authorData/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };

      // create a new object with non-null properties from `user`
      const updateUser = {};
      if (user.authorName !== null && user.authorName !== undefined) {
        updateUser.authorName = user.authorName;
      }
      if (user.phone !== null && user.phone !== undefined) {
        updateUser.phone = user.phone;
      }
      if (user.institutionName !== null && user.institutionName !== undefined) {
        updateUser.institutionName = user.institutionName;
      }
      if (user.department !== null && user.department !== undefined) {
        updateUser.department = user.department;
      }
      if (user.city !== null && user.city !== undefined) {
        updateUser.city = user.city;
      }
      if (user.postalCode !== null && user.postalCode !== undefined) {
        updateUser.postalCode = user.postalCode;
      }
      if (user.imageUrl !== null && user.imageUrl !== undefined) {
        updateUser.profilePic = user.imageUrl;
      }

      const updatedUser = {
        $set: updateUser,
      };

      try {
        const result = await usersCollection.updateOne(
          filter,
          updatedUser,
          options
        );
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
      }
    });

    //////////end of

    // Editor GET Coding
    app.get("/editor", async (req, res) => {
      const editor = await editorCollection.find({ query }).toArray();
      res.send(editor);
    });

    ///////////Delete Opatation///////////
    app.delete("/submittedData/:id", (req, res) => {
      dataCollection
        .deleteOne({ _id: ObjectId(req.params.id) })
        .then((result) => {
          res.send(result.deletedCount > 0);
        });
    });

    // Retrieve the data for the requested ID from the database

    app.get("/users/admin", async (req, res) => {
      const query = {};
      const user = await usersCollection.find(query).toArray();
      res.send(user);
    });

    app.get("/allUserData", async (req, res) => {
      const query = {};
      const user = await usersCollection.find(query).toArray();
      res.send(user);
    });

    //UPDATE Users Data Collection
    app.put("/users/admin/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const options = { returnOriginal: false };

      try {
        const result = await usersCollection.findOneAndUpdate(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send(error);
      }
    });

    //PUt Assign Reviewer
    app.put("/assign/:id", async (req, res) => {
      const id = req.params.id;
      const { assignReviewer, assignReviewerEmail } = req.body;

      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          assignReviewer: assignReviewer,
          assignReviewerEmail: assignReviewerEmail,
        },
      };
      const options = { returnOriginal: false };

      try {
        const result = await dataCollection.findOneAndUpdate(
          filter,
          updateDoc,
          options
        );

        // Check if the document was updated
        if (!result.value) {
          return res.status(404).send({ message: "Document not found" });
        }

        res.send(result);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    // Editor GET Coding
    app.get("/reviewer", async (req, res) => {
      const editor = await reviewerCollection.find({ query }).toArray();
      res.send(editor);
    });

    //Get Admin data

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      console.log("Hello", query);
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
      console.log("Hello", res.send);
    });

    //find reviwere
    app.get("/users/reviewer/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email };

        const user = await reviewerCollection.findOne(query);

        if (user) {
          res.send({ isReviewer: true });
        } else {
          res.send({ isReviewer: false });
        }
      } catch (error) {
        res
          .status(500)
          .send({ error: "An error occurred while fetching the reviewer." });
      }
    });

    app.get("/reviewer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };

      const user = await reviewerCollection.findOne(query);
      res.send(user);
      if (!user) {
        console.log(`No user found with  ${email}`);
        return res.status(404).send(`No user found with  ${email}`);
      }
    });

    //authentication Api
    // POST /authenticate
    //reviewer login start

    app.post("/reviewerLogin", async (req, res) => {
      const { email, password, userType } = req.body;
      try {
        if (userType === "author") {
          const user = await usersCollection.findOne({ email });
          if (user.role !== "admin"){
            if (!user) {
              return res.status(401).send({
                success: false,
                message: "Invalid email or authoremail password",
              });
            }
  
            if (user.password !== password) {
              return res.status(401).send({
                success: false,
                message: "Invalid email or authorpasss password",
              });
            }
            return res.send({
              success: true,
              message: "Author Login successful",
              user,
            });
          }
          else {
            return res.send({
              success: false,
              message: "You are not an Author",
              user,
            });
          }
        } 
        else if (userType === "editor") {
          const user = await usersCollection.findOne({
            email,
          });

          if (user.role === "admin") {
            if (!user) {
              return res
                .status(401)
                .send({ success: false, message: "Invalid email or password" });
            }

            if (user.password !== password) {
              return res
                .status(401)
                .send({ success: false, message: "Invalid email or password" });
            }
            return res.send({
              success: true,
              message: "Editor Login successful",
              user,
            });
          } else {
            return res.send({
              success: false,
              message: "You are not an Editor",
              user,
            });
          }
        } else if (userType === "reviewer") {
          const user = await reviewerCollection.findOne({
            email,
          });

          if (!user) {
            return res
              .status(401)
              .send({ success: false, message: "You are not a Reviewer" });
          }

          if (user.password !== password) {
            return res
              .status(401)
              .send({ success: false, message: "Invalid email or password" });
          }
          return res.send({ success: true, message: " Reviewer Login successful", user });
        } else {
          return res
            .status(401)
            .json({ success: false, message: "Invalid user type" });
        }
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .json({ success: false, error: "Internal Server Error" });
      }
    });

    //reviewer login end
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
