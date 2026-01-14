const mongoose = require('mongoose');



const connetDB = () => {
    mongoose.connect(process.env.MONGO_DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    })
    .then(() => {
    console.log('Connected to MongoDB');
    })
    .catch((error) => {
    console.error('Database connection error:', error);
    process.exit(1);
    });
}

module.exports = connetDB;