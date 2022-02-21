const { deployNefturians } = require('../deploy');
const hre = require('hardhat');

async function mint() {
  if (!process.env.NEFTURIANS_ADDRESS) {
    throw new Error('Nefturians contract address should be provided');
  }
  if (!process.env.SIGNED) {
    throw new Error('You must provide a SIGNED env variable');
  }
  const signers = await hre.ethers.getSigners();
  const { nefturians } = await deployNefturians(process.env.NEFTURIANS_ADDRESS);

  console.log(signers[3].address);
  return nefturians.connect(signers[3]).mint(process.env.SIGNED, {
    value: hre.ethers.utils.parseEther('0.1')
  });
}

mint().catch(console.error);
