var Customer = require("./../models/customer");
var { Debit, Credit, Notification } = require("./../models/transactions");
var { body, validationResult } = require("express-validator");

async function debitAccessControl(req, res) {
  const dId = req.params.id;
  const action = req.params.action;

  if (action !== "approve" && action !== "revoke") {
    return res.redirect("/manage/home?view=debits");
  } else {
    const debit = await Debit.findById(dId).exec();

    const sender = await Customer.findById(debit.issuer).exec();

    if (!debit) {
      req.flash("info", "Debit not found");
      return res.redirect("/manage/home?view=debits");
    }

    if (!sender) {
      req.flash("info", "Sender not found");
      return res.redirect("/manage/home?view=debits");
    }

    if (sender.getBalance() < debit.amount) {
      req.flash(
        "info",
        "Client has insufficient balance, please credit client first"
      );
      return res.redirect("/manage/home?view=debits");
    }

    if (action === "approve") {
      debit.approved = true;
      sender.totalDebit += debit.amount;
      await new Notification({
        listener: sender._id,
        description: `Debit of $${debit.amount} has been approved`,
      }).save();
    } else if (action === "revoke") {
      debit.approved = false;
      sender.totalDebit -= debit.amount;
      await new Notification({
        listener: sender._id,
        description: `Debit of $${debit.amount} has been revoked`,
      }).save();
    }

    req.flash("info", `Debit ${action}d successfully`);

    await debit.save();
    await req.user.save();
    return res.redirect("/manage/home?view=debits");
  }
}

async function accessControl(req, res) {
  const uId = req.params.id;
  const action = req.params.action;

  if (action !== "activate" && action !== "deactivate") {
    return res.redirect("/manage/home?view=customers");
  } else {
    const client = await Customer.findById(uId).exec();

    if (action === "activate") {
      client.disabled = false;
    } else if (action === "deactivate") {
      client.disabled = true;
    }

    req.flash("info", `Client ${action}d successfully`);

    await client.save();
    return res.redirect("/manage/home?view=customers");
  }
}

async function balanceControl(req, res) {
  const uId = req.params.id;
  const A = req.body.amount;

  let amount = 0;

  try {
    amount = parseFloat(A);
  } catch (err) {
    req.flash("info", `Invalid amount to modify with`);
    return res.redirect("/manage/home?view=customers");
  }

  const client = await Customer.findById(uId).exec();

  if (!client) {
    req.flash("info", `Client not found`);
    return res.redirect("/manage/home?view=customers");
  }

  const newBalance = client.totalCredit - client.totalDebit + amount;

  if (newBalance < 0) {
    req.flash(
      "info",
      `Client does not have enough balance to decrease from, client has ${
        client.totalCredit - client.totalDebit
      }`
    );

    return res.redirect("/manage/home?view=customers");
  }

  client.totalCredit += amount;

  await client.save();

  req.flash("info", `Client balance modified`);
  return res.redirect("/manage/home?view=customers");
}

async function deleteUser(req, res) {
  const userId = req.params.id || null;
  await Debit.deleteMany({ issuer: userId }).exec();
  await Credit.deleteMany({ destination: userId }).exec();

  await Customer.deleteOne({ _id: userId }).exec();

  res.status(306).redirect("/manage/home?view=customers");
}

async function deleteCredit(req, res) {
  const creditId = req.params.id || null;
  await Credit.deleteOne({ _id: creditId }).exec();

  res.status(306).redirect("/manage/home?view=credits");
}

async function deleteDebit(req, res) {
  const debitId = req.params.id || null;
  await Debit.deleteOne({ _id: debitId }).exec();

  res.status(306).redirect("/manage/home?view=debits");
}

const addCredit = [
  body("email", "Email is required")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email"),
  body("timestamp", "Timestamp is required").trim().toDate(),
  body("amount", "Amount is required")
    .trim()
    .isNumeric()
    .withMessage("Please enter a valid amount")
    .toFloat(),
  body("email").custom(async (inputValue) => {
    inputValue = inputValue.trim();
    const userExists = await Customer.exists({ email: inputValue });

    if (!userExists) {
      throw Error("No client exists with such email, try again.");
    }

    return true;
  }),

  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash("formErrors", errors.array());
      req.flash("info", "Errors in form, please fill properly and try again");
      return res.redirect("/manage/home?view=credits&form=true");
    } else {
      const client = await Customer.findOne({
        email: req.body.email,
      }).exec();
      // client.balance += req.body.amount;
      client.totalCredit += req.body.amount;
      // console.log(req.body.timestamp);
      await new Credit({
        issuer: req.user._id,
        amount: req.body.amount,
        description: `Received a credit of $${req.body.amount}`,
        destination: client._id,
        timestamp: req.body.timestamp,
      }).save();

      await new Notification({
        listener: client._id,
        description: `Received a credit of $${req.body.amount}`,
      }).save();

      await client.save();
      req.flash("info", "Client credited successfully");
      return res.redirect("/manage/home?view=credits");
    }
  },
];

const addCreditHistory = [
  body("email", "Email is required")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email"),
  body("timestamp", "Timestamp is required").trim().toDate(),
  body("amount", "Amount is required")
    .trim()
    .isNumeric()
    .withMessage("Please enter a valid amount")
    .toFloat(),
  body("email").custom(async (inputValue) => {
    inputValue = inputValue.trim();
    const userExists = await Customer.exists({ email: inputValue });

    if (!userExists) {
      throw Error("No client exists with such email, try again.");
    }

    return true;
  }),

  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash("formErrors", errors.array());
      req.flash("info", "Errors in form, please fill properly and try again");
      return res.redirect("/manage/home?view=creditHistory&form=true");
    } else {
      const client = await Customer.findOne({
        email: req.body.email,
      }).exec();

      if (!client) {
        req.flash("info", "Client with email not found");
        return res.redirect("/manage/home?view=creditHistory&form=true");
      }

      // client.balance += req.body.amount;
      client.totalCredit += req.body.amount;
      client.totalDebit += req.body.amount;

      // console.log(req.body.timestamp);
      await new Credit({
        issuer: client._id,
        amount: req.body.amount,
        description: `Received a credit of $${req.body.amount}`,
        destination: client._id,
        timestamp: req.body.timestamp,
        author: req.user._id,
      }).save();

      //   await new Notification({
      //     listener: client._id,
      //     description: `Received a credit of $${req.body.amount}`,
      //   }).save();

      await client.save();
      req.flash("info", "History added successfully");
      return res.redirect("/manage/home?view=creditHistory");
    }
  },
];

const addDebitHistory = [
  body("email", "Email is required")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email"),

  // body("senderEmail", "Email is required")
  //   .trim()
  //   .isEmail()
  //   .withMessage("Please enter a valid sender email"),

  body("accountNumber")
    .trim()
    .isString()
    .isNumeric({ no_symbols: true })
    .withMessage("Please enter valid account number"),
  body("timestamp", "Timestamp is required").trim().toDate(),
  body("amount", "Amount is required")
    .trim()
    .isNumeric()
    .withMessage("Please enter a valid amount")
    .toFloat(),
  body("email").custom(async (inputValue) => {
    inputValue = inputValue.trim();
    const userExists = await Customer.exists({ email: inputValue });

    if (!userExists) {
      throw Error("No client exists with such email, try again.");
    }

    return true;
  }),

  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash("formErrors", errors.array());
      req.flash("info", "Errors in form, please fill properly and try again");
      return res.redirect("/manage/home?view=debitHistory&form=true");
    } else {
      const client = await Customer.findOne({
        email: req.body.email,
      }).exec();

      if (!client) {
        req.flash("info", "Client with email not found");
        return res.redirect("/manage/home?view=debitHistory&form=true");
      }

      // client.balance += req.body.amount;
      client.totalCredit += req.body.amount;
      client.totalDebit += req.body.amount;

      // console.log(req.body.timestamp);

      const newDebit = await new Debit({
        issuer: client._id,
        amount: req.body.amount,
        author: req.user._id,
        approved: true,
        description: `Transfer of $${req.body.amount} to account ${req.body.accountNumber}`,
        destination: {
          accountNumber: req.body.accountNumber,
          // bankAddress: req.body.bankAddress,
          bankName: "City Bank",
          accountName: "Jon Miller",
          branchName: "Main branch",
          currency: req.user.currency,
          bankIban: "CDDVFFD",
          bankSwift: "D455FFF",
          // bankCity: req.body.city,
          // bankState: req.body.state,
          // bankCountry: req.body.country,
        },
      }).save();

      //   await new Notification({
      //     listener: client._id,
      //     description: `Received a credit of $${req.body.amount}`,
      //   }).save();

      await client.save();
      req.flash("info", "History added successfully");
      return res.redirect("/manage/home?view=debitHistory");
    }
  },
];

const editClient = [
  body("amount", "Balance is required")
    .trim()
    .isNumeric()
    .withMessage("Please enter a valid amount")
    .toFloat(),

  async function (req, res) {
    const client = await Customer.findById(req.params.id).exec();
    switch (req.method) {
      case "GET":
        const context = {
          client,
        };

        res.render("admin/edit_client", context);
        break;

      case "POST":
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
          req.flash("formErrors", errors.array());

          return res.redirect(req.originalUrl);
        } else {
          const newBalance = req.body.amount || client.balance;
          client.balance = newBalance;
          await client.save();
          req.flash("info", "Balance updated successfully");
          res.status(306).redirect("/manage/home?view=customers");
          break;
        }
    }
  },
];

async function home(req, res) {
  const view = req.query.view || "home";

  const options = {
    home: "home",
    customers: "clients",
    credits: "credits",
    debits: "debits",
    creditHistory: "creditHistory",
    debitHistory: "debitHistory",
  };
  let clients = await Customer.find({}).sort({ email: 1 }).exec();
  clients = clients.map((c) => c.toObject({ virtuals: true }));
  // console.log(clients);
  clients = clients.filter((c) => c.email !== req.user.email);

  let debits = await Debit.find({})
    .populate("issuer")
    .sort({ timestamp: -1 })
    .lean()
    .exec();
  let credits = await Credit.find({})
    .populate("issuer")
    .sort({ timestamp: -1 })
    .populate("destination")
    .exec();

  let debitsH = await Debit.find({ author: req.user._id })
    .populate("issuer")
    .sort({ timestamp: -1 })
    .lean()
    .exec();
  let creditsH = await Credit.find({ author: req.user._id })
    .populate("issuer")
    .sort({ timestamp: -1 })
    .populate("destination")
    .exec();

  // console.log(debits, credits);

  const context = {
    viewOptions: [options[view]],
    clients,
    debits,
    credits,
    creditsH,
    debitsH,
    flash: {
      info: req.flash("info"),
      formErrors: req.flash("formErrors"),
    },
  };
  res.render("admin/index", context);
}

module.exports = {
  home,
  editClient,
  addCredit,
  addCreditHistory,
  addDebitHistory,
  deleteCredit,
  deleteDebit,
  deleteUser,
  accessControl,
  debitAccessControl,
  balanceControl,
};
