const createError = require('http-errors');
const express = require('express');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require('body-parser');
const { App, ExpressReceiver } = require('@slack/bolt');
const mongoose = require('mongoose');

const { HelloWorldRouter } = require('./Routes');
const EventHanlder = require('./EventHandler');

class ExpressApp {

  constructor() {
    const env = dotenv.config();
    dotenvExpand(env);
    this.express = express();
  }

  init() {
    this.initDB();
    this.initSlackReceivers();
    this.initMiddlewares();
    this.initRoutes();
    return this;
  }

  initDB() {
    mongoose.connect('mongodb://localhost:27017/sample', {useNewUrlParser: true, useUnifiedTopology: true});
  }

  initSlackReceivers() {
    const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });
    const boltApp = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      receiver
    });
    new EventHanlder(boltApp).registerEvents();
    this.express.use('/', receiver.router);
  }

  initMiddlewares() {
    this.express.use(logger(':date[iso] ":method :url HTTP/:http-version" :status :response-time ms ":referrer" ":user-agent"'));
    this.express.use(cookieParser());
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
  }

  registerRouters() {
    new HelloWorldRouter(this.express);
  }

  initRoutes() {
    this.registerRouters();

    this.express.use((req, res, next) => {
      next(createError(404));
    });

    this.express.use((err, req, res, next) => {
      return res.status(500).send({ status: 500, message: "Internal Server Error" });
    });
  }
}

module.exports = new ExpressApp().init().express;
