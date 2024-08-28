const express = require('express');
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// middle wire
app.use(cors(
    {
        origin:[
            'http://localhost:5173',
            ""
        ],
        credentials: true,
    }
));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send('Need Blood Server is Running!');
})


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rsqtl7q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    console.log("Token in middle Layer: ", token);
    if (!token) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "Unauthorized" })
      }
      console.log("User in decoded :" ,decoded);
      req.user = decoded;
      next();
  
    })
  }

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // const demoUserCollection = client.db("needBlood").collection("demoUsers");
        const userCollection = client.db("needBlood").collection("users");
        const requestCollection = client.db("needBlood").collection("bloodRequest");
        // jwt
        app.post("/jwt",async(req,res)=>{
            const user = req.body;
            const token =  jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:"1h"});
            res.cookie('token',token,{
                httpOnly:true,
                secure:false,
            })
            .send({success:true});
        })
        
        // user related
        app.get("/users", async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const result = await userCollection.find().skip(page * size).limit(size).toArray();
            const count = await userCollection.estimatedDocumentCount();
            res.send({result,count});
        })
        app.get("/users/:id", async (req, res) => {
            const id = req.params.id;
            const query = {_id : new ObjectId(id)};
            const result = await userCollection.findOne(query);
            
            res.send(result);
        })
        app.post("/users",async (req,res)=>{
            const requestDetails =req.body;
            const result =await userCollection.insertOne(requestDetails);
            res.send(result);
        });

        // blood request
        app.post("/blood-request",verifyToken, async (req,res)=>{
            const requestDetails =req.body;
            const result =await requestCollection.insertOne(requestDetails);
            res.send(result);
        });

        app.get("/blood-request",verifyToken,async(req,res)=>{
            
            //console.log("email: ", req.query.email);
            console.log('Query Email:', req.query.email);
            console.log('User Email:', req.user?.email);
            if (req.query.email !== req.user?.email) {
              return res.status(403).send({ message: "Forbidden Access" });
            }
            const result = await requestCollection.find().toArray();
            res.send(result);
        })

        // find donors

        app.get("/find-donors",async(req,res)=>{
            const find = req.query;
            console.log(find);
            const bloodGroup = find.bloodGroup;
            const district = find.district;
            console.log(bloodGroup , district);
            const query = {bloodGroup :bloodGroup, district:district };
            const result = await userCollection.find(query).toArray();
            res.send(result); 
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Need Blood listening on port ${port}`)
})

