'use strict';
const namedRoutes = require('../lib/namedRoutes');

// Dependencies
const indexRouter = require('./index');
const usersRouter = require('./users');
const loginRouter = require('./login');
const logoutRouter = require('./logout');
const blogsLiterariosRouter = require('./blogsLiterarios');
const reviewersRouter = require('./reviewers');
const booksRouter = require('./books');
const bookRouter = require('./book');
const registerRouter = require('./register');
const registerBookRouter = require('./registerBook');
const registerBlogRouter = require('./registerBlog');
const updateRouter = require('./update');

// Router class
class Router {
  constructor(app) {
    app.use(namedRoutes.home, indexRouter);
    app.use(namedRoutes.users, usersRouter);
    app.use(namedRoutes.login, loginRouter);
    app.use(namedRoutes.logout, logoutRouter);
    app.use(namedRoutes.register, registerRouter);
    app.use(namedRoutes.registerBook, registerBookRouter);
    app.use(namedRoutes.registerBlog, registerBlogRouter);
    app.use(namedRoutes.update, updateRouter);
    app.use(namedRoutes.blogs_literarios, blogsLiterariosRouter);
    app.use(namedRoutes.reviewers, reviewersRouter);
    app.use(namedRoutes.books, booksRouter);
    app.use(namedRoutes.book, bookRouter);
  }
}

module.exports = (params) => new Router(params);
