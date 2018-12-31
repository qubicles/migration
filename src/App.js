import React, { Component } from 'react';
import './App.css';
import { Web3Provider } from 'react-web3';
import AddTokenPanel from './AddTokenPanel';
import DownloadMetaMaskButton from './DownloadMetaMaskButton';
import { BrowserRouter, Route, Switch, HashRouter } from 'react-router-dom';

class App extends Component {

  render(props, context) {
    return (
      <div className="App">
        <Web3Provider
          web3UnavailableScreen={() => <div>
            <p>You need a web3 browser like MetaMask to use this site to migrate your tokens.</p>
            <DownloadMetaMaskButton/>
          </div>}
        >
          <BrowserRouter basename={process.env.PUBLIC_URL}>
            <HashRouter hashType="noslash">
              <Switch>
                <Route path="/" component={AddTokenPanel} />
              </Switch>
            </HashRouter>
          </BrowserRouter>
        </Web3Provider>
      </div>
    );
  }
}

export default App;
