const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const port = 5000;

const secret = "veryverysecretmessagegoeshere";

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

//parsers
app.use(express.json());
app.use(cookieParser());

//DB URI
const uri =
  "mongodb+srv://cleanco:m7h4DkXvQRv1MI22@cluster0.gjmhsgq.mongodb.net/clean-co?retryWrites=true&w=majority";

// MongoDB Connection
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //connect collection
    const serviceCollection = client.db("clean-co").collection("services");
    const bookingCollection = client.db("clean-co").collection("bookings");

    //middlewares
    //verify token and grant access
    const gateman = (req, res, next) => {
      const token = req.cookies.token;

      //if client doesn't send any token
      if (!token) {
        return res.status(401).send({ message: "You aren't authorized" });
      }

      jwt.verify(token, secret, function (err, decoded) {
        if (err) {
          return res.status(401).send({ message: "You aren't authorized" });
        }

        //attach decoded user so that others can get it
        req.user = decoded;
        next();
      });
    };

    //service related API
    app.get("/api/v1/services", gateman, async (req, res) => {
      const cursor = serviceCollection.find();
      const services = await cursor.toArray();

      res.send(services);
    });

    //booking relared API

    //Get User specific bookings
    app.get("/api/v1/user/bookings", gateman, async (req, res) => {
      const queryEmail = req.query.email;
      const tokenEmail = req.user.email;
      //console.log(queryEmail, tokenEmail);

      //agei check kore firiye dbo match na hole
      if (queryEmail !== tokenEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      //query ?email='example@gmail.com' //give email specific
      //query ? Blank  // give all data
      let query = {};
      if (queryEmail) {
        query.email = queryEmail;
      }

      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/api/v1/user/create-booking", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.delete("/api/v1/user/cancel-booking/:bookingId", async (req, res) => {
      const id = req.params.bookingId;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    //JSON Web token
    app.post("/api/v1/auth/access-token", (req, res) => {
      //creating token and send to client
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, secret, { expiresIn: "1h" });

      //console.log(token);
      //res.send(token);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Clean Co listening on port ${port}`);
});
