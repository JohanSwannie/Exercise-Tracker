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
  userId: String,
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

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.post("/api/users", (req, res) => {
  const user = new User({
    username: req.body.username,
  });
  user.save((error, user) => {
    if (error) {
      res.status(500).send("{error:" + error + " }");
    }
    res.send({
      user: user,
    });
  });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  const exercise = new Exercise({
    userId: req.params["_id"],
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: new Date(req.body.date),
  });
  exercise.save(function (error, exercise) {
    if (error) {
      res.status(500).send("{error:" + error + " }");
    }
    res.send({
      exercise: exercise,
    });
  });
});

app.get("/api/users/:_id/logs", (req, res, next) => {
  if (!req.query.userId) {
    res.send({ error: "userId must be present" });
  }
  const userId = req.query.userId;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  const limitOptions = {};
  if (limit) limitOptions.limit = limit;
  if (from && to) {
    Exercise.find({
      $and: [
        { userId: userId },
        { date: { $gt: new Date(from) } },
        { date: { $lt: new Date(to) } },
      ],
    })
      .limit(parseInt(limit))
      .exec((err, exercises) => {
        if (err) {
          return res.send({ error: err });
        }
        return res.send({ results: exercises });
      });
  } else if (from) {
    Exercise.find({
      $and: [{ userId: userId }, { date: { $gt: new Date(from) } }],
    })
      .limit(parseInt(limit))
      .exec((err, exercises) => {
        if (err) {
          return res.send({ error: err });
        }
        return res.send({ results: exercises });
      });
  } else if (to) {
    Exercise.find({
      $and: [{ userId: userId }, { date: { $lt: new Date(to) } }],
    })
      .limit(parseInt(limit))
      .exec((err, exercises) => {
        if (err) {
          return res.send({ error: err });
        }
        return res.send({ results: exercises });
      });
  } else {
    Exercise.find({ userId: userId })
      .limit(parseInt(limit))
      .exec((err, exercises) => {
        if (err) {
          return res.send({ error: err });
        }
        return res.send({ results: exercises });
      });
  }
});

app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});
app.use((err, req, res, next) => {
  let errCode, errMessage;
  if (err.errors) {
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    errMessage = err.errors[keys[0]].message;
  } else {
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res.status(errCode).type("txt").send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
