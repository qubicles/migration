const CryptoJS = require('crypto-js');
const ecc = require('eosjs-ecc');
const Eos = require('eosjs');

export default function eos(connection, signing = false) {
  const decrypted = Object.assign({}, connection);
  if (signing && decrypted.keyProviderObfuscated) {
    const {
      hash,
      key
    } = decrypted.keyProviderObfuscated;
    if (hash && key) {
      const wif = decrypt(key, hash, 1).toString(CryptoJS.enc.Utf8);
      if (ecc.isValidPrivate(wif) === true) {
        decrypted.keyProvider = [wif];
      }
    }
  }
  // Remove edgecase where authorization is improperly set
  // TODO: Resolve why they are getting unset in certain edge cases
  if (
    decrypted.authorization
    && (
      decrypted.authorization === []
      || decrypted.authorization === [null]
      || decrypted.authorization === [undefined]
    )
  ) {
    delete decrypted.authorization;
  }
  return Eos(decrypted);
}

function decrypt(data, pass, iterations = 4500) {
    const keySize = 256;
    const salt = CryptoJS.enc.Hex.parse(data.substr(0, 32));
    const iv = CryptoJS.enc.Hex.parse(data.substr(32, 32));
    const encrypted = data.substring(64);
    const key = CryptoJS.PBKDF2(pass, salt, {
      iterations,
      keySize: keySize / 4
    });
    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    });
    return decrypted;
  }