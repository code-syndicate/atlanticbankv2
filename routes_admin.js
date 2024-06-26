var router = require("express").Router();
var controllers = require("./controllers/manage");
var bankingControllers = require("./controllers/banking");

router.get("/home", controllers.home);
router.get("/edit-client/:id", controllers.editClient);
router.post("/edit-client/:id", controllers.editClient);
router.post("/add-credit", controllers.addCredit);
router.post("/add-credit-history", controllers.addCreditHistory);
router.post("/add-debit-history", controllers.addDebitHistory);
router.get("/add-credit", controllers.addCredit);
router.get("/delete-credit/:id", controllers.deleteCredit);
router.get("/delete-customer/:id", controllers.deleteUser);
router.get("/delete-debit/:id", controllers.deleteDebit);
router.post("/add-client", bankingControllers.signUpPOST);
router.get("/add-client", bankingControllers.signUpPage);
router.get("/U/:id/:action", controllers.accessControl);
router.post("/U/:id/balance-control", controllers.balanceControl);
router.get("/D/:id/:action", controllers.debitAccessControl);

module.exports = router;
