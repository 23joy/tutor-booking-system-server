const express = require('express')

const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();
const app = express()
app.use(cors());
app.use(express.json())
const port = process.env.PORT || 7002



const uri = process.env.MONGODB_URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const JWkS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1]
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });

  }

  try {
    const { payload } = await jwtVerify(token, JWkS)
    console.log(payload)
    next();
  } catch (error) {
    return res.status(403).json({ massage: "Forbidden" })
  }

};

async function run() {
  try {
    // await client.connect();

    const db = client.db("mediqueue")
    const tutorCollection = db.collection("tutors")
    const bookingCollection = db.collection("booking")
    //const myTutorCollection = db.collection('addtutors')
    const updateCollection = db.collection("update")


    app.post('/tutors', async (req, res) => {
      const tutorData = req.body
      const result = await tutorCollection.insertOne(tutorData)
      res.json(result)
    })

    app.get('/tutors', verifyToken, async (req, res) => {
      const result = await tutorCollection.find().toArray();
      res.json(result);
    })
    app.get('/tutors/:id', verifyToken, async (req, res) => {
      const { id } = req.params
      const result = await tutorCollection.findOne({ _id: new ObjectId(id) })
      res.json(result);
    })

    app.get('/featured', async (req, res) => {
      const result = await tutorCollection.find().limit(6).toArray()
      res.json(result);
    })

    //middleware
    app.patch('/update/:id', async (req, res) => {
      const { id } = req.params
      const bookingData = req.body
      const booking = await bookingCollection.findOne({ _id: new ObjectId(id) }).toArray()
      if (!booking) {
        res.status(404).json({ message: "result is not found" })
      }
      await bookingCollection.updateOne({ _id: new ObjectId(id) }, {
        $inc: { updateCount: 1 },
        $set: {
          lastUpdateAt: new Date(),
        }
      })
      const result = await updateCollection.insertOne({
        ...bookingData,
        updteAt: new Date()
      })
      res.json(result)
    })

    app.post('/booking', verifyToken, async (req, res) => {
      const bookingData = req.body
      const result = await bookingCollection.insertOne(bookingData)
      res.json(result)
    })

    app.delete('/booking/:Id', verifyToken, async (req, res) => {
      const { Id } = req.params
      const result = await bookingCollection.deleteOne({ _id: new ObjectId(Id) })
      res.json(result)
    })


    //await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
