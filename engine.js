const realityScriptAbi = require('./reality-script-abi.json');
const {
  infuraProjectId,
  account,
  privateKey,
} = require('./config.js');

function jsonParse(s) {
  try {
    return JSON.parse(s);
  } catch(err) {
    return null;
  }
}
const getRandomId = () => Math.random().toString(36).substring(7);

module.exports = class RealityScriptEngine {
  constructor({web3, contract}) {
    this.web3 = web3;
    this.contract = contract;
    this.objects = {};
  }
  async initState(id, address, transform) {
    const contractAddress = await contract.methods.getContract(id).call();
    console.log('got contract address', contractAddress);
    const objectContract = new this.web3.eth.Contract(realityScriptAbi, contractAddress);
    const state = await objectContract.methods.initState(address, transform).call();
    const oid = getRandomId();
    this.objects[oid] = {
      contract: objectContract,
      state,
    };
    return {
      oid,
      state,
    };
  }
  async update(oid, transform) {
    const object = this.objects[oid];
    if (object) {
      const o = await object.contract.methods.update(transform, [['0x0', ['0x0', '0x0', '0x0']]], object.state).call();
      const apply = o[0];
      const state = o[1];
      console.log('got result', o);
      object.state = state;
      if (apply) {
        console.log('apply 0', object.state);
        const gasPrice = await this.web3.eth.getGasPrice();
        console.log('apply 1', gasPrice);
        const estimatedGas = await object.contract.methods.applyState(object.state).estimateGas({
          from: account,
          gasPrice,
        });
        console.log('apply 2', estimatedGas, object.contract.options.address);
        const contractBalance = await this.web3.eth.getBalance(object.contract.options.address);
        console.log('apply 3', contractBalance);
        if (contractBalance >= estimatedGas) {
          const encoded = object.contract.methods.applyState(object.state).encodeABI();
          const nonce = await this.web3.eth.getTransactionCount(account);
          const tx = {
            to: object.contract.options.address,
            data: encoded,
            gasPrice,
            gas: estimatedGas,
            nonce,
          };
          const signed = await this.web3.eth.accounts.signTransaction(tx, privateKey);/* .then(signed => {
            this.web3.eth.sendSignedTransaction(signed.rawTransaction).on('receipt', console.log)
          }); */
          console.log('apply 4', signed);
          this.web3.eth.sendSignedTransaction(signed.rawTransaction).on('receipt', e => {
            console.log('apply 6', e);
          });
          /* const applyResult = await object.contract.methods.applyState(object.state).send({
            from: account,
          }); */
          console.log('apply 5');
          s.send(JSON.stringify({
            result: {
              state: object.state,
            },
            error: null,
          }));
        } else {
          throw new Error('contract has insufficient gas to update');
        }
      } else {
        return {
          state: object.state,
        };
      }
    } else {
      throw new Error('object not found');
    }
  }
}