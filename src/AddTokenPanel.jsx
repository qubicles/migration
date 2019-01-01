import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SwitchNetworkNotice from './SwitchNetworkNotice'
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import { Message } from 'semantic-ui-react';
import TableCell from '@material-ui/core/TableCell';
import Typography from '@material-ui/core/Typography';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import SendIcon from '@material-ui/icons/Send';
import CheckCirleIcon from '@material-ui/icons/CheckCircle';
import Eth from 'ethjs-query';
import queryString from 'querystringify'
import blackHoleContract from './BlackHoleEosAccount.json';
import erc20Contract from './ERC20Token.json';
import eos from './eos';

/*
 * mainnet info
 *
 */
const qbeAddress = '0xc029ba3dc12e1834571e821d94a07de0a01138ea';
const blackHoleAddress = '0x319db3af64ac077d52ce031394b963213f5ff828';
const telosChainId = '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11';
const telosAPINode = 'https://api.eos.miami';

/*
 * testnet info
 * 
const qbeAddress = '0x597022a19441066cb353e634005cf80e99b13bc1';
const blackHoleAddress = '0xfffb66ec4a5fabb7735bfeb7e4fe0e6f8c1ba631';
const telosChainId = 'e17615decaecd202a365f4c029f206eee98511979de8a5756317e2469f2289e3';
const telosAPINode = 'https://testnet.eos.miami';
*/

class AddTokenPanel extends Component {

  constructor (props) {
    const {
      tokenName = 'Qubicles',
        tokenSymbol = 'QBE',
        tokenDecimals = 18,
        tokenAddress = qbeAddress,
        tokenImage = 'https://qubicles.io/wp-content/uploads/2018/12/Icon-Blue-bg.png',
        tokenNet = '1',
        tokenBalance = 0,
        tokenBalanceWei = 0,
        accountAddress = '',
        message = '',
        errorMessage = '',
        net = '1',
        approvalTx = '',
        transferTx = '',
        eosAccountName = '',
        eosAccountExists = false
    } = props

    super()
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
      eosAccountExists
    }

    const search = window.location.search
    const params = queryString.parse(search)

    for (let key in params) {
      this.state[key] = params[key]
    }

    this.updateNet()
  }

  componentDidMount() {
    const search = this.props.location.search
    const params = queryString.parse(search)
    this.setState(params)
  }

  async updateNet () {
    const provider = window.web3.currentProvider
    const eth = new Eth(provider)
    const realNet = await eth.net_version()
    this.setState({ net: realNet })

    eth.accounts().then((accounts) => {
      this.setState({ accountAddress: accounts[0] })

      // retrieve balance of QBE and convert based on token decimals
      let contract = window.web3.eth.contract(erc20Contract.abi).at(this.state.tokenAddress);
      contract.balanceOf(accounts[0], (error, balance) => {
        contract.decimals((error, decimals) => {
          this.setState({ tokenBalanceWei: balance })
          balance = balance.div(10**decimals);
          this.setState({ tokenBalance: balance.toString() })
        });
      });
    })
  }

  handleChange = name => event => {
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
      httpEndpoint: telosAPINode
    };

    eos(config).getAccount(event.target.value).then((tx) => {
      this.setState({ eosAccountExists: true })
    }).catch((err) => {
      this.setState({ eosAccountExists: false })
    });
  };

  render (props, context) {
    const {
      tokenName,
      tokenSymbol,
      tokenDecimals,
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
      eosAccountExists
    } = this.state

    let error
    if (eosAccountExists === false) {
      error = <p className="errorMessage">
        This account does not exist on the Telos blockchain. Make sure this is the correct account and that you have its private keys, as this action cannot be reversed once submitted!
      </p>
    }

    const eth = new Eth(window.web3.currentProvider)
    eth.accounts().then((accounts) => {
      if (accounts[0] !== accountAddress){
        this.updateNet();
      }
    });

    if (tokenNet !== net) {
      return <SwitchNetworkNotice net={net} tokenNet={tokenNet}/>
    }

    const buttonStyles = {
      marginTop: '20px',
      width: '80%'
    };
    const iconStyles = {
      marginRight: '10px'
    };
    const typoStyles = {
      padding: '10px',
      fontSize: '12pt'
    };
    const rowStyles = {
      whiteSpace: 'unset'
    };
    const fieldStyles = {
      marginLeft: '10px',
      marginRight: '10px',
      width: '80%',
    };
    const spacingStyles = {
      margin: '10px',
      width: '80%'
    };


    return (
      <div className="values">
        <header className="App-header">
          <img src={tokenImage} className="logo" alt="Qubicles"/>
          <h1 className="App-title">{tokenName} Migration Assistant</h1>
        </header>
        <Typography gutterBottom style={typoStyles}>
          {`
            Use this migration tool to securely and easily transfer your Qubicle tokens from Ethereum to the Telos chain of EOS.IO. 
            This requires you to have MetaMask configured with access to your account where your QBE tokens are kept.
          `}
        </Typography>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell><strong>Account</strong></TableCell>
              <TableCell>{accountAddress}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Token</strong></TableCell>
              <TableCell>{tokenName}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Current Balance</strong></TableCell>
              <TableCell>{tokenBalance} {tokenSymbol}</TableCell>
            </TableRow>
            {(approvalTx && approvalTx.length > 0) ?
                <TableRow>
                  <TableCell><strong>Approval Confirmation</strong></TableCell>
                  <TableCell styles={rowStyles}><a href={approvalTx} target='_blank'>{approvalTx}</a></TableCell>
                </TableRow>
            : ''}
            {(transferTx && transferTx.length > 0) ?
              <TableRow>
                <TableCell><strong>Transfer Confirmation</strong></TableCell>
                <TableCell styles={rowStyles}><a href={transferTx} target='_blank'>{transferTx}</a></TableCell>
              </TableRow>
            : ''}
          </TableBody>
        </Table>

        <div className="App-actions">
          <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            window.open('https://www.youtube.com/watch?v=rsJM51D-KA8', '_blank')
          }}>
          Watch: How to Create a Free Telos EOS.IO Account
          </Button>
          
          <Button
            onClick={() => {
              window.open('https://telos.miami#sqrl', '_blank')
            }}
            color="primary" 
            variant="contained" 
            style={buttonStyles}
            
          ><CloudDownloadIcon style={iconStyles}/>Step 1: Download Sqrl &amp; Create Free Account
          </Button>
          
          <TextField
            id="eosAccountName"
            label="Enter Your Newly Created Telos Account Name Here"
            style={fieldStyles}
            value={this.state.eosAccountName}
            onChange={this.handleChange('eosAccountName')}
          />

          {(eosAccountName && error) ?
            <Message error>
              {error}
            </Message>
          :''}

          <Button
            onClick={() => {
              // get main token contract and approve balance port
              let tokenContract = window.web3.eth.contract(erc20Contract.abi).at(this.state.tokenAddress);
              tokenContract.approve(blackHoleAddress, tokenBalanceWei, {from:accountAddress}, 
                (error, result) => {
                if (result) {
                  this.setState({ approvalTx: 'https://etherscan.io/tx/' + result.toString() })
                  console.log ('approved:', tokenBalance, '-', result)
                } else {
                  console.log (error.toString())
                }
              });
            }}
            color="primary" 
            variant="contained" 
            style={buttonStyles}
            disabled={!tokenBalance || (approvalTx && approvalTx.length > 0)}
          ><CheckCirleIcon style={iconStyles}/>Step 2: Approve Transfer of QBE Balance
          </Button>

          <Button
            onClick={() => {
              // get blackhole contract and teleport token
              let oracleContract = window.web3.eth.contract(blackHoleContract.abi).at(blackHoleAddress);
              oracleContract.teleport(eosAccountName, {from:accountAddress}, (error, result) => {
                this.updateNet();
                if (result) {
                  this.setState({ transferTx: 'https://etherscan.io/tx/' + result.toString() })
                  console.log ('teleported:', result)
                } else if (error) {
                  console.log (error.toString())
                }
              });
            }}
            color="primary" 
            variant="contained" 
            style={buttonStyles}
            disabled={!tokenBalance || (transferTx && transferTx.length > 0) 
              || (!approvalTx) || (!eosAccountName) || (eosAccountName && error)}
          ><SendIcon style={iconStyles}/>Step 3: Transfer QBE Token to Telos
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
          window.open('https://telos.miami/resources', '_blank');
        }}>
        www.telos.miami/resources
        </Button>

        <p>&nbsp;</p>

        <a className="footer-banner">
          <img src="https://qubicles.io/wp-content/uploads/2018/11/Qubicles-logo-bg.png" alt="logo" />
        </a>

        </div>
        
      </div>
    )
  }
}

AddTokenPanel.contextTypes = {
  web3: PropTypes.object,
}

export default AddTokenPanel;

