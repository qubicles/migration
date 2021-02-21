import React, { Component } from "react";
import detectEthereumProvider from "@metamask/detect-provider";
import AddTokenPanel from "./AddTokenPanel";
import DownloadMetaMaskButton from "./DownloadMetaMaskButton";
import { BrowserRouter, Route, Switch, HashRouter } from "react-router-dom";
import "./App.css";

class App extends Component {
  state = {
    injected: false,
    provider: null,
  };

  async componentDidMount() {
    const provider = await detectEthereumProvider();
    console.log("provider", provider);
    if (provider) {
      this.setState({ injected: true, provider });
    } else {
      this.setState({ injected: false });
    }
  }

  render() {
    return (
      <div className="App">
        {!this.state.injected && (
          <div>
            <p>
              You need a web3 browser like MetaMask to use this site to migrate
              your tokens.
            </p>
            <DownloadMetaMaskButton />
          </div>
        )}
        {this.state.injected && (
          <BrowserRouter basename={process.env.PUBLIC_URL}>
            <HashRouter hashType="noslash">
              <Switch>
                <Route path="/">
                  <AddTokenPanel provider={this.state.provider} />
                </Route>
              </Switch>
            </HashRouter>
          </BrowserRouter>
        )}
      </div>
    );
  }
}

export default App;
