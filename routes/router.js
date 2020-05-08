'use strict';
const namedRoutes = require('../lib/namedRoutes');

// Dependencies
const blogsLiterariosRouter = require('./blogsLiterarios');
const bookRouter = require('./book');
const booksRouter = require('./books');
const indexRouter = require('./index');
const loginRouter = require('./login');
const logoutRouter = require('./logout');
const orderBookRouter = require('./orderBook');
const promotionsRouter = require('./promotions');
const registerRouter = require('./register');
const registerBlogRouter = require('./registerBlog');
const registerBookRouter = require('./registerBook');
const reviewersRouter = require('./reviewers');
const updateRouter = require('./update');
const usersRouter = require('./users');

// Router class
class Router {
  constructor(app) {
    app.use(namedRoutes.blogs_literarios, blogsLiterariosRouter);
    app.use(namedRoutes.book, bookRouter);
    app.use(namedRoutes.books, booksRouter);
    app.use(namedRoutes.home, indexRouter);
    app.use(namedRoutes.login, loginRouter);
    app.use(namedRoutes.logout, logoutRouter);
    app.use(namedRoutes.orderBook, orderBookRouter);
    app.use(namedRoutes.promotions, promotionsRouter);
    app.use(namedRoutes.register, registerRouter);
    app.use(namedRoutes.registerBlog, registerBlogRouter);
    app.use(namedRoutes.registerBook, registerBookRouter);
    app.use(namedRoutes.reviewers, reviewersRouter);
    app.use(namedRoutes.update, updateRouter);
    app.use(namedRoutes.users, usersRouter);
  }
}

module.exports = (params) => new Router(params);
