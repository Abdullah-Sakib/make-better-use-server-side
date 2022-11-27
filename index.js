const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.3booq2e.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    const usersCollection = client.db("resellDB").collection("users");
    const categoriesCollection = client.db("resellDB").collection("categories");
    const productsCollection = client.db("resellDB").collection("products");
    const reportedItemsCollection = client
      .db("resellDB")
      .collection("reportedItems");
    const bookedProductsCollection = client
      .db("resellDB")
      .collection("bookedProducts");

    //send jwt token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET);
      res.send({ accessToken: token });
    });

    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const admin = await usersCollection.findOne(query);
      if (admin.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //verify seller
    const verifySeller = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const admin = await usersCollection.findOne(query);
      if (admin.role !== "seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //save user data
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const checkUser = await usersCollection.findOne(query);
      if (checkUser) {
        return res.send({ message: "User already exist" });
      }
      const reslut = await usersCollection.insertOne(user);
      res.send(reslut);
    });

    //get all sellers and all buyers
    app.get("/users/:role", verifyJWT, verifyAdmin, async (req, res) => {
      const role = req.params.role;
      const query = { role: role };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // delete buyer and seller
    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // make verified seller
    app.patch("/users", verifyJWT, verifyAdmin, async (req, res) => {
      //update seller status in productsCollection
      const email = req.query.email;
      const productsFilter = { sellerEmail: email };
      const productsUpdatedDoc = {
        $set: {
          verifiedSeller: true,
        },
      };
      const productsResult = await productsCollection.updateMany(
        productsFilter,
        productsUpdatedDoc
      );

      //update sellers in uesrsCollection
      const id = req.query.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          verifiedSeller: true,
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send({ result, productsResult });
    });

    //get user role
    app.get("/userrole", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // get all categories
    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    //save product in database
    app.post("/products", verifyJWT, verifySeller, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    //get category products
    app.get("/products", async (req, res) => {
      const categoryName = req.query.name;
      const query = { category: categoryName };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    //delete product
    app.delete("/products/:id", verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    //update advertised product
    app.patch("/products/:id", verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          advertise: true,
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //stop advertisement
    app.patch("/product/stopadd/:id", verifyJWT, verifySeller, async(req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          advertise: false,
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    })


    //get advertised products only
    app.get("/advertisedProducts", async (req, res) => {
      const query = { advertise: true };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    //get seller specific products
    app.get("/sellerProducts", verifyJWT, verifySeller, async (req, res) => {
      const email = req.decoded.email;
      const query = { sellerEmail: email };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    //save booked products
    app.post("/bookedProducts", verifyJWT, async (req, res) => {
      const bookedProduct = req.body;
      const result = await bookedProductsCollection.insertOne(bookedProduct);
      res.send(result);
    });

    //get my orders
    app.get("/bookedProducts", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const query = { userEmail: email };
      const result = await bookedProductsCollection.find(query).toArray();
      res.send(result);
    });

    //update booked product and seller Product after payment
    app.patch("/bookedProducts", verifyJWT, async (req, res) => {
      //update main product id
      const mainProductId = req.query.mainProductId;
      const mainProductFilter = { _id: ObjectId(mainProductId) };
      const mainProductOptions = { upsert: true };
      const mainProductUpdatedDoc = {
        $set: {
          sold: true,
        },
      };
      const mainProductResult = await productsCollection.updateOne(
        mainProductFilter,
        mainProductUpdatedDoc,
        mainProductOptions
      );

      //update booked product id
      const bookedProductId = req.query.bookedProductId;
      const bookedProductFilter = { _id: ObjectId(bookedProductId) };
      const bookedProductOptions = { upsert: true };
      const bookedProductUpdateDoc = {
        $set: {
          paid: true,
        },
      };
      const bookedProductResult = await bookedProductsCollection.updateOne(
        bookedProductFilter,
        bookedProductUpdateDoc,
        bookedProductOptions
      );
      res.send({ bookedProductResult, mainProductResult });
    });

    //get single product data
    app.get("/bookedProducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookedProductsCollection.findOne(query);
      res.send(result);
    });

    //add reported item
    app.post("/reportedItems", verifyJWT, async (req, res) => {
      const item = req.body;
      const result = await reportedItemsCollection.insertOne(item);
      res.send(result);
    });

    //get reported items
    app.get("/reportedItems", verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const items = await reportedItemsCollection.find(query).toArray();
      res.send(items);
    });

    //delete reported item
    app.delete("/reportedItems", verifyJWT, async (req, res) => {
      // delete product
      const productId = req.query.productId;
      const productQuery = { _id: ObjectId(productId) };
      const productResult = await productsCollection.deleteOne(productQuery);

      //delete report
      const reportId = req.query.id;
      const reportQuery = { _id: ObjectId(reportId) };
      const reportResult = await reportedItemsCollection.deleteOne(reportQuery);
      res.send({ productResult, reportResult });
    });

    //create payment intenet
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const price = parseInt(req.body.price) * 100;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: price,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
  } finally {
  }
}
run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
