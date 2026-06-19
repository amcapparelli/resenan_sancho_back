/* eslint-disable no-undef */
// Builds a Mongoose-model-like mock: a constructor whose instances carry the
// passed document and a resolved save(), plus the given static methods as jest.fn().
// Used from inside jest.mock() factories, e.g.:
//   jest.mock('../models/user', () => require('./helpers/modelMock').makeModelMock(['findOne']));
function makeModelMock(statics = []) {
  const Model = jest.fn(function (doc) {
    Object.assign(this, doc);
    this.save = jest.fn().mockResolvedValue(this);
  });
  statics.forEach((name) => {
    Model[name] = jest.fn();
  });
  return Model;
}

module.exports = { makeModelMock };
