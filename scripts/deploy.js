const deployNefturians = require('../deploy/index.js');

async function main() {
  const {
    nefturians,
    artifacts,
    data
  } = await deployNefturians();
  console.log('Deployed Nefturians.\n\n');
  console.log(`NEFTURIANS_ADDRESS=${nefturians.address}\n`);
  console.log(`ARTIFACTS_ADDRESS=${artifacts.address}\n`);
  console.log(`METADATA_ADDRESS=${data.address}\n`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
