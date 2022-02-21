const hre = require('hardhat');

async function deployNefturians(address) {
  const MerkleProofLibrary = await hre.ethers.getContractFactory('MerkleProofLibrary');
  const merkleProofLibrary = await MerkleProofLibrary.deploy();
  await merkleProofLibrary.deployed();

  const StringsLibrary = await hre.ethers.getContractFactory('StringsLibrary');
  const stringsLibrary = await StringsLibrary.deploy();
  await stringsLibrary.deployed();

  const ECDSA = await hre.ethers.getContractFactory('ECDSALibrary', {
    libraries: {
      StringsLibrary: stringsLibrary.address
    }
  });
  const ecdsa = await ECDSA.deploy();
  await ecdsa.deployed();

  const Nefturians = await hre.ethers.getContractFactory('Nefturians', {
    libraries: {
      ECDSALibrary: ecdsa.address,
      MerkleProofLibrary: merkleProofLibrary.address,
      StringsLibrary: stringsLibrary.address
    }
  });
  if (address) return Nefturians.attach(address);

  const nefturians = await Nefturians.deploy();
  await nefturians.deployed();

  const artifactAddress = await nefturians.getArtifactContract();
  const dataAddress = await nefturians.getDataContract();

  const NefturiansArtifact = await hre.ethers.getContractFactory('NefturiansArtifact', {
    libraries: {
      ECDSALibrary: ecdsa.address
    }
  });
  const NefturiansData = await hre.ethers.getContractFactory('NefturiansData', {
    libraries: {
      ECDSALibrary: ecdsa.address,
      StringsLibrary: stringsLibrary.address
    }
  });

  const artifacts = NefturiansArtifact.attach(artifactAddress);
  const data = NefturiansData.attach(dataAddress);

  return {
    nefturians,
    artifacts,
    data
  };
}

module.exports = deployNefturians;
