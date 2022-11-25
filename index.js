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
    const categoriesCollection = client.db('resellDB').collection('categories');
    const productsCollection = client.db('resellDB').collection('products');
    const bookedProductsCollection = client.db('resellDB').collection('bookedProducts');

    //send jwt token
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET);
      res.send({accessToken: token});
    })

    //save user data
    app.post('/users' , async(req,res) => {
      const user = req.body;
      const query = {email: user.email};
      const checkUser = await usersCollection.findOne(query);
      if(checkUser){
        return res.send({message: 'User already exist'});
      }
      const reslut = await usersCollection.insertOne(user);
      res.send(reslut);
    });

    // get all categories
    app.get('/categories', async(req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    })

    //save product in database
    app.post('/products', async(req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    })

    //get category products
    app.get('/products', async(req, res) => {
      const categoryName = req.query.name;
      const query = {category: categoryName};
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    })

    //save  
    app.post('/bookedProducts', async(req, res) => {
      const bookedProduct = req.body;
      const result = await bookedProductsCollection.insertOne(bookedProduct);
      res.send(result);
    })


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