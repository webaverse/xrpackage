module.exports = [
  {
    "inputs": [
      {
        "internalType": "contract IRealityScriptEngine",
        "name": "_parent",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "payable": true,
    "stateMutability": "payable",
    "type": "constructor"
  },
  {
    "constant": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "addr",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "int256",
                "name": "x",
                "type": "int256"
              },
              {
                "internalType": "int256",
                "name": "y",
                "type": "int256"
              },
              {
                "internalType": "int256",
                "name": "z",
                "type": "int256"
              }
            ],
            "internalType": "struct IRealityScript.Transform",
            "name": "transform",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "hp",
            "type": "uint256"
          }
        ],
        "internalType": "struct RealityScript.State",
        "name": "state",
        "type": "tuple"
      }
    ],
    "name": "applyState",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "getHp",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "internalType": "address",
        "name": "a",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "int256",
            "name": "x",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "y",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "z",
            "type": "int256"
          }
        ],
        "internalType": "struct IRealityScript.Transform",
        "name": "t",
        "type": "tuple"
      }
    ],
    "name": "initState",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "addr",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "int256",
                "name": "x",
                "type": "int256"
              },
              {
                "internalType": "int256",
                "name": "y",
                "type": "int256"
              },
              {
                "internalType": "int256",
                "name": "z",
                "type": "int256"
              }
            ],
            "internalType": "struct IRealityScript.Transform",
            "name": "transform",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "hp",
            "type": "uint256"
          }
        ],
        "internalType": "struct RealityScript.State",
        "name": "",
        "type": "tuple"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "components": [
          {
            "internalType": "int256",
            "name": "x",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "y",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "z",
            "type": "int256"
          }
        ],
        "internalType": "struct IRealityScript.Transform",
        "name": "t",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "int256",
                "name": "x",
                "type": "int256"
              },
              {
                "internalType": "int256",
                "name": "y",
                "type": "int256"
              },
              {
                "internalType": "int256",
                "name": "z",
                "type": "int256"
              }
            ],
            "internalType": "struct IRealityScript.Transform",
            "name": "transform",
            "type": "tuple"
          }
        ],
        "internalType": "struct IRealityScript.Object[]",
        "name": "os",
        "type": "tuple[]"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "addr",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "int256",
                "name": "x",
                "type": "int256"
              },
              {
                "internalType": "int256",
                "name": "y",
                "type": "int256"
              },
              {
                "internalType": "int256",
                "name": "z",
                "type": "int256"
              }
            ],
            "internalType": "struct IRealityScript.Transform",
            "name": "transform",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "hp",
            "type": "uint256"
          }
        ],
        "internalType": "struct RealityScript.State",
        "name": "state",
        "type": "tuple"
      }
    ],
    "name": "update",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "addr",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "int256",
                "name": "x",
                "type": "int256"
              },
              {
                "internalType": "int256",
                "name": "y",
                "type": "int256"
              },
              {
                "internalType": "int256",
                "name": "z",
                "type": "int256"
              }
            ],
            "internalType": "struct IRealityScript.Transform",
            "name": "transform",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "hp",
            "type": "uint256"
          }
        ],
        "internalType": "struct RealityScript.State",
        "name": "",
        "type": "tuple"
      }
    ],
    "payable": false,
    "stateMutability": "pure",
    "type": "function"
  }
]