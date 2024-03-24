const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { mongoose, Schema, model } = require("mongoose");
require("dotenv").config();

const app = express();

app.use(cors());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connected to the database");
  })
  .catch((err) => {
    console.log("Could not connect to the database", err);
  });

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

let exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

let userSchema = new Schema({
  username: { type: String, required: true },
});

let Exercise = model("Exercise", exerciseSchema);

let User = model("User", userSchema);

let userObj = {};

app.post(
  "/api/users",
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    let newUser = new User({ username: req.body.username });
    newUser.save((error, savedUser) => {
      if (!error) {
        userObj["username"] = savedUser.username;
        userObj["_id"] = savedUser.id;
        res.json(userObj);
      }
    });
  }
);

app.get("/api/users", (req, res) => {
  User.find({}, (error, result) => {
    if (error) {
      console.log("Error finding the User!!!");
    } else {
      let resultArray = [];
      let resultObj = {};
      resultObj.username = result.username;
      resultObj._id = result._id;
      resultArray.push(resultObj);
      res.json(resultArray);
    }
  });
});

app.post(
  "/api/users/:_id/exercises",
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    let userId = req.params._id;
    let exerciseObj = {
      userId: userId,
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: req.body.date,
    };
    if (req.body.date != "") {
      exerciseObj.date = new Date(req.body.date).toISOString().substring(0, 10);
    } else {
      exerciseObj.date = new Date().toISOString().substring(0, 10);
    }
    let newExercise = new Exercise(exerciseObj);
    User.findById(userId, (error, userFound) => {
      if (error) {
        console.log(error);
      }
      newExercise.save();
      res.json({
        _id: userFound._id,
        username: userFound.username,
        description: newExercise.description.toString(),
        duration: newExercise.duration,
        date: newExercise.date,
      });
    });
  }
);

app.get("/api/users/:_id/logs", (req, res) => {
  let userId = req.params._id;
  let userObj = {};
  let limitParm = req.query.limit;
  let toParm = req.query.to;
  let fromParm = req.query.from;
  limitParm = limitParm ? parseInt(limitParm) : limitParm;
  let queryObj = { userId: userId };
  if (fromParm || toParm) {
    queryObj.date = {};
    if (fromParm) {
      queryObj.date["$gte"] = fromParm;
    }
    if (toParm) {
      queryObj.date["$lte"] = toParm;
    }
  }
  User.findById(userId, (error, userFound) => {
    if (error) {
      console.log("There is an error finding the user", error);
    }
    let username = userFound.username;
    userObj = { _id: userFound._id, username: username };
    Exercise.find(queryObj)
      .limit(limitParm)
      .exec((error, exercises) => {
        if (error) {
          console.log(error);
        }
        let result = exercises.map((exercise) => {
          return {
            description: exercise.description.toString(),
            duration: parseInt(exercise.duration),
            date: exercise.date.toDateString(),
          };
        });
        userObj.log = result;
        userObj.count = result.length;
        res.json(userObj);
      });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
