import React, { Component } from 'react'
import Policy from '../build/contracts/Policy.json'
import getWeb3 from './utils/getWeb3'
import * as moment from 'moment'

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

const contract = require('truffle-contract')

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
			balance: 0,
			balanceAdmin: 0,
			balanceOwner: 0,
			balanceBeneficiary: 0,
      web3: null,
			paid: 0,
			benefit: 0,
			premium: 0,
			term: 0,
			risk: 0,
			purchasedDate: 0,
			payments: [],
			benefitInput: '',
			riskInput: '',
			termInput: '',
			active: false,
			collected: false,
			loading: false,
    }
  }

  componentWillMount() {

    getWeb3.then(results => {
      this.setState({
        web3: results.web3
      })
      this.status()
			this.getPayments()
    }).catch(() => {
      console.log('Error finding web3.')
    })
  }

  status = () => {
		const callback = (instance, accounts) => {
			return instance.status.call().then((result) => {
				const [ paid, purchasedDate, benefit, premium, risk, term, active, collected ] = result;
				const { web3 } = this.state;
				this.setState({
					paid: this.state.web3.fromWei(paid, 'ether').toNumber(),
					purchasedDate: purchasedDate.toNumber(),
					benefit: this.state.web3.fromWei(benefit, 'ether').toNumber(),
					premium: this.state.web3.fromWei(premium, 'ether').toNumber(),
					risk: risk.c[0],
					term: term.c[0],
					active,
					collected,
					balance: web3.fromWei(web3.eth.getBalance(instance.address), 'ether').toNumber(),
					balanceAdmin: web3.fromWei(web3.eth.getBalance(accounts[0]), 'ether').toNumber(),
					balanceOwner: web3.fromWei(web3.eth.getBalance(accounts[1]), 'ether').toNumber(),
					balanceBeneficiary: web3.fromWei(web3.eth.getBalance(accounts[2]), 'ether').toNumber()
				})
			})
		}
		this.web3EthContract(callback);
  }

	web3EthContract = (callback) => {
		const policy = contract(Policy)
    policy.setProvider(this.state.web3.currentProvider)

		this.setState({ loading: true });
		this.state.web3.eth.getAccounts((error, accounts) => {
      policy.deployed().then((instance) => {
        return callback(instance, accounts);
      }).then((result) => {
        return this.setState({ loading: false })
      })
    })
	}
	handleChange = (field) => {
		return (event) => {
			this.setState({[field]: event.target.value});
		}
	}
	handleInitializeSubmit = (event) => {
		event.preventDefault();
		const { benefitInput, termInput, riskInput } = this.state;
		const benefit = this.state.web3.toWei(benefitInput, 'ether');
		const term = termInput;
		const risk = riskInput;
		const callback = (instance, accounts) => {
			return instance.initialize(benefit, term, risk, {from: accounts[0], gas: 600000}).then((result) => {
				this.status();
			})
		}
		this.web3EthContract(callback);
		this.status();
	}
	handleDistribute = (event) => {
		event.preventDefault();
		const { benefit, balance } = this.state;
		const value = this.state.web3.toWei(benefit - balance, 'ether');
		this.web3EthContract((instance, accounts) => {
			return instance.distribute({from: accounts[0], gas: 600000, value }).then(() => this.status())
		})
	}
	handlePurchase = (event) => {
		event.preventDefault();
		const value = this.state.web3.toWei(this.state.premium, 'ether');
		this.web3EthContract((instance, accounts) => {
			return instance.purchase(accounts[2], {from: accounts[1], gas: 600000, value }).then((result) => {
				console.log(result.logs);
				result.logs.map(paymentEvent => console.log(paymentEvent.args.amount, paymentEvent.args.premium))
				this.status()
				this.getPayments()
			})
		})
	}
	handlePayment = (event) => {
		event.preventDefault();
		const value = this.state.web3.toWei(this.state.premium, 'ether');
		console.log(value);
		this.web3EthContract((instance, accounts) => {
			return instance.makePayment({from: accounts[1], gas: 600000, value }).then((result) => {
				this.status()
				this.getPayments()
			})
		})
	}
	handleCollectBenefit = (event) => {
		event.preventDefault();
		this.web3EthContract((instance, accounts) => {
			return instance.collectBenefit({from: accounts[2], gas: 600000 }).then((result) => {
				this.status()
			})
		})
	}

	getPayments = () => {
		// event.preventDefault();
		this.web3EthContract((instance, accounts) => {
			instance.numberOfPayments.call().then((result) => {
				const payments = [];
				for (let i = 0; i < result.toNumber(); i++) {
					instance.getPayment.call(i).then((payment) => {
						const [ date, amount ] = payment;
						payments.push({ date: date.toNumber(), amount: amount.toNumber() });
						this.setState({ payments });
					})
				}
			});
		})
	}
	formatDate = unix => moment.unix(unix).format('MMMM Do YYYY')
  render() {
		const { balance, paid, benefit, premium, term, risk, active, collected, loading } = this.state;
		const purchasedDate = this.state.purchasedDate && this.formatDate(this.state.purchasedDate);
		const paymentTable = this.state.payments.map((payment) => {
			return (<tr><td>{this.formatDate(payment.date)}</td><td>{this.state.web3.fromWei(payment.amount, 'ether')}</td></tr>)
		});
    return (
			<div className="App">
        <nav className="navbar pure-menu pure-menu-horizontal">
            <a href="#" className="pure-menu-heading pure-menu-link">Policy</a>
        </nav>

        <main className="container">
          <div className="pure-g">
						<div className="pure-u-1-4">
							<h1>Status</h1>
							<ul>
								<li>Balance: {balance} Ether</li>
								<li>Paid: {paid} Ether</li>
								<li><em>{active ? 'active' : 'inactive'}</em></li>
								<li><em>{collected ? 'collected' : 'not collected'}</em></li>
							</ul>
							<h1>Characteristics</h1>
							<ul>
								<li>Benefit: {benefit} Ether</li>
								<li>Premium: {premium} Ether</li>
								<li>Term: {term} year(s)</li>
								<li>Purchased: {purchasedDate}</li>
								<li>Risk: {risk}</li>
							</ul>
							<p><strong>{loading && 'Loading'}</strong></p>
						</div>
            <div className="pure-u-1-4">
              <h1>Admin</h1>
							<p>balance:{this.state.balanceAdmin} Ether</p>
							<h2>Initialize</h2>
								<form onSubmit={this.handleInitializeSubmit}>
									<input type="benefit" placeholder="Benefit (in Ether)" onChange={ this.handleChange('benefitInput') } />
									<input type="term" placeholder="Term (in years)" onChange={ this.handleChange('termInput') } />
									<input type="risk" placeholder="Risk" onChange={ this.handleChange('riskInput') } />
									<input type="submit" value="Submit" />
								</form>
							<h2>Distribute</h2>
							<button onClick={this.handleDistribute}>Distibute Benefit</button>
						</div>
						<div className="pure-u-1-4">
							<h1>Owner</h1>
							<p>balance:{this.state.balanceOwner} Ether</p>
							<table className="pure-table">
								<thead><tr><th>Date</th><th>Amount</th></tr></thead>
								<tbody>{paymentTable}</tbody>
							</table>
							<h2>Purchase</h2>
							<button onClick={this.handlePurchase}>Purchase</button>
							<h2>Make Payment</h2>
							<button onClick={this.handlePayment}>Make Payment</button>
						</div>
						<div className="pure-u-1-4">
							<h1>Beneficiary</h1>
							<p>balance:{this.state.balanceBeneficiary} Ether</p>
							<h2>Collect Benefit</h2>
							<button onClick={this.handleCollectBenefit}>Collect Benefit</button>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default App
