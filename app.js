//jshint esversion:6
require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const findOrCreate=require("mongoose-findorcreate");
const mongoose = require('mongoose');
 //const encrypt=require("mongoose-encryption");

 //const md5=require("md5"); //level-3 security using md5 hash

 //const bcrypt=require("bcrypt"); // level-4 security using bcrypt hash and salting in it
 //const saltRounds=10;

 //////////////////////level-5 start((where cookies is also taken care of)   using passport package////////////////////
const session=require('express-session');
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");


/////////////LEVEL-6 USING O-AUTH O GOOGLE///////////////////////////
const GoogleStrategy = require('passport-google-oauth20').Strategy;


const app = express(); 
app.use(express.static('public'));
app.set('view engine','ejs');
app.use(express.urlencoded({extended:true}));
 
 
main().catch(err => console.log(err));

app.use(session({
secret:"Nikunj ki security.",
resave:false,
saveUninitialized:false
}));


app.use(passport.initialize());
app.use(passport.session());
 
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/userDB');
    // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
    const userSchema = new mongoose.Schema({
        email:String,
        password:String,
        googleId:String,
        secret:[String]
    });
 
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//console.log(process.env.SECRET);//level-2 security by creating .env file and storing and hidding our key i.e constant named secret 
///////level-1-security using mongose-encryption npm package
//const secret="Nikunjkisecurity."; ///if someone get to know this varibale then they can hack someones password
//userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});

     
    const User = mongoose.model('User',userSchema);

    //Here db-model used to create strtegy and serialize and deserialize 
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    process.nextTick(function() {
        done(null, { id: user._id, username: user.username });
    });
});
passport.deserializeUser(function(user, done) {
    process.nextTick(function() {
        return done(null, user);
    });
});
  ///////////////////level-6 Google auth////////////////////////
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({username: profile.emails[0].value, googleId: profile.id}, function (err, user) {
    return cb(err, user);
  });
}
));
    app.get("/",(req,res)=>{
        res.render('home');
    });
    
    app.get("/register",(req,res)=>{
        res.render('register');
    });
  

    ///////////level-6 auth with google//////////////////////
    app.get("/auth/google", passport.authenticate("google", { scope: ["profile","openid","email"] }));
    app.get("/auth/google/secrets",
      passport.authenticate("google", {
        failureRedirect: "login"
      }),
      function(req, res) {
        res.redirect("/secrets");
      }
    );
    // app.get("/secrets",function(req,res){
    //   User.find({secret:{$ne:null}},function (err, users){
    //     if(!err){
    //       if (users){
    //         res.render("secrets",{usersWithSecrets:users});
    //       }else {
    //         console.log(err);
    //       }
    //     }else {
    //       console.log(err);
    //     }
    //   });
    // });
    app.get('/secrets', function(req,res){
    
      User.find({'secret': {$ne:null}})
      .then(function (foundUser) {
        res.render("secrets",{usersWithSecrets:foundUser});
        })
      .catch(function (err) {
        console.log(err);
        })
  });
      app.get('/submit', (req, res) => {
        if (req.isAuthenticated()) {
          res.render("submit");
        } else {
          res.redirect('/login');
        }
      });

      app.post("/submit", function (req, res) {
        console.log(req.user.id);
        User.findById(req.user.id)
          .then(foundUser => {
            if (foundUser) {
              foundUser.secret = req.body.secret;
              return foundUser.save();
            }
            return null;
          })
          .then(() => {
            res.redirect("/secrets");
          })
          .catch(err => {
            console.log(err);
          });
      });

//     app.post("/register",async(req,res)=>{
// ///////////////////////level-5 using password package///////////
// const username = req.body.username;
// const password = req.body.password;
// User.register({ username: username }, password).then(() => {
//   const authenticate = passport.authenticate("local");
//   authenticate(req, res, () => {
    
//     res.redirect('/secrets');
//   });
// }).catch(err => {
//   console.log(err);
//   res.redirect("/register");
// });
app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,result){
      if(err){
          console.log(err);
          res.redirect("/register");
      }else{
        passport.authenticate("local")(req,res,function(){
          res.redirect("/secrets");
        });
      }
  })




/////////////////////////bcrypt wali ke liye ye wala code tha///////////////////////
        // try {
        //     const hash = await bcrypt.hash(req.body.password, saltRounds);
        //     const newUser = new User({
        //         email:req.body.username,
        //         password:hash
        //     });
        //     const result = await newUser.save();
        //     if(result){
        //         res.render('secrets');
        //     }else{
        //         console.log("Login Failed");
        //     }
        // } catch (err) {
        //     console.log(err);
        // }
    });
 
    app.get("/login",(req,res)=>{
        res.render('login');
    });
    
   


///////////////////////level-5 using password package///////////
app.post("/login", function(req, res){
  //check the DB to see if the username that was used to login exists in the DB
  User.findOne({username: req.body.username}, function(err, foundUser){
    //if username is found in the database, create an object called "user" that will store the username and password
    //that was used to login
    if(foundUser){
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
      //use the "user" object that was just created to check against the username and password in the database
      //in this case below, "user" will either return a "false" boolean value if it doesn't match, or it will
      //return the user found in the database
      passport.authenticate("local", function(err, user){
        if(err){
          console.log(err);
        } else {
          //this is the "user" returned from the passport.authenticate callback, which will be either
          //a false boolean value if no it didn't match the username and password or
          //a the user that was found, which would make it a truthy statement
          if(user){
            //if true, then log the user in, else redirect to login page
            req.login(user, function(err){
            res.redirect("/secrets");
            });
          } else {
            res.redirect("/login");
          }
        }
      })(req, res);
    //if no username is found at all, redirect to login page.
    } else {
      //user does not exists
      res.redirect("/login")
    }
  });


/////////////////bcrypt wali ke liye ye wala code tha///////////////////////////
        // const username = req.body.username;
        // const password = req.body.password;//level-3 security using md5 as it convert password to hash function
 
        // try {
        //     const foundName = await User.findOne({email:username})
        //     if(foundName){
        //         const result = await bcrypt.compare(password,foundName.password);
        //         if(result){
        //             res.render('secrets');
        //         }else{
        //             console.log('Password Does not Match...Try Again !')
        //         }
        //     }else{
        //         console.log("User Not found...")
        //     }
        // } catch (err) {
        //     console.log(err);
        // }
    
      });

    app.get("/logout", function (req, res) {
        req.logout(function (err) {
          if (err) {
            console.log(err);
          }
          res.redirect("/");
        });
      })
    
    app.listen(3000,()=>{
        console.log("Server is runing on port 3000...   ");
    });
 
 
}