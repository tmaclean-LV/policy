pragma solidity ^0.4.10;

contract Policy {

	struct Payment {
		uint date;
		uint256 amount;
	}
	Payment[] payments;
	uint256 paid = 0;

	uint constant public TERM_LENGTH = 1 years;
	uint256 constant public CURRENCY = 1 ether;

	uint public purchasedDate;
	uint256 public benefit = 0;
	uint256 public premium = 0;
	uint256 public risk = 0;
	uint256 public term = 0;

	bool public active = false;
	bool public collected = false;

	address public owner;
	address public admin;
	address public beneficiary;

	event PolicyPayment(uint _date, uint256 _amount, uint256 _premium);

	modifier onlyAdmin() {
		require(msg.sender == admin);
		_;
	}
	modifier onlyOwner() {
		require(msg.sender == owner);
		_;
	}
	modifier onlyBeneficiary() {
		require(msg.sender == beneficiary);
		_;
	}

	function status() constant returns (uint256, uint, uint256, uint256, uint256, uint256, bool, bool) {
		return (paid, purchasedDate, benefit, premium, risk, term, active, collected);
	}

	function initialize(uint256 _benefit, uint256 _term, uint256 _risk) returns (uint256) {
		require(benefit == 0);
		require(term == 0);
		require(_risk > 1);
		require(_term > 1);
		require(_benefit > 0);
		admin = msg.sender;
		term = _term;
		benefit = _benefit;
		risk = _risk;
		premium = ((benefit / (term * 10)) * risk);
		return premium;
	}

	function purchase(address _beneficiary) payable {
		PolicyPayment(now, msg.value, premium);
		require(msg.value >= premium);
		beneficiary = _beneficiary;
		owner = msg.sender;
		purchasedDate = now;
		Payment memory payment = Payment(now, msg.value);
		payments.push(payment);
		paid += msg.value;
		PolicyPayment(now, msg.value, this.balance);
		active = true;
	}
	function makePayment() payable onlyOwner {
		PolicyPayment(now, msg.value, premium);
		require(msg.value >= premium);
		Payment memory payment = Payment(now, msg.value);
		payments.push(payment);
		paid += msg.value;
	}
	function numberOfPayments() returns (uint) {
		return payments.length;
	}
	function getPayment(uint id) returns (uint, uint256) {
		return (payments[id].date, payments[id].amount);
	}
	function policyAge() returns (uint) {
		return (now - purchasedDate);
	}
	function expired() returns (bool) {
		return (policyAge() >= (term * TERM_LENGTH));
	}
	function goodStanding() returns (bool) {
		return (paid >= premium * (1 + (policyAge() / TERM_LENGTH)));
	}
	function withdrawl(uint256 amount) onlyAdmin {
		assert(msg.sender.send(amount));
	}
	function distribute() payable onlyAdmin {
		require(goodStanding());
		require(!expired());
		require(active);
		require(!collected);
		require(this.balance + msg.value >= benefit);
		active = false;
	}
	function collectBenefit() onlyBeneficiary {
		require(!active);
		require(!collected);
		require(this.balance >= benefit);
		collected = true;
		assert(msg.sender.send(benefit));
	}
}
