const bodyParser = require("body-parser");
const moment = require("moment");
const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { mongoose, Schema, model } = require("mongoose");

const app = express();

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

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

const exerciseUsers = new Schema({
  username: { type: String, required: true },
  exercises: [
    {
      _id: false,
      description: {
        type: String,
        required: true,
      },
      duration: {
        type: Number,
        required: true,
      },
      date: {
        type: Date,
        default: new Date(),
      },
    },
  ],
});

const ExerciseUsers = model("ExerciseUsers", exerciseUsers);

app.post("/api/users", async (req, res) => {
  let username = req.body.username;
  const userExist = await ExerciseUsers.findOne({ username: username });
  if (userExist) {
    res.json({
      error: "User already exist!",
    });
  }
  const user = await ExerciseUsers.create({
    username,
  });

  if (user) {
    res.json({
      username: user.username,
      _id: user._id,
    });
  } else {
    res.json({
      error: "Invalid user data",
    });
  }
});

app.get("/api/users", (req, res) => {
  ExerciseUsers.find({})
    .select("username _id")
    .exec((err, data) => {
      if (err) console.log(err);
      res.send(data);
    });
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  let { description, duration } = req.body;
  let userId = req.params._id;

  try {
    const user = await ExerciseUsers.findById(userId);

    if (user) {
      user.exercises = [
        ...user.exercises,
        {
          description: description,
          duration: Number(duration),
          date: req.body.date ? new Date(req.body.date) : new Date(),
        },
      ];

      const updatedUser = await user.save();

      res.json({
        username: updatedUser.username,
        _id: updatedUser._id,
        description,
        duration: Number(duration),
        date: req.body.date
          ? moment(req.body.date).format("ddd MMM DD YYYY")
          : moment().format("ddd MMM DD YYYY"),
      });
    } else res.json({ error: "User not found" });
  } catch (err) {
    res.json({
      error: "Error!",
    });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  let userId = req.params._id;
  let from = req.query.from !== undefined ? new Date(req.query.from) : null;
  let to = req.query.to !== undefined ? new Date(req.query.to) : null;
  let limit = parseInt(req.query.limit);

  const user = await ExerciseUsers.findOne({ _id: userId });

  if (user) {
    let count = user.exercises.length;

    if (from && to) {
      let i = 0;
      var result = {
        _id: userId,
        username: user.username,
        count,
        log: user.exercises
          .filter((e) => e.date >= from && e.date <= to)
          .slice(0, limit || count),
      };
      result.log = result.log.map((p) => {
        i++;
        let formattedDate = moment(p.date).format("ddd MMM DD YYYY");
        return {
          date: formattedDate,
          description: p.description,
          duration: Number(p.duration),
        };
      });
      result.count = i;
      console.log(result.log);
      res.send(result);
    } else if (from) {
      let i = 0;
      const result = {
        _id: userId,
        username: user.username,
        count,
        log: user.exercises
          .filter((e) => e.date >= from)
          .slice(0, limit || count),
      };
      result.log = result.log.map((p) => {
        i++;
        let formattedDate = moment(p.date).format("ddd MMM DD YYYY");
        return {
          date: formattedDate,
          description: p.description,
          duration: Number(p.duration),
        };
      });
      result.count = i;
      console.log(result);
      res.send(result);
    } else if (to) {
      let i = 0;
      const result = {
        _id: userId,
        username: user.username,
        count,
        log: user.exercises
          .filter((e) => e.date <= to)
          .slice(0, limit || count),
      };
      result.log = result.log.map((p) => {
        i++;
        let formattedDate = moment(p.date).format("ddd MMM DD YYYY");
        return {
          date: formattedDate,
          description: p.description,
          duration: Number(p.duration),
        };
      });
      result.count = i;
      console.log(result);
      res.send(result);
    } else {
      let i = 0;
      const result = {
        _id: userId,
        username: user.username,
        count,
        log: user.exercises.slice(0, limit || count),
      };
      console.log(result);
      result.log = result.log.map((p) => {
        i++;
        let formattedDate = moment(p.date).format("ddd MMM DD YYYY");
        return {
          date: formattedDate,
          description: p.description,
          duration: Number(p.duration),
        };
      });
      result.count = i;
      console.log(result);
      res.send(result);
    }
  } else res.json({ error: "User not found!" });
});

const deleteAllDocs = () => {
  ExerciseUsers.remove({}, (err, data) => {
    if (err) console.log(err);
    console.log("All users were deleted");
  });
};

app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    errCode = 400;
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
