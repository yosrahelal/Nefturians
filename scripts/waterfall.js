const hre = require('hardhat');

async function main() {
  const signers = await hre.ethers.getSigners();
  const funder = signers.shift();
  const value = hre.ethers.utils.parseEther('1337');

  for (const to of signers) {
    await funder.sendTransaction({ to: to.address, value });
  }
}

main();
