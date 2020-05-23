'use strict';
const namedRoutes = require('../lib/namedRoutes');

// Dependencies
const bookRouter = require('./book');
const booksRouter = require('./books');
const deleteUserRouter = require('./deleteUser');
const indexRouter = require('./index');
const loginRouter = require('./login');
const logoutRouter = require('./logout');
const orderBookRouter = require('./orderBook');
const promotionsRouter = require('./promotions');
const paymentCheckoutRouter = require('./paymentCheckout');
const registerRouter = require('./register');
const registerReviewerRouter = require('./registerReviewer');
const reviewerRouter = require('./reviewer');
const registerBookRouter = require('./registerBook');
const reviewersRouter = require('./reviewers');
const suscribeAuthorRouter = require('./suscribeAuthor');
const updateRouter = require('./update');
const usersRouter = require('./users');

// Router class
class Router {
  constructor(app) {
    app.use(namedRoutes.book, bookRouter);
    app.use(namedRoutes.books, booksRouter);
    app.use(namedRoutes.deleteUser, deleteUserRouter);
    app.use(namedRoutes.home, indexRouter);
    app.use(namedRoutes.login, loginRouter);
    app.use(namedRoutes.logout, logoutRouter);
    app.use(namedRoutes.orderBook, orderBookRouter);
    app.use(namedRoutes.promotions, promotionsRouter);
    app.use(namedRoutes.paymentCheckout, paymentCheckoutRouter);
    app.use(namedRoutes.register, registerRouter);
    app.use(namedRoutes.registerReviewer, registerReviewerRouter);
    app.use(namedRoutes.registerBook, registerBookRouter);
    app.use(namedRoutes.reviewers, reviewersRouter);
    app.use(namedRoutes.reviewer, reviewerRouter);
    app.use(namedRoutes.suscribeAuthor, suscribeAuthorRouter);
    app.use(namedRoutes.update, updateRouter);
    app.use(namedRoutes.users, usersRouter);
  }
}

module.exports = (params) => new Router(params);
