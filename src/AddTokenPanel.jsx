import React, { Component } from "react";
import { withRouter } from "react-router-dom";

import PropTypes from "prop-types";
import SwitchNetworkNotice from "./SwitchNetworkNotice";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableRow from "@material-ui/core/TableRow";
import { Message } from "semantic-ui-react";
import TableCell from "@material-ui/core/TableCell";
import Typography from "@material-ui/core/Typography";
import CloudDownloadIcon from "@material-ui/icons/CloudDownload";
import SendIcon from "@material-ui/icons/Send";
import CheckCirleIcon from "@material-ui/icons/CheckCircle";

import Web3 from "web3";

import queryString from "querystringify";
import blackHoleContract from "./BlackHoleEosAccount.json";
import erc20Contract from "./ERC20Token.json";

import bigInt from "big-integer";
import eos from "./eos";

/*
 * mainnet info
 *
 */
const qbeAddress = "0xc029ba3dc12e1834571e821d94a07de0a01138ea";
const blackHoleAddress = "0x319db3af64ac077d52ce031394b963213f5ff828";
const telosChainId =
  "4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11";
const telosAPINode = "https://api.eos.miami";

/*
 * testnet info
 * 
const qbeAddress = '0x597022a19441066cb353e634005cf80e99b13bc1';
const blackHoleAddress = '0xfffb66ec4a5fabb7735bfeb7e4fe0e6f8c1ba631';
const telosChainId = 'e17615decaecd202a365f4c029f206eee98511979de8a5756317e2469f2289e3';
const telosAPINode = 'https://testnet.eos.miami';
*/

class AddTokenPanel extends Component {
  constructor(props) {
    const {
      tokenName = "Qubicles",
      tokenSymbol = "QBE",
      tokenDecimals = 18,
      tokenAddress = qbeAddress,
      tokenImage = "http://qubicles.io/assets/img/logos/logo-dark.png",
      tokenNet = 1,
      tokenBalance = 0,
      tokenBalanceWei = 0,
      accountAddress = "",
      message = "",
      errorMessage = "",
      net = 1,
      approvalTx = "",
      transferTx = "",
      eosAccountName = "",
      eosAccountExists = false,
      provider = null,
      allowance,
    } = props;

    super();
    this.state = {
      tokenName,
      tokenSymbol,
      tokenDecimals,
      tokenAddress,
      tokenImage,
      tokenNet,
      tokenBalance,
      tokenBalanceWei,
      accountAddress,
      message,
      errorMessage,
      net,
      approvalTx,
      transferTx,
      eosAccountName,
      eosAccountExists,
      provider,
      allowance,
    };

    const search = window.location.search;
    const params = queryString.parse(search);

    for (let key in params) {
      this.state[key] = params[key];
    }

    this.updateNet();
  }

  componentDidMount() {
    const search = this.props.location.search;
    const params = queryString.parse(search);
    this.setState(params);
  }

  async updateNet() {
    const provider = this.state.provider;
    const web3 = new Web3(provider);

    const realNet = await web3.eth.net.getId();
    this.setState({ net: realNet });

    const accounts = await web3.eth.getAccounts();

    this.setState({ accountAddress: accounts[0] });

    // retrieve balance of QBE and convert based on token decimals
    let qbeContract = new web3.eth.Contract(
      erc20Contract.abi,
      this.state.tokenAddress
    );
    try {
      const balanceData = await qbeContract.methods
        .balanceOf(accounts[0])
        .call({ from: accounts[0] });
      const decimals = await qbeContract.methods
        .decimals()
        .call({ from: accounts[0] });

      const allowanceData = await qbeContract.methods
        .allowance(accounts[0], blackHoleAddress)
        .call({ from: accounts[0] });

      const balance = bigInt(balanceData);
      this.setState({ tokenBalanceWei: balance });
      const tokenBalance = balance.divide(10 ** decimals);
      this.setState({ tokenBalance: tokenBalance.toString() });
      const allowance = bigInt(allowanceData);
      this.setState({ tokenAllowance: allowance });
    } catch (error) {
      console.log("Error", error);
    }
  }

  handleChange = (name) => (event) => {
    this.setState({
      [name]: event.target.value,
    });

    const config = {
      authorization: undefined,
      chainId: telosChainId,
      broadcast: true,
      verbose: false,
      expireInSeconds: 120,
      forceActionDataHex: false,
      httpEndpoint: telosAPINode,
    };

    eos(config)
      .getAccount(event.target.value)
      .then((tx) => {
        this.setState({ eosAccountExists: true });
      })
      .catch((err) => {
        this.setState({ eosAccountExists: false });
      });
  };

  onApprove = () => {
    const {
      provider,
      tokenAddress,
      accountAddress,
      tokenBalanceWei,
      tokenBalance,
      allowance,
    } = this.state;
    const web3 = new Web3(provider);
    let tokenContract = new web3.eth.Contract(erc20Contract.abi, tokenAddress);

    if (allowance > 0 && allowance != tokenBalanceWei) {
      tokenContract.methods
        .approve(blackHoleAddress, 0)
        .send({ from: accountAddress })
        .on("transactionHash", (hash) => {
          this.setState({
            approvalTx: "https://etherscan.io/tx/" + hash.toString(),
          });
        })
        .on("confirmation", (confirmationNumber, receipt) => {
          if (confirmationNumber == 2) {
            tokenContract.methods
              .approve(
                blackHoleAddress,
                web3.utils.toWei(tokenBalance.toString(), "ether")
              )
              .send({ from: accountAddress })
              .on("transactionHash", (hash) => {
                this.setState({
                  approvalTx: "https://etherscan.io/tx/" + hash.toString(),
                });
                console.log("approved:", tokenBalance, "-", hash);
              });
          }
          console.log("Confirmation", confirmationNumber, receipt);
        });
    } else {
      tokenContract.methods
        .approve(
          blackHoleAddress,
          web3.utils.toWei(tokenBalance.toString(), "ether")
        )
        .send({ from: accountAddress })
        .on("transactionHash", (hash) => {
          this.setState({
            approvalTx: "https://etherscan.io/tx/" + hash.toString(),
          });
          console.log("approved:", tokenBalance, "-", hash);
        });
    }
  };

  onTransfer = () => {
    const { provider, accountAddress, eosAccountName } = this.state;

    const web3 = new Web3(provider);

    let oracleContract = new web3.eth.Contract(
      blackHoleContract.abi,
      blackHoleAddress
    );
    oracleContract.methods
      .teleport(eosAccountName)
      .send({ from: accountAddress })
      .on("transactionHash", (hash) => {
        console.log(hash);
        this.setState({
          transferTx: "https://etherscan.io/tx/" + hash.toString(),
        });
      })
      .on("confirmation", (confirmationNumber, receipt) => {
        console.log(confirmationNumber, receipt);
        if (confirmationNumber === 3) {
          this.updateNet();
        }
      })
      .on("error", (error) => {
        console.log("error", error);
      });
  };

  render(props, context) {
    const {
      tokenName,
      tokenSymbol,
      tokenNet,
      net,
      tokenImage,
      tokenAddress,
      message,
      errorMessage,
      tokenBalance,
      tokenBalanceWei,
      accountAddress,
      approvalTx,
      transferTx,
      eosAccountName,
      eosAccountExists,
      provider,
      allowance,
    } = this.state;

    let error;
    if (eosAccountExists === false) {
      error = (
        <p className="errorMessage">
          This account does not exist on the Telos blockchain. Make sure this is
          the correct account and that you have its private keys, as this action
          cannot be reversed once submitted!
        </p>
      );
    }
    const web3 = new Web3(provider);

    web3.eth.getAccounts().then((accounts) => {
      if (accounts[0] !== accountAddress) {
        this.updateNet();
      }
    });

    if (tokenNet !== net) {
      return <SwitchNetworkNotice net={net} tokenNet={tokenNet} />;
    }

    const buttonStyles = {
      marginTop: "20px",
      width: "80%",
    };
    const iconStyles = {
      marginRight: "10px",
    };
    const typoStyles = {
      padding: "10px",
      fontSize: "12pt",
    };
    const rowStyles = {
      whiteSpace: "unset",
    };
    const fieldStyles = {
      marginLeft: "10px",
      marginRight: "10px",
      width: "80%",
    };
    const spacingStyles = {
      margin: "10px",
      width: "80%",
    };

    return (
      <div className="values">
        <header className="App-header">
          <img src={tokenImage} className="logo" alt="Qubicles" />
          <h1 className="App-title">{tokenName} Migration Assistant</h1>
        </header>
        <Typography gutterBottom style={typoStyles}>
          {`
            Use this migration tool to securely and easily transfer your Qubicle tokens from Ethereum to the Telos blockchain. 
            This requires you to have MetaMask configured with access to your account where your Ethereum-based QBE tokens are kept.
          `}
        </Typography>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <strong>Account</strong>
              </TableCell>
              <TableCell>{accountAddress}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <strong>Token</strong>
              </TableCell>
              <TableCell>{tokenName}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <strong>Current Balance</strong>
              </TableCell>
              <TableCell>
                {tokenBalance} {tokenSymbol}
              </TableCell>
            </TableRow>
            {approvalTx && approvalTx.length > 0 ? (
              <TableRow>
                <TableCell>
                  <strong>Approval Confirmation</strong>
                </TableCell>
                <TableCell styles={rowStyles}>
                  <a href={approvalTx} target="_blank">
                    {approvalTx}
                  </a>
                </TableCell>
              </TableRow>
            ) : (
              ""
            )}
            {transferTx && transferTx.length > 0 ? (
              <TableRow>
                <TableCell>
                  <strong>Transfer Confirmation</strong>
                </TableCell>
                <TableCell styles={rowStyles}>
                  <a href={transferTx} target="_blank">
                    {transferTx}
                  </a>
                </TableCell>
              </TableRow>
            ) : (
              ""
            )}
          </TableBody>
        </Table>

        <div className="App-actions">
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              window.open(
                "https://www.youtube.com/watch?v=rsJM51D-KA8",
                "_blank"
              );
            }}
          >
            Watch: How to Create a Free Telos Account
          </Button>

          <Button
            onClick={() => {
              window.open("https://sqrlwallet.io", "_blank");
            }}
            color="primary"
            variant="contained"
            style={buttonStyles}
          >
            <CloudDownloadIcon style={iconStyles} />
            Step 1: Download Sqrl &amp; Create Free Account
          </Button>

          <TextField
            id="eosAccountName"
            label="Enter Your Newly Created Telos Account Name Here"
            style={fieldStyles}
            value={this.state.eosAccountName}
            onChange={this.handleChange("eosAccountName")}
          />

          {eosAccountName && error ? <Message error>{error}</Message> : ""}

          <Button
            onClick={() => {
              this.onApprove();
            }}
            color="primary"
            variant="contained"
            style={buttonStyles}
            disabled={
              !tokenBalance ||
              (approvalTx && approvalTx.length > 0) ||
              allowance >= tokenBalanceWei
            }
          >
            <CheckCirleIcon style={iconStyles} />
            Step 2: Approve Transfer of QBE Balance
          </Button>

          <Button
            onClick={() => {
              this.onTransfer();
            }}
            color="primary"
            variant="contained"
            style={buttonStyles}
            disabled={
              !tokenBalance ||
              (transferTx && transferTx.length > 0) ||
              !approvalTx ||
              !eosAccountName ||
              (eosAccountName && error) ||
              allowance < tokenBalanceWei
            }
          >
            <SendIcon style={iconStyles} />
            Step 3: Transfer QBE Token to Telos
          </Button>

          <Typography gutterBottom style={typoStyles}>
            {`
            To learn how to use our Sqrl wallet, please visit our Resources page at.
          `}
          </Typography>

          <Button
            variant="outlined"
            color="secondary"
            styles={spacingStyles}
            onClick={() => {
              window.open("https://telos.net/resources", "_blank");
            }}
          >
            telos.net/resources
          </Button>

          <p>&nbsp;</p>

          <a className="footer-banner">
            <img
              src="http://qubicles.io/assets/img/logos/logo-dark.png"
              alt="logo"
            />
          </a>
        </div>
      </div>
    );
  }
}

AddTokenPanel.contextTypes = {
  web3: PropTypes.object,
};

export default withRouter(AddTokenPanel);
