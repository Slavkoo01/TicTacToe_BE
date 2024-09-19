const express = require('express');
const app = express();

require('./startup/config')();
require('./startup/start')(app);


