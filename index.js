const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const port =  8080;

// TODO: Replace this password since it was exposed, and ideally move this whole string to your .env file!
const uri = "mongodb+srv://ideaVaultDB:SWSOPchlXH8kv87U@cluster0.gwtjk.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function startServer() {
  try {
    // 1. Try to connect to MongoDB
    await client.connect();
    console.log("MongoDB connected successfully!");

    const db = client.db("ideaVaultDB9");
    const ideasCollection = db.collection("ideasAll");

    // 2. Define your database routes *after* a successful connection
    app.get("/ideasAll", async (req, res) => {
      try {
        const result = await ideasCollection.find().toArray();
        res.send(result);
      } catch (err) {
        console.error("Error fetching ideas:", err);
        res.status(500).send({ error: "Failed to fetch data" });
      }
    });

    // Trending data showing route
    app.get('/trending', async(req, res) => {
       try {
        const result = await ideasCollection.find().limit(6).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to fetch data" });
      }
    })

    app.get("/ideasAll/:ideasId", async (req, res) => {
      try {
        const {ideasId} = req.params;
        const query = {_id: new ObjectId(ideasId)}
        const result = await ideasCollection.findOne(query);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to fetch data" });
      }
    });

  } catch (error) {
    console.error("MongoDB connection failed error:", error);
    console.log("Starting server anyway so localhost works, but DB features will fail.");
  }

  // Base routes
  app.get("/", (req, res) => {
    res.send("API is working");
  });

  // 3. Start listening inside or at the end of the initialization function
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();