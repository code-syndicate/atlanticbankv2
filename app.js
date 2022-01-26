require('dotenv').config();
var express = require('express');
var passport = require('passport');
var Customer = require('./models/customer');
var logger = require('morgan');
var sessions = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(sessions);
var flashMessages = require('connect-flash');
var middlewares = require('./middlewares');
var routes = require('./routes');

const app = express();
app.use(logger('dev'));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'ejs');
app.set('view options', {
	delimiter: '/',
	openDelimiter: '{',
	closeDelimiter: '}',
});

const sessionStore = new MongoDBStore({
	uri: process.env.DATABASE_URL,
	collection: 'sessions',
});

sessionStore.on('error', (err) => {
	console.log(err);
});
const threeDays = 3 * 24 * 60 * 60 * 1000;
app.use(
	sessions({
		secret: process.env.COOKIE_SECRET,
		resave: false,
		saveUninitialized: false,
		store: sessionStore,
		cookie: {
			signed: true,
			maxAge: threeDays,
		},
	})
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flashMessages());

passport.use(Customer.createStrategy());
passport.serializeUser(Customer.serializeUser());
passport.deserializeUser(Customer.deserializeUser());

app.use(middlewares);

app.use(routes);

app.listen(app.get('port'), () => {
	console.log('\n  --> Server listening on port', app.get('port'), ' <--');
});
