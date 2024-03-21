const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const { mongoose, Schema, model } = require("mongoose");

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
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

let userSchema = new Schema({
  username: { type: String, required: true },
  exerciseLog: [exerciseSchema],
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
    if (!error) {
      res.json(result);
    }
  });
});

let exerciseObj = {};

app.post(
  "/api/users/:_id/exercises",
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    let inputId = req.params._id;
    let newExercise = new Exercise({
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: req.body.date,
    });
    if (newExercise.date === "") {
      newExercise.date = new Date().toISOString().substring(0, 10);
    }
    User.findByIdAndUpdate(
      inputId,
      { $push: { exerciseLog: newExercise } },
      { new: true },
      (error, updatedUser) => {
        if (!error && updatedUser != undefined) {
          exerciseObj["_id"] = inputId;
          exerciseObj["username"] = updatedUser.username;
          exerciseObj["description"] = newExercise.description;
          exerciseObj["duration"] = newExercise.duration;
          exerciseObj["date"] = new Date(newExercise.date).toDateString();
          res.json(exerciseObj);
        } else {
          res.json("User to be updated NOT FOUND!");
        }
      }
    );
  }
);

let logsObj = {};

app.get("/api/users/:_id/logs", (req, res) => {
  User.findById(req.query.userId, (error, result) => {
    if (!error) {
      logsObj = result;
      logsObj["count"] = result.exerciseLog.length;
      res.json(logsObj);
    } else {
      res.json("Record NOT FOUND!!!");
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
