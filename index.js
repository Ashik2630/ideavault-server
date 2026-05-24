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

// ================= VERIFY TOKEN =================

const verifyToken = async (req, res, next) => {
  const { authorization } = req.headers;

  const token = authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).send({
      message: "Unauthorized access: Missing token",
    });
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

    return res.status(401).send({
      message: "Unauthorized access",
    });
  }
};

// ================= START SERVER =================

async function startServer() {
  try {
    // CONNECT MONGODB
    await client.connect();

    console.log("MongoDB connected successfully!");

    const db = client.db("ideaVaultDB9");

    const ideasCollection = db.collection("ideasAll");
    const commentsCollection = db.collection("comments");
    const usersCollection = db.collection("users");

    // ================= ROUTES =================

    app.get("/", (req, res) => {
      res.send("API is working");
    });

    // ================= GET IDEAS =================

    app.get("/ideasAll", async (req, res) => {
      try {
        const { search, category } = req.query;
        console.log(search, category, "search and category");

        let query = {};

        if (search) {
          query.ideaTitle = {
            $regex: search,
            $options: "i",
          };
        }
        

        if (category) {
          query.category = category;
        }


        console.log(query, "query");
        const result = await ideasCollection.find(query).toArray();
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({
          error: "Failed to fetch ideas",
        });
      }
    });

    // ================= POST IDEA =================

    app.post("/ideasAll", async (req, res) => {
      try {
        const ideasData = req.body;

        const result = await ideasCollection.insertOne(ideasData);

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          error: "Failed to add idea",
        });
      }
    });

    // ================= GET USER IDEAS =================

    app.get("/ideasAll/:userId", async (req, res) => {
      try {
        const { userId } = req.params;

        const result = await ideasCollection.find({ userId }).toArray();

        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // ================= UPDATE IDEA =================

    app.patch("/ideasAll/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const updatedData = req.body;

        const result = await ideasCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData },
        );

        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // ================= DELETE IDEA =================

    app.delete("/ideasAll/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await ideasCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // ================= TRENDING =================

    app.get("/trending", async (req, res) => {
      try {
        const result = await ideasCollection.find().limit(6).toArray();

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          error: "Failed to fetch trending ideas",
        });
      }
    });

    // ================= SINGLE IDEA =================

    app.get("/ideas/:ideasId", async (req, res) => {
      try {
        const { ideasId } = req.params;

        const result = await ideasCollection.findOne({
          _id: new ObjectId(ideasId),
        });

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          error: "Failed to fetch single idea",
        });
      }
    });

    // ==================================================
    // ================= COMMENTS CRUD ==================
    // ==================================================

    // Get All comments
    app.get("/comments", async (req, res) => {
      const result = await commentsCollection.find().toArray();
      res.send(result);
    });

    // GET COMMENTS BY ideaCardId
    app.get("/comments/:ideaCardId", async (req, res) => {
      try {
        const { ideaCardId } = req.params;

        const result = await commentsCollection
          .find({ ideaId: ideaCardId })
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          error: "Failed to fetch comments",
        });
      }
    });

    // POST COMMENT
    app.post("/comments", async (req, res) => {
      try {
        const comment = req.body;

        const result = await commentsCollection.insertOne(comment);

        res.status(201).json({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.log(error);

        res.status(500).send({
          error: "Failed to add comment",
        });
      }
    });

    // Update comment

    app.patch("/comments/:id", async (req, res) => {
      const { id } = req.params;
      const updatedComment = req.body;
      const result = await commentsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedComment },
      );
      res.send(result);
    });
    // DELETE COMMENT

    app.delete("/comments/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            error: "Invalid comment ID",
          });
        }

        const result = await commentsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          error: "Failed to delete comment",
        });
      }
    });

    // ================= Update Profile section =================
    app.patch("/users/:userId", async (req, res) => {
      const { userId } = req.params;
      const updatedProfile = req.body;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: updatedProfile },
      );

      res.send(result);
    });

    // ================= START SERVER =================

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.log(error);
  }
}

// ================= CALL SERVER =================

startServer();
