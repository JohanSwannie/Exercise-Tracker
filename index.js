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
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

let userSchema = new Schema({
  username: { type: String, required: true },
  log: [exerciseSchema],
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
    newExercise.save((error, exercise) => {
      if (error) {
        res.status(500).send("{error:" + error + " }");
      }
    });
    if (newExercise.date === "") {
      newExercise.date = new Date().toISOString().substring(0, 10);
    }
    User.findByIdAndUpdate(
      inputId,
      { $push: { log: newExercise } },
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

app.get("/api/users/:_id/logs", (req, res) => {
  if (req.query.userId) {
    User.findById(req.query.userId, (error, result) => {
      if (!error) {
        let oneUserObj = result;
        if (req.query.from || req.query.to) {
          let fromDate = new Date(0);
          let toDate = new Date();
          if (req.query.from) {
            fromDate = new Date(req.query.from);
          }
          if (req.query.to) {
            toDate = new Date(req.query.to);
          }
          fromDate = fromDate.getTime();
          toDate = toDate.getTime();
          oneUserObj.log = oneUserObj.log.filter((exercise) => {
            let exerciseDate = new Date(exercise.date).getTime();
            return exerciseDate >= fromDate && exerciseDate <= toDate;
          });
        }
        if (req.query.limit) {
          oneUserObj.log = oneUserObj.log.slice(0, req.query.limit);
        }
        res.json(oneUserObj);
      } else {
        res.json("Record NOT FOUND!!!");
      }
    });
  } else {
    User.find((error, result2) => {
      if (!error) {
        let allUserObj = result2;
        res.json(allUserObj);
      } else {
        res.json("Error in finding all users!!!");
      }
    });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
