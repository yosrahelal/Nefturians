const {
  deployNefturians
} = require('../deploy/index.js');

async function main() {
  const nefturians = await deployNefturians(process.env.NEFTURIANS_ADDRESS);
  if (!process.env.NEFTURIANS_ADDRESS) {
    console.log('Deployed Nefturians.');
    console.log('To avoid redeploying it, add the following to your `.env`:');
    console.log(`\nNEFTURIANS_ADDRESS=${nefturians.address}\n`);
  }

  console.log({
    nefturians: nefturians.address
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
