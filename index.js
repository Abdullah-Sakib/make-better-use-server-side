const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.3booq2e.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
  try{
    const usersCollection = client.db('resellDB').collection('users');

    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET);
      res.send({accessToken: token});
    })

    app.post('/users' , async(req,res) => {
      const user = req.body;
      const reslut = await usersCollection.insertOne(user);
      res.send(reslut);
    });


  }
  finally{

  }
}
run().catch(error => console.log(error))


app.get('/', (req, res) => {
  res.send('server is running')
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
})