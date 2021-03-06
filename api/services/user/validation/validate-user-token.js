const ValidationError = require('../../../errors/validation-error.js')
module.exports = (tokenUser) => {
  const errors = []
  if (
    !tokenUser ||
    !tokenUser._id) {
    errors.push({
      prop: 'token',
      message: 'Invalid authentication token.'
    })
  }

  if (errors.length) {
    throw new ValidationError(errors)
  }
}
