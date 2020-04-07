import address from 'https://contracts.webaverse.com/address.js';
import abi from 'https://contracts.webaverse.com/abi.js';

const apiHost = `https://ipfs.exokit.org/ipfs`;
const network = 'rinkeby';
const infuraApiKey = '4fb939301ec543a0969f3019d74f80c2';
const rpcUrl = `https://${network}.infura.io/v3/${infuraApiKey}`;
const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
// window.web3 = web3;
const contract = new web3.eth.Contract(abi, address);

function makePromise() {
  let accept, reject;
  const p = new Promise((a, r) => {
    accept = a;
    reject = r;
  });
  p.accept = accept;
  p.reject = reject;
  return p;
}

// load

{
  const keystoreString = localStorage.getItem('wallet');
  if (keystoreString) {
    header.classList.add('locked');
  }
}

// wallet

let keystore = null;
const keystoreManager = new EventTarget();
const hdPathString = `m/44'/60'/0'/0`;
async function exportSeed(ks, password) {
  const p = makePromise();
  ks.keyFromPassword(password, function (err, pwDerivedKey) {
    if (!err) {
      const seed = ks.getSeed(pwDerivedKey);
      p.accept(seed);
    } else {
      p.reject(err);
    }
  });
  return await p;
}
async function signTx(ks, password, rawTx) {
  const p = makePromise();
  ks.keyFromPassword(password, function (err, pwDerivedKey) {
    if (!err) {
      const address = ks.addresses[0];
      console.log('sign tx', ks, pwDerivedKey, rawTx, address, hdPathString);
      const signed = lightwallet.signing.signTx(ks, pwDerivedKey, rawTx, `0x${address}`, hdPathString);
      p.accept(signed);
    } else {
      p.reject(err);
    }
  });
  return await p;
}
async function getPrivateKey(ks, password) {
  const p = makePromise();
  ks.keyFromPassword(password, function (err, pwDerivedKey) {
    if (!err) {
      const privateKey = ks.exportPrivateKey(ks.addresses[0], pwDerivedKey);
      p.accept(privateKey);
    } else {
      p.reject(err);
    }
  });
  return await p;
}
const _createKeystore = async (seedPhrase, password) => {
  // var seedPhrase = lightwallet.keystore.generateRandomSeed();

  const p = makePromise();
  lightwallet.keystore.createVault({
    password,
    seedPhrase, // Optionally provide a 12-word seed phrase
    // salt: fixture.salt,     // Optionally provide a salt.
                               // A unique salt will be generated otherwise.
    hdPathString,    // Optional custom HD Path String
  },
  (err, ks) => {
    // console.log('got keystore', err, ks);
    // window.ks = ks;

    if (!err) {
      ks.keyFromPassword(password, function (err, pwDerivedKey) {
        if (!err) {
          ks.generateNewAddress(pwDerivedKey, 1);

          p.accept(ks);
        } else {
          p.reject(err);
        }
      });
    } else {
      p.reject(err);
    }
  });
  const ks = await p;
  ks.exportSeed = exportSeed.bind(null, ks, password);
  ks.signTx = signTx.bind(null, ks, password);
  ks.getPrivateKey = getPrivateKey.bind(null, ks, password);
  return ks;
};
const _exportKeyStore = ks => ks.serialize();
const _importKeyStore = async (s, password) => {
  const ks = lightwallet.keystore.deserialize(s);

  const p = makePromise();
  ks.keyFromPassword(password, function (err, pwDerivedKey) {
    if (!err) {
      if (ks.isDerivedKeyCorrect(pwDerivedKey)) {
        p.accept();
      } else {
        p.reject(new Error('invalid password'));
      }
    } else {
      p.reject(err);
    }
  });
  await p;
  ks.exportSeed = exportSeed.bind(null, ks, password);
  ks.signTx = signTx.bind(null, ks, password);
  ks.getPrivateKey = getPrivateKey.bind(null, ks, password);
  return ks;
};
const _clearWalletClasses = () => {
  ['import', 'locked', 'unlocked'].forEach(c => {
    header.classList.remove(c);
  });
};
document.getElementById('import-key-button').addEventListener('click', async e => {
  document.getElementById('password-input').value = '';
  document.getElementById('seed-phrase-input').value = '';

  _clearWalletClasses();
  header.classList.add('import');
});
document.getElementById('create-wallet-button').addEventListener('click', e => {
  document.getElementById('password-input').value = '';
  document.getElementById('seed-phrase-input').value = lightwallet.keystore.generateRandomSeed();

  _clearWalletClasses();
  header.classList.add('import');
});
document.getElementById('import-button').addEventListener('click', async e => {
  // the seed is stored encrypted by a user-defined password
  const seedPhrase = document.getElementById('seed-phrase-input').value;
  const password = document.getElementById('password-input').value;
  // var seedPhrase = lightwallet.keystore.generateRandomSeed();

  keystore = await _createKeystore(seedPhrase, password);
  keystoreManager.dispatchEvent(new MessageEvent('change', {
    data: keystore,
  }));
  localStorage.setItem('wallet', _exportKeyStore(keystore));
  const address = keystore.addresses[0];
  let balance = await web3.eth.getBalance(address);
  balance /= 1e18;

  document.getElementById('seed-phrase-input').value = '';
  document.getElementById('password-input').value = '';
  document.getElementById('address-text').innerText = `0x${address}`;
  document.getElementById('balance-text').innerText = `${balance} ETH`;

  _clearWalletClasses();
  header.classList.add('unlocked');
});
[
  'seed-phrase-input',
  'password-input',
].forEach(k => {
  document.getElementById(k).addEventListener('keydown', e => {
    if (e.which === 13) {
      document.getElementById('import-button').click();
    }
  });
});
document.getElementById('cancel-import-button').addEventListener('click', e => {
  _clearWalletClasses();
});
document.getElementById('unlock-wallet-button').addEventListener('click', async e => {
  const keystoreString = localStorage.getItem('wallet');
  const password = document.getElementById('password-unlock-input').value;

  keystore = await _importKeyStore(keystoreString, password);
  keystoreManager.dispatchEvent(new MessageEvent('change', {
    data: keystore,
  }));
  const address = keystore.addresses[0];
  let balance = await web3.eth.getBalance(address);
  balance /= 1e18;

  document.getElementById('password-unlock-input').value = '';
  document.getElementById('address-text').innerText = `0x${address}`;
  document.getElementById('balance-text').innerText = `${balance} ETH`;

  _clearWalletClasses();
  header.classList.add('unlocked');
});
document.getElementById('password-unlock-input').addEventListener('keydown', e => {
  if (e.which === 13) {
    document.getElementById('unlock-wallet-button').click();
  }
});
document.getElementById('download-key-button').addEventListener('click', async e => {
  const seed = await keystore.exportSeed();
  const a = document.createElement('a');
  const b = new Blob([seed], {
    type: 'text/plain',
  });
  const u = URL.createObjectURL(b);
  a.href = u;
  a.download = 'seed.txt';
  a.click();
  URL.revokeObjectURL(u);
});
document.getElementById('forget-wallet-button').addEventListener('click', e => {
  localStorage.removeItem('wallet');
  _clearWalletClasses();
});
document.getElementById('lock-wallet-button').addEventListener('click', e => {
  keystore = null;
  keystoreManager.dispatchEvent(new MessageEvent('change', {
    data: keystore,
  }));

  _clearWalletClasses();
  header.classList.add('locked');
});

export {keystoreManager};
export async function getKeystore() {
  return keystore;
}