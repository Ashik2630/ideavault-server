const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 8080;

// TODO: Replace this password since it was exposed, and ideally move this whole string to your .env file!
const uri =
  process.env.MONGODB_URL ||
  "mongodb+srv://ideaVaultDB:SWSOPchlXH8kv87U@cluster0.gwtjk.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const { authorization } = req.headers;
  const token = authorization?.split(" ")[1];
  console.log(token);
  if (!token) {
    return res
      .status(401)
      .send({ message: "Unauthorized access: Missing token" });
  }
  try {
    const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
    );
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    console.error("Token validation failed:", error);
    return res
      .status(401)
      .send({ message: "Unauthorized access: Missing token" });
  }
};

// async function startServer() {
//   try {
//     // 1. Try to connect to MongoDB
//     await client.connect();
//     console.log("MongoDB connected successfully!");

const db = client.db("ideaVaultDB9");
const ideasCollection = db.collection("ideasAll");
const commentsCollection = db.collection("comments");

// 2. Define your database routes *after* a successful connection
app.get("/ideasAll", async (req, res) => {
  try {
    const { search } = req.query;
    console.log("Search term received:", search);

    let query = {};

    if (search) {
      query.ideaTitle = { $regex: search, $options: "i" };
    }

    const result = await ideasCollection.find(query).toArray();
    res.send(result);
  } catch (err) {
    console.error("Error fetching ideas:", err);
    res.status(500).send({ error: "Failed to fetch data" });
  }
});

// post data
app.post("/ideasAll", async (req, res) => {
  const ideasData = await req.body;
  const result = await ideasCollection.insertOne(ideasData);
  res.send(result);
});

app.get("/ideasAll/:userId", async (req, res) => {
  const { userId } = req.params;
  const result = await ideasCollection.find({ userId }).toArray();

  res.send(result);
});

// Edit myideas Page
app.patch("/ideasAll/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const result = await ideasCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData },
  );

  res.send(result);
});

// delete myIdea page
app.delete("/ideasAll/:id", async (req, res) => {
  const { id } = req.params;
  const result = await ideasCollection.deleteOne({ _id: new ObjectId(id) });
  result.send(result);
});

// Trending data showing route
app.get("/trending", async (req, res) => {
  try {
    const result = await ideasCollection.find().limit(6).toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch data" });
  }
});

app.get("/ideas/:ideasId", async (req, res) => {
  try {
    const { ideasId } = req.params;
    const query = { _id: new ObjectId(ideasId) };
    const result = await ideasCollection.findOne(query);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch data" });
  }
});

// ==================== COMMENTS COLLECTION CRUD ====================


// POST: Add a comment
app.post("/comments", async (req, res) => {
  const comment = req.body;

  const result = await commentsCollection.insertOne(comment);
  res.send(result);
});

// get
app.get("/comments/:ideaCardId", async (req, res) => {
  const {ideaCardId} = req.query;
  console.log(ideaCardId)

  let query = {};

  if (ideaCardId) {
    query = { ideaCardId };
  }

  const result = await commentsCollection.find(query).toArray();
  res.send(result);
});

// Base routes
app.get("/", (req, res) => {
  res.send("API is working");
});

// 3. Start listening inside or at the end of the initialization function
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
