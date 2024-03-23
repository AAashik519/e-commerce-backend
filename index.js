const express = require("express");
const app = express();
const PORT = 5000;
const cors = require("cors");
const dotenv = require("dotenv");
const SSLCommerzPayment = require('sslcommerz-lts')
 const stripe = require('stripe')('sk_test_51OJMNEEAoFFFruGTv9PKEan5JaLsXRLHRgeo46bbrW3xQ4fcBDmgQeT40uFWIqV1XW7wgOcoyYJqFrN8xPf8tIEz00omwTlNIr')

// SSL Payment
const store_id = 'softt659d3f4202799'
const store_passwd = 'softt659d3f4202799@ssl'
const is_live = false //true for live, false for sandbox

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// middleware
app.use(cors());
app.use(express.json());
dotenv.config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o1ht6xv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true,
  connectTimeoutMS: 30000, // Increase the timeout value
  useUnifiedTopology: true
});


 


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const BonikDb = client.db("BonikDB");
    const productCollection = BonikDb.collection("Products");
    const cartCollection = BonikDb.collection("cart");
    const userCollection = BonikDb.collection("user");
    const orderCollection = BonikDb.collection("order");

 
    //admin 
    app.get('/admin/:email', async(req,res)=>{
      const { email } = req.params;
      const query = {email :email}
      const user= await userCollection.findOne(query)
      console.log(user);
      let admin = false
       if(user){
        admin = user?.role ==='admin'
       }
       console.log(admin);
       res.send({admin})
    })


    // users related Api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //product api
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      // console.log(result);
      res.send(result);
    });

    // get Product by category 

    app.get('/product/:category', async (req, res) => {
      const category = req.params.category
      const result = await productCollection.find({ category }).toArray()
      console.log(result);
      res.send(result)

    })



    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    //Add Product

    app.post("/addProduct", async (req, res) => {
      const product = req.body;
      console.log(product);
      const result = await productCollection.insertOne(product);
      console.log(result);
      res.send(result);
    });

    //  update Product
    app.put("/updateProduct/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;
      const result = await productCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedProduct }
      );
      res.json(result);
    });
    //delete Product by Id 
    app.delete('/deleteProduct/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await productCollection.deleteOne(query)
      console.log(result);
      res.send(result)

    })

    // add to cart api

    app.get("/add-cart", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/add-cart/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const data = req.body;
      const updateCart = {
        $set: {
          qty: data.qty,
          price: data.price,
        },
      };
      const result = await cartCollection.updateOne(filter, updateCart);

      res.send(result);
    });

    app.post("/add-cart", async (req, res) => {
      const data = req.body;
        const result = await cartCollection.insertOne(data);
        console.log(result);
        res.send(result);
    });
    app.delete('/deleteCartProduct/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query)
      console.log(result);
      res.send(result)

    })

    app.delete('/deleteAllCartProduct', async(req,res)=>{
      try {
        // Use the MongoDB native driver to delete all items in the cart
        const result = await cartCollection.deleteMany({});
    
        return res.status(200).json({ message: `Deleted ${result.deletedCount} items from the cart` });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
    })
    //order confirm
    app.post('/order/confirm', async(req,res)=>{
      const data = req.body

      const result = await orderCollection.insertOne(data);
      console.log(result);
      res.send(result);
    })


    //stripe
   app.post('/api/create-checkout-session' , async(req,res)=>{
     const [products ,totalPrice] = req.body
    //  console.log(product);
     console.log(totalPrice);

     const lineItems = products.map((product)=>({
      price_data:{
          currency:"USD",
          product_data:{
              name:product.name,
              images:[product.cover]
          },
          unit_amount:product.price * 100,
      },
      quantity:product.qty
  }));

        const session = await stripe.checkout.sessions.create({
        payment_method_types:["card"],
        line_items:lineItems,
        mode:"payment",
        success_url:"http://localhost:5173/payment/success",
        cancel_url:"http://localhost:5173/payment/cancel",
    });

    console.log(session);
    res.json({id:session.id})
    //  console.log(product);
   })
   

  
  

   

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`server rinning on PORT ${PORT}`);
});
