var passport = require('passport');
var Customer = require('./../models/customer');
require('dotenv').config();
var {body, validationResult} = require('express-validator');

function appIndex(req, res) {
	let ref2 = req.query.ref2 || null;

	const validRefs = ['TX'];

	if (!validRefs.includes(ref2)) {
		ref2 = null;
	}

	const flash = {
		formErrors: req.flash('formErrors'),
		info: req.flash('info'),
	};

	const context = {
		ref1: null,
		ref2,
		flash,
		avatar: req.user.gender === 'male' ? '/user_m.png' : '/user_f.png',
	};
	res.render('app_index', context);
}

function logOut(req, res) {
	req.logOut();
	req.flash('info', 'Logged out');
	res.status(306).redirect('/auth/sign-in');
}


const transferPOST = [
	body('amount', 'Amount is required')
		.trim()
		.isNumeric({locale: 'en-GB'})
		.withMessage('Please enter a valid amount to transfer'),
	body('accountNumber', 'Account number is required')
		.trim()
		.isNumeric()
		.withMessage('Please enter a valid account number '),

	body('bankName', 'Bank name is required')
		.trim()
		.isLength({min: 3, max: 25})
		.withMessage('Please enter a recipient bank name'),

	body('bankAddress', 'Bank address is required')
		.trim()
		.isLength({min: 25, max: 1024})
		.withMessage('Please enter a valid address'),

	body('iban', 'Bank IBAN is required')
		.trim()
		.isLength({min: 3})
		.withMessage('Please enter a valid bank IBAN'),

	body('swift', 'Bank SWIFT is required')
		.trim()
		.isLength({min: 3})
		.withMessage('Please enter a valid bank SWIFT'),

	body('state', 'State is required')
		.trim()
		.isLength({min: 3})
		.withMessage('Please enter a valid state'),

	body('city', 'City is required')
		.trim()
		.isLength({min: 3})
		.withMessage('Please enter a valid city'),
	body('country', 'Country is required')
		.trim()
		.isLength({min: 3})
		.withMessage('Please enter a valid country'),
	function (req, res) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			req.flash('formErrors', errors.array());

			res.status(306).redirect(req.url);
		} else {
			next();
			res.render('app_index');
		}
	},
];

const signInPOST = [
	body('email', 'Email address is required')
		.trim()
		.isEmail()
		.withMessage('Please enter a valid email address'),

	body('password', 'Password is required')
		.isLength({min: 8, max: 35})
		.withMessage('Password must be 8 characters or more'),

	function (req, res, next) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			req.flash('formErrors', errors.array());

			res.status(306).redirect(req.url);
		} else {
			next();
		}
	},

	passport.authenticate('local', {
		failureFlash: 'Invalid login credentials',
		successRedirect: '/app/home',
		failureRedirect: '/auth/sign-in?ref1=SI',
	}),
];

const signUpPOST = [
	body('firstname', 'Firstname is required')
		.trim()
		.isLength({min: 3, max: 25})
		.withMessage('Please enter a valid firstname'),

	body('lastname', 'Lastname is required')
		.trim()
		.isLength({min: 3, max: 25})
		.withMessage('Please enter a valid lastname'),

	body('email', 'Email is required')
		.trim()
		.isEmail()
		.withMessage('Please enter a valid email'),

	body('dob').isDate().withMessage('Please enter a valid date'),

	body('state', 'State is required')
		.trim()
		.isLength({min: 3})
		.withMessage('Please enter a valid state'),

	body('city', 'City is required')
		.trim()
		.isLength({min: 3})
		.withMessage('Please enter a valid city'),
	body('country', 'Country is required')
		.trim()
		.isLength({min: 3})
		.withMessage('Please enter a valid country'),

	body('password1', 'Password is required')
		.isLength({min: 8, max: 35})
		.withMessage('Password must be 8 or more characters'),

	body('password2', 'Password confirmation is required')
		.isLength({min: 8, max: 35})
		.withMessage('Password must be 8 or more characters'),

	body('password2').custom(function (inputValue, {req}) {
		if (req.body.password1 !== inputValue) {
			throw Error('Password fields did not match');
		}

		return true;
	}),

	body('email').custom(async function (inputValue) {
		const emailExists = await Customer.exists({email: inputValue});

		if (emailExists) {
			throw Error('This email exists already');
		}

		return true;
	}),
	function (req, res) {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			req.flash('formErrors', errors.array());
		} else {
			Customer.register(
				{
					...req.body,
				},
				req.body.password1
			);

			req.flash('info', 'Please sign in with your credentials');

			res.status(306).redirect('/auth/sign-in');
		}
	},
];

function signInPage(req, res) {
	let ref1 = req.query.ref1 || null;
	const validRef1 = ['SI'];

	if (!validRef1.includes(ref1)) {
		ref1 = 'SI';
	}

	const flash = {
		formErrors: req.flash('formErrors'),
		info: req.flash('info'),
	};

	const context = {
		ref1,
		ref2: null,
		flash,
	};

	res.render('app_index', context);
}
function signUpPage(req, res) {
	let ref1 = req.query.ref1 || null;
	const validRef1 = ['SU'];

	if (!validRef1.includes(ref1)) {
		ref1 = 'SU';
	}

	const flash = {
		formErrors: req.flash('formErrors'),
		info: req.flash('info'),
	};

	const context = {
		ref1,
		ref2: null,
		flash,
	};
	res.render('app_index', context);
}

module.exports = {
	signUpPOST,
	signInPOST,
	signInPage,
	signUpPage,
	appIndex,
	logOut,
	transferPOST,
};
