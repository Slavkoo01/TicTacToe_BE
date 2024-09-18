
const Joi = require('joi');

const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const validateCreateUser = (data) => {
  return createUserSchema.validate(data);
};

module.exports = {
  validateCreateUser,
};
