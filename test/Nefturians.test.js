const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  deployNefturians
} = require('../deploy/index.js');
const axios = require('axios');
const errorMessages = require('../doc/errors');

async function runAndGetBalance(address, callback) {
  const previousBalance = await ethers.provider.getBalance(address);
  await callback();
  const finalBalance = await ethers.provider.getBalance(address);
  return finalBalance.sub(previousBalance);
}

describe('Nefturians basic features', () => {
  let NefturiansAdmin;
  let NefturiansClientA;
  let NefturiansClientB;
  let NefturiansClientC;
  let NefturiansDeployer;
  let NefturiansData;
  let NefturiansArtifactsAdmin;

  let signers;
  let deployer;
  let http;
  let clientA;
  let clientB;
  let clientC;
  let counter = 0;
  let price;

  before(async () => {
    signers = await ethers.getSigners();

    deployer = signers[0];
    clientA = signers[1];
    clientB = signers[2];
    clientC = signers[4];

    const {
      nefturians,
      artifacts,
      data
    } = await deployNefturians();
    NefturiansAdmin = nefturians;
    NefturiansArtifactsAdmin = artifacts;
    NefturiansData = data;
    price = await NefturiansAdmin.getMintingPrice();

    NefturiansClientA = NefturiansAdmin.connect(clientA);
    NefturiansClientB = NefturiansAdmin.connect(clientB);
    NefturiansClientC = NefturiansAdmin.connect(clientC);

    NefturiansDeployer = NefturiansAdmin.connect(deployer);

    http = axios.create({
      baseURL: process.env.API_URL
    });

    const response = await http.post('/contract', {
      address: NefturiansDeployer.address
    }).catch(e => console.log(`POST /contract: ${e.message}`));
    await expect(response.data.address).to.equal(NefturiansDeployer.address);
  });

  it('Supports ERC721 Interface', async () => {
    const supportsInterface = await NefturiansAdmin.supportsInterface('0x80ac58cd');
    await expect(supportsInterface).to.be.true;
  });

  it('Distributes minter roles correctly', async () => {
    const minterRole = ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']);
    await expect(await NefturiansAdmin.hasRole(minterRole, deployer.address)).to.be.true;
    await expect(await NefturiansAdmin.hasRole(minterRole, clientA.address)).to.be.false;
  });

  it('Distributes pauser roles correctly', async () => {
    const pauserRole = ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE']);
    await expect(await NefturiansAdmin.hasRole(pauserRole, deployer.address)).to.be.true;
    await expect(await NefturiansAdmin.hasRole(pauserRole, clientA.address)).to.be.false;
  });

  it('Distributes dao roles correctly', async () => {
    const daoRole = ethers.utils.solidityKeccak256(['string'], ['DAO_ROLE']);
    await expect(await NefturiansAdmin.hasRole(daoRole, deployer.address)).to.be.true;
    await expect(await NefturiansAdmin.hasRole(daoRole, clientA.address)).to.be.false;
  });

  it('Distributes signer roles correctly', async () => {
    const signerRole = ethers.utils.solidityKeccak256(['string'], ['SIGNER_ROLE']);
    await expect(await NefturiansAdmin.hasRole(signerRole, deployer.address)).to.be.true;
    await expect(await NefturiansAdmin.hasRole(signerRole, clientA.address)).to.be.false;
  });

  it('Distributes metadata roles correctly', async () => {
    const metadataRole = ethers.utils.solidityKeccak256(['string'], ['METADATA_ROLE']);
    await expect(await NefturiansAdmin.hasRole(metadataRole, deployer.address)).to.be.true;
    await expect(await NefturiansAdmin.hasRole(metadataRole, clientA.address)).to.be.false;
  });

  it('Distributes data_contract roles correctly', async () => {
    const dataContractRole = ethers.utils.solidityKeccak256(['string'], ['DATA_CONTRACT_ROLE']);
    await expect(await NefturiansAdmin.hasRole(dataContractRole, NefturiansData.address)).to.be.true;
    await expect(await NefturiansAdmin.hasRole(dataContractRole, deployer.address)).to.be.false;
    await expect(await NefturiansAdmin.hasRole(dataContractRole, clientA.address)).to.be.false;
  });

  it('Distributes artifact contract roles correctly', async () => {
    const artifactContractRole = ethers.utils.solidityKeccak256(['string'], ['ARTIFACT_CONTRACT_ROLE']);
    await expect(await NefturiansAdmin.hasRole(artifactContractRole, NefturiansArtifactsAdmin.address)).to.be.true;
    await expect(await NefturiansAdmin.hasRole(artifactContractRole, deployer.address)).to.be.false;
    await expect(await NefturiansAdmin.hasRole(artifactContractRole, clientA.address)).to.be.false;
  });

  it('Deployed contract setup correctly', async () => {
    await expect(await NefturiansAdmin.paused()).to.be.false;
  });

  // ############
  // Test mint to reserve #1 #2 #3 and #4 for team
  // ############

  it('Can update mint start date', async () => {
    await NefturiansAdmin.setPresaleStart(Math.floor(Date.now() / 1000));
  });

  it('Can mint 4 first NFTs with admin address', async () => {
    const tx = await NefturiansAdmin.safeMint(deployer.address, 4);
    const details = await tx.wait();
    const events = details.events.filter(e => e.event === 'Transfer');
    await expect(events.length).to.equal(4);
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const {
        from,
        to,
        tokenId
      } = event.args;
      await expect(parseInt(from, 16)).to.equal(0);
      await expect(to).to.equal(deployer.address);
      await expect(tokenId).to.equal(i);
      counter++;
    }
    await expect(await NefturiansAdmin.balanceOf(deployer.address)).to.be.equal(events.length);
  });

  it('Can set baseURI', async () => {
    await NefturiansAdmin.setBaseURI('https://api.nefturians.io/');

    expect(await NefturiansAdmin.tokenURI(0)).to.be.equal('https://api.nefturians.io/0');
    expect(await NefturiansAdmin.tokenURI(1)).to.be.equal('https://api.nefturians.io/1');

    expect(await NefturiansAdmin.getTokenURI);
  });

  it('Cant mint yet', async () => {
    const response = await http.post('/sign', { address: clientA.address });
    const signed = response.data.signature;

    await expect(NefturiansClientA.publicMint(1, signed, {
      value: price
    })).to.be.revertedWith(errorMessages['Public sale not live yet']);
  });

  it('Cant activate public mint if not pauser_role', async () => {
    await expect(NefturiansClientA.pause()).to.be.revertedWith(errorMessages['You dont have required role']);
  });

  it('Can pause and unpause public mint if pauser_role', async () => {
    await NefturiansAdmin.pause();
    await expect(await NefturiansAdmin.paused()).to.be.true;
  });

  // ############
  // presale mint
  // ############

  it('Cannot mint presale if WL paused', async () => {
    const response = await http.post('/whitelist', { address: clientA.address });
    const merkleProof = response.data.merkleProof;

    await expect(NefturiansClientA.whitelistMint(1, merkleProof, {
      value: price
    })).to.be.revertedWith('Pausable: paused');
  });

  it('Cannot unPause whitelist mint if not pauser_role', async () => {
    await expect(NefturiansClientA.unpause()).to.be.reverted;
  });

  it('Can unPause whitelist mint', async () => {
    await NefturiansDeployer.unpause();
    await expect(await NefturiansDeployer.paused()).to.be.false;
  });

  it('Cannot mint presale if merkle root isnt setup', async () => {
    const response = await http.post('/whitelist', { address: clientA.address });
    const merkleProof = response.data.merkleProof;

    await expect(NefturiansClientA.whitelistMint(1, merkleProof, {
      value: price
    })).to.be.revertedWith(errorMessages["Merkle root hasn't been set"]);
  });

  /**
   * TODO: replace hardcoded merkle proof with a calculated one
   */
  it("Can't setup merkle root if not MINTER_ROLE", async () => {
    const { data } = await http.get('/whitelist/root');
    await expect(NefturiansClientA.setMerkleRoot(data.root)).to.be.revertedWith(errorMessages['You dont have required role']);
  });

  it('Can setup merkle root', async () => {
    const { data } = await http.get('/whitelist/root');
    await expect(await NefturiansDeployer.merkleRoot()).to.not.be.equal(data.root);
    await NefturiansDeployer.setMerkleRoot(data.root);
    await expect(await NefturiansDeployer.merkleRoot()).to.be.equal(data.root);
  });

  it('Cant mint presale if not WL', async () => {
    // get proof of someone else
    const { data } = await http.post('/whitelist', { address: clientB.address });
    const merkleProof = data.merkleProof;

    await expect(NefturiansClientB.whitelistMint(1, merkleProof, {
      value: price
    })).to.be.revertedWith(errorMessages['Invalid proof.']);
  });
  /**
   * /TODO
   */

  it('Can mint presale if WL', async () => {
    const { data } = await http.post('/whitelist', { address: clientA.address });
    const merkleProof = data.merkleProof;

    const tx = await NefturiansClientA.whitelistMint(1, merkleProof, {
      value: price
    });
    const receipt = await tx.wait();
    const transferEvents = receipt.events.filter(e => e.event === 'Transfer');
    await expect(transferEvents.length).to.be.equal(1);
    const {
      from,
      to,
      tokenId
    } = transferEvents[0].args;
    await expect(parseInt(from, 16)).to.be.equal(0);
    await expect(to).to.be.equal(clientA.address);
    await expect(tokenId).to.be.equal(counter);
    counter++;
  });

  it('Can mint one more in presale and dont get ticket on mint', async () => {
    const balanceDiff = await runAndGetBalance(NefturiansAdmin.address, async () => {
      await expect(await NefturiansArtifactsAdmin.balanceOf(clientA.address, 0)).to.be.equal(0);

      const { data } = await http.post('/whitelist', { address: clientA.address });
      const merkleProof = data.merkleProof;

      const tx = await NefturiansClientA.whitelistMint(1, merkleProof, {
        value: price
      });
      const receipt = await tx.wait();
      const transferEvents = receipt.events.filter(e => e.event === 'Transfer');
      await expect(transferEvents.length).to.be.equal(1);
      const {
        from,
        to,
        tokenId
      } = transferEvents[0].args;
      await expect(parseInt(from, 16)).to.be.equal(0);
      await expect(to).to.be.equal(clientA.address);
      await expect(tokenId).to.be.equal(counter);
      counter++;

      await expect(await NefturiansArtifactsAdmin.balanceOf(clientA.address, 0)).to.be.equal(0);
    });

    await expect(balanceDiff).to.equal(price);
  });

  it('Cannot mint more in presale with the same account', async () => {
    const response = await http.post('/whitelist', { address: clientA.address });
    const merkleProof = response.data.merkleProof;

    await expect(NefturiansClientA.whitelistMint(1, merkleProof, {
      value: price
    })).to.be.revertedWith(errorMessages['Address has already claimed']);
  });

  it('Cannot mint 3 in presale', async () => {
    const response = await http.post('/whitelist', { address: clientC.address });
    const merkleProof = response.data.merkleProof;

    await expect(NefturiansClientC.whitelistMint(3, merkleProof, {
      value: price.mul(3)
    })).to.be.revertedWith(errorMessages['Address has already claimed']);
  });

  it('Can mint 2 in presale', async () => {
    const response = await http.post('/whitelist', { address: clientC.address });
    const merkleProof = response.data.merkleProof;

    const tx = await NefturiansClientC.whitelistMint(2, merkleProof, {
      value: price.mul(2)
    });
    const receipt = await tx.wait();
    const transferEvents = receipt.events.filter(e => e.event === 'Transfer');
    await expect(transferEvents.length).to.be.equal(2);
    for (let i = 0; i < transferEvents.length; i++) {
      const {
        from,
        to,
        tokenId
      } = transferEvents[i].args;
      await expect(parseInt(from, 16)).to.be.equal(0);
      await expect(to).to.be.equal(clientC.address);
      await expect(tokenId).to.be.equal(counter + i);
    }
    counter += transferEvents.length;
  });
});

describe('New batch for more tests', () => {
  let NefturiansAdmin;
  let NefturiansClientA;
  let NefturiansClientB;
  let NefturiansClientC;
  let NefturiansClientD;
  let NefturiansClientE;
  let NefturiansDeployer;

  let signers;
  let deployer;
  let http;
  let clientA;
  let clientB;
  let clientC;
  let clientD;
  let clientE;
  let counter = 0;
  let price;

  before(async () => {
    signers = await ethers.getSigners();

    deployer = signers[0];
    clientA = signers[1];
    clientB = signers[2];
    clientC = signers[4];
    clientD = signers[5];
    clientE = signers[6];

    const {
      nefturians
    } = await deployNefturians();
    NefturiansAdmin = nefturians;
    price = await NefturiansAdmin.getMintingPrice();

    NefturiansClientA = NefturiansAdmin.connect(clientA);
    NefturiansClientB = NefturiansAdmin.connect(clientB);
    NefturiansClientC = NefturiansAdmin.connect(clientC);
    NefturiansClientD = NefturiansAdmin.connect(clientD);
    NefturiansClientE = NefturiansAdmin.connect(clientE);

    NefturiansDeployer = NefturiansAdmin.connect(deployer);

    http = axios.create({
      baseURL: process.env.API_URL
    });

    let response = await http.post('/contract', {
      address: NefturiansDeployer.address
    }).catch(e => console.log(`POST /contract: ${e.message}`));
    await expect(response.data.address).to.equal(NefturiansDeployer.address);
    await NefturiansAdmin.setPresaleStart(Math.floor(Date.now() / 1000));
    await NefturiansAdmin.setPublicSaleStart(Math.floor(Date.now() / 1000));
    response = await http.get('/whitelist/root');
    await NefturiansDeployer.setMerkleRoot(response.data.root);
  });

  // ############
  // public mint
  // ############

  // basic exceptions and check
  it('Need to pay for mint', async () => {
    const { data } = await http.post('/sign', { address: clientA.address });
    const signature = data.signature;
    await expect(NefturiansClientA.publicMint(1, signature, {
      value: ethers.utils.parseEther('0')
    })).to.be.revertedWith(errorMessages['You have to send the right amount']);
  });

  it('Need to pay right amount to mint', async () => {
    const { data } = await http.post('/sign', { address: clientA.address });
    const signature = data.signature;

    await expect(NefturiansClientA.publicMint(1, signature, {
      value: price.sub(1)
    })).to.be.revertedWith(errorMessages['You have to send the right amount']);
  });

  it('Need to sign for mint', async () => {
    const message = ethers.utils.solidityKeccak256(['address', 'uint256'], [clientA.address, 1]);
    const signature = await clientA.signMessage(message);

    await expect(NefturiansClientA.publicMint(1, signature, {
      value: price
    })).to.be.revertedWith(errorMessages['This operation has not been signed']);
  });

  it('Cannot mint if you send too much money', async () => {
    const initialBalance = await NefturiansClientA.balanceOf(clientA.address);

    const balanceDiff = await runAndGetBalance(NefturiansAdmin.address, async () => {
      const response = await http.post('/sign', { address: clientA.address });
      const signed = response.data.signature;

      await expect(NefturiansClientA.publicMint(1, signed, {
        value: price.add(1)
      })).to.be.revertedWith(errorMessages['You have to send the right amount']);
    });
    await expect(await NefturiansClientA.balanceOf(clientA.address) - initialBalance).to.equal(0);
    await expect(balanceDiff).to.equal(0);
  });

  it('Can mint 2', async () => {
    const initialBalance = await NefturiansClientA.balanceOf(clientA.address);

    const balanceDiff = await runAndGetBalance(NefturiansAdmin.address, async () => {
      const response = await http.post('/sign', { address: clientA.address });
      const signed = response.data.signature;

      const tx = await NefturiansClientA.publicMint(2, signed, {
        value: price.mul(2)
      });
      const details = await tx.wait();
      const events = details.events.filter(e => e.event === 'Transfer');
      await expect(events.length).to.equal(2);
      for (let i = 0; i < events.length; i++) {
        const {
          from,
          to,
          tokenId
        } = events[i].args;
        await expect(parseInt(from, 16)).to.equal(0);
        await expect(to).to.equal(clientA.address);
        await expect(tokenId).to.equal(counter + i);
      }
      counter += events.length;
    });

    await expect(await NefturiansClientA.balanceOf(clientA.address) - initialBalance).to.be.equal(2);
    await expect(balanceDiff).to.equal(price.mul(2));
  });

  it('Can mint 3', async () => {
    const initialBalance = await NefturiansClientB.balanceOf(clientB.address);

    const balanceDiff = await runAndGetBalance(NefturiansAdmin.address, async () => {
      const response = await http.post('/sign', { address: clientB.address });
      const signed = response.data.signature;

      const tx = await NefturiansClientB.publicMint(3, signed, {
        value: price.mul(3)
      });
      const details = await tx.wait();
      const events = details.events.filter(e => e.event === 'Transfer');
      await expect(events.length).to.equal(3);
      for (let i = 0; i < events.length; i++) {
        const {
          from,
          to,
          tokenId
        } = events[i].args;
        await expect(parseInt(from, 16)).to.equal(0);
        await expect(to).to.equal(clientB.address);
        await expect(tokenId).to.equal(counter + i);
      }
      counter += events.length;
    });

    await expect(await NefturiansClientB.balanceOf(clientB.address) - initialBalance).to.be.equal(3);
    await expect(balanceDiff).to.equal(price.mul(3));
  });

  it('Can mint 4', async () => {
    const initialBalance = await NefturiansClientC.balanceOf(clientC.address);

    const balanceDiff = await runAndGetBalance(NefturiansAdmin.address, async () => {
      const response = await http.post('/sign', { address: clientC.address });
      const signed = response.data.signature;

      const tx = await NefturiansClientC.publicMint(4, signed, {
        value: price.mul(4)
      });
      const details = await tx.wait();
      const events = details.events.filter(e => e.event === 'Transfer');
      await expect(events.length).to.equal(4);
      for (let i = 0; i < events.length; i++) {
        const {
          from,
          to,
          tokenId
        } = events[i].args;
        await expect(parseInt(from, 16)).to.equal(0);
        await expect(to).to.equal(clientC.address);
        await expect(tokenId).to.equal(counter + i);
      }
      counter += events.length;
    });

    await expect(await NefturiansClientC.balanceOf(clientC.address) - initialBalance).to.be.equal(4);
    await expect(balanceDiff).to.equal(price.mul(4));
  });

  it('Can mint 5', async () => {
    const initialBalance = await NefturiansClientD.balanceOf(clientD.address);

    const balanceDiff = await runAndGetBalance(NefturiansAdmin.address, async () => {
      const response = await http.post('/sign', { address: clientD.address });
      const signed = response.data.signature;

      const tx = await NefturiansClientD.publicMint(5, signed, {
        value: price.mul(5)
      });
      const details = await tx.wait();
      const events = details.events.filter(e => e.event === 'Transfer');
      await expect(events.length).to.equal(5);
      for (let i = 0; i < events.length; i++) {
        const {
          from,
          to,
          tokenId
        } = events[i].args;
        await expect(parseInt(from, 16)).to.equal(0);
        await expect(to).to.equal(clientD.address);
        await expect(tokenId).to.equal(counter + i);
      }
      counter += events.length;
    });

    await expect(await NefturiansClientD.balanceOf(clientD.address) - initialBalance).to.be.equal(5);
    await expect(balanceDiff).to.equal(price.mul(5));
  });

  it("Can't mint 6", async () => {
    const response = await http.post('/sign', { address: clientC.address });
    const signed = response.data.signature;

    await expect(NefturiansClientC.publicMint(6, signed, {
      value: price
    })).to.be.revertedWith(errorMessages['Mint quantity too high']);
  });

  it('Mints multiple times with the updated signature', async () => {
    let response = await http.post('/sign', { address: clientE.address });
    let signed = response.data.signature;
    await NefturiansClientE.publicMint(1, signed, {
      value: price
    });

    await expect(NefturiansClientE.publicMint(1, signed, {
      value: price
    })).to.be.revertedWith(errorMessages['This operation has not been signed']);

    response = await http.post('/sign', { address: clientE.address });
    signed = response.data.signature;
    await NefturiansClientE.publicMint(1, signed, {
      value: price
    });

    response = await http.post('/sign', { address: clientE.address });
    signed = response.data.signature;
    await NefturiansClientE.publicMint(1, signed, {
      value: price
    });
  });

  // ############
  // Retrieve funds
  // ############

  it('Can retrieve funds', async () => {
    const initialBalances = [
      await ethers.provider.getBalance(signers[3].address),
      await ethers.provider.getBalance(signers[4].address),
      await ethers.provider.getBalance(signers[5].address),
      await ethers.provider.getBalance(signers[6].address),
      await ethers.provider.getBalance(signers[7].address),
      await ethers.provider.getBalance(signers[8].address),
      await ethers.provider.getBalance(signers[9].address)
    ];

    const initialBalanceContract = await ethers.provider.getBalance(NefturiansClientA.address);

    await expect(NefturiansDeployer.withdraw(signers[2].address)).to.be.revertedWith(errorMessages['You have no shares in the project']);

    const _shares = [920, 15, 15, 15, 15, 10, 10];

    for (let index = 0; index < _shares.length; index++) {
      await NefturiansDeployer.withdraw(signers[index + 3].address);
      await expect(await ethers.provider.getBalance(signers[index + 3].address)).to.be.equal(initialBalances[index].add(initialBalanceContract.mul(_shares[index]).div(1000)));
    }

    const finalBalanceContract = await ethers.provider.getBalance(NefturiansClientA.address);
    await expect(finalBalanceContract).to.be.equal(0);
  });
});

describe('Artifacts', () => {
  let NefturiansAdmin;
  let NefturiansClientA;
  let NefturiansClientB;
  let NefturiansDeployer;
  let NefturiansData;
  let NefturiansArtifactsAdmin;
  let ArtifactsClientA;
  let ArtifactsClientB;
  let ArtifactsClientC;

  let signers;
  let deployer;
  let http;
  let clientA;
  let clientB;
  let clientC;
  let price;

  before(async () => {
    signers = await ethers.getSigners();

    deployer = signers[0];
    clientA = signers[1];
    clientB = signers[2];
    clientC = signers[3];

    const {
      nefturians,
      artifacts,
      data
    } = await deployNefturians();
    NefturiansAdmin = nefturians;
    NefturiansArtifactsAdmin = artifacts;
    NefturiansData = data;
    price = await NefturiansAdmin.getMintingPrice();

    NefturiansClientA = NefturiansAdmin.connect(clientA);
    NefturiansClientB = NefturiansAdmin.connect(clientB);

    ArtifactsClientA = NefturiansArtifactsAdmin.connect(clientA);
    ArtifactsClientB = NefturiansArtifactsAdmin.connect(clientB);
    ArtifactsClientC = NefturiansArtifactsAdmin.connect(clientC);

    NefturiansDeployer = NefturiansAdmin.connect(deployer);

    http = axios.create({
      baseURL: process.env.API_URL
    });

    let response = await http.post('/contract', {
      address: NefturiansDeployer.address
    }).catch(e => console.log(`POST /contract: ${e.message}`));
    await expect(response.data.address).to.equal(NefturiansDeployer.address);
    await NefturiansAdmin.setPresaleStart(Math.floor(Date.now() / 1000));
    response = await http.get('/whitelist/root');
    await NefturiansDeployer.setMerkleRoot(response.data.root);
  });

  // ############
  // Artifacts
  // ############

  it('Mints and farms eggs', async () => {
    const response = await http.post('/whitelist', { address: clientA.address });
    const merkleProof = response.data.merkleProof;
    const tx = await NefturiansClientA.whitelistMint(1, merkleProof, {
      value: price
    });
    const receipt = await tx.wait();
    const transferEvent = receipt.events.find(e => e.event === 'Transfer');
    const { tokenId } = transferEvent.args;
    await expect(await NefturiansClientA.ownerOf(tokenId)).to.equal(clientA.address);
    const nbTicketsClientA = await ArtifactsClientA.balanceOf(clientA.address, 0);
    const nbTicketsClientB = await ArtifactsClientB.balanceOf(clientB.address, 0);
    await expect(nbTicketsClientA).to.be.equal(0);
    await expect(nbTicketsClientB).to.be.equal(0);

    await NefturiansClientB.setApprovalForAll(deployer.address, true);
    await NefturiansClientA.setApprovalForAll(deployer.address, true);

    for (let i = 0; i < 25; i++) {
      const from = (i & 1) ? clientB : clientA;
      const to = (i & 1) ? clientA : clientB;
      await NefturiansDeployer['safeTransferFrom(address,address,uint256)'](from.address, to.address, tokenId);
      await expect(await NefturiansDeployer.ownerOf(tokenId)).to.equal(to.address);
    }

    await expect(await ArtifactsClientA.balanceOf(clientA.address, tokenId)).to.be.equal(12);
    await expect(await ArtifactsClientB.balanceOf(clientB.address, tokenId)).to.be.equal(13);
  });

  it('Cant claim artifact if no artifacts created', async () => {
    await ArtifactsClientA.stake({
      value: ethers.utils.parseEther('0.1')
    });

    const userSeed = '0xffffdddd';
    const serverSeed = userSeed;

    const message = ethers.utils.solidityKeccak256(
      ['bytes4'],
      [userSeed]
    );
    const signature = await clientA.signMessage(ethers.utils.arrayify(message));

    await expect(NefturiansArtifactsAdmin.claimArtifact(
      1,
      userSeed,
      serverSeed,
      signature
    )).to.be.revertedWith(errorMessages['Division by zero']);
    await ArtifactsClientA.unstake();
  });

  it('Can stake', async () => {
    await ArtifactsClientA.stake({
      value: ethers.utils.parseEther('0.1')
    });
  });

  // pas d'event, a checker
  it('Can unstake', async () => {
    const previousBalance = await ethers.provider.getBalance(clientA.address);
    const tx = await ArtifactsClientA.unstake();
    const receipt = await tx.wait();
    const gasUsed = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);
    await expect(await ethers.provider.getBalance(clientA.address)).to.be.equal(previousBalance.add(ethers.utils.parseEther('0.1')).sub(gasUsed));
    await expect(await ethers.provider.getBalance(NefturiansArtifactsAdmin.address)).to.be.equal(0);
  });

  it('Cant claim artifact if no eggs', async () => {
    await ArtifactsClientC.stake({
      value: ethers.utils.parseEther('0.1')
    });

    const userSeed = '0xffffeddd';
    const serverSeed = userSeed;

    const message = ethers.utils.solidityKeccak256(
      ['bytes4'],
      [userSeed]
    );
    const signature = await clientC.signMessage(ethers.utils.arrayify(message));

    await expect(NefturiansArtifactsAdmin.claimArtifact(
      10,
      userSeed,
      serverSeed,
      signature
    )).to.be.revertedWith(errorMessages['You have no eggs']);
  });

  it('Cant claim artifact if no stake', async () => {
    const userSeed = '0xffffdddd';
    const serverSeed = userSeed;

    const message = ethers.utils.solidityKeccak256(
      ['bytes4'],
      [userSeed]
    );
    const signature = await clientA.signMessage(ethers.utils.arrayify(message));

    await expect(NefturiansArtifactsAdmin.claimArtifact(
      1,
      userSeed,
      serverSeed,
      signature
    )).to.be.revertedWith(errorMessages['Your stake does not cover the gas price']);
  });

  it('Can create all artifacts', async () => {
    await NefturiansArtifactsAdmin.addRareItem(0, 1, false);
    await NefturiansArtifactsAdmin.addRareItem(1, 1, false);
    await NefturiansArtifactsAdmin.addRareItem(2, 1, true);
    await NefturiansArtifactsAdmin.addRareItem(3, 1, false);
  });

  it('Can claim artifact', async () => {
    await ArtifactsClientA.stake({
      value: ethers.utils.parseEther('0.1')
    });

    const userSeed = '0xffffdddd';
    const serverSeed = userSeed;

    const message = ethers.utils.solidityKeccak256(
      ['bytes4'],
      [userSeed]
    );
    const signature = await clientA.signMessage(ethers.utils.arrayify(message));

    await NefturiansArtifactsAdmin.claimArtifact(
      1,
      userSeed,
      serverSeed,
      signature
    );
  });

  it('Can claim 5 artifact', async () => {
    await ArtifactsClientA.stake({
      value: ethers.utils.parseEther('0.1')
    });

    const userSeed = '0xffffeddd';
    const serverSeed = userSeed;

    const message = ethers.utils.solidityKeccak256(
      ['bytes4'],
      [userSeed]
    );
    const signature = await clientA.signMessage(ethers.utils.arrayify(message));

    const tx = await NefturiansArtifactsAdmin.claimArtifact(
      5,
      userSeed,
      serverSeed,
      signature
    );
    const receipt = await tx.wait();
    const mintEvents = receipt.events.filter(e => {
      const from = parseInt(e.args.from, 16);
      return from === 0;
    });
    await expect(mintEvents.length).to.be.equal(5);

    await expect(
      (await ArtifactsClientA.balanceOf(clientA.address, 1)).add(
        (await ArtifactsClientA.balanceOf(clientA.address, 2)).add(
          (await ArtifactsClientA.balanceOf(clientA.address, 3)).add(
            await ArtifactsClientA.balanceOf(clientA.address, 4)
          )
        )
      )
    ).to.be.equal(6);
  });

  it('Can get common artifact', async () => {
    const initialBalance = await NefturiansArtifactsAdmin.balanceOf(clientA.address, 1);
    await ArtifactsClientA.stake({
      value: ethers.utils.parseEther('0.1')
    });
    const seed = '0x00000004';
    const signature = await clientA.signMessage(ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(
        ['bytes4'],
        [seed]
      )
    ));

    const tx = await NefturiansArtifactsAdmin.claimArtifact(
      1,
      seed,
      seed,
      signature
    );
    const receipt = await tx.wait();
    const mintEvent = receipt.events.find(e => {
      const from = parseInt(e.args.from, 16);
      return from === 0;
    });
    await expect(mintEvent.args.id).to.be.equal(1);
    await expect(await NefturiansArtifactsAdmin.balanceOf(clientA.address, 1)).to.be.equal(initialBalance.add(1));
  });

  it('Can get power artifact', async () => {
    const initialBalance = await NefturiansArtifactsAdmin.balanceOf(clientA.address, 2);
    await ArtifactsClientA.stake({
      value: ethers.utils.parseEther('0.1')
    });
    const seed = '0x00000005';
    const signature = await clientA.signMessage(ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(
        ['bytes4'],
        [seed]
      )
    ));

    const tx = await NefturiansArtifactsAdmin.claimArtifact(
      1,
      seed,
      seed,
      signature
    );
    const receipt = await tx.wait();
    const mintEvent = receipt.events.find(e => {
      const from = parseInt(e.args.from, 16);
      return from === 0;
    });
    await expect(mintEvent.args.id).to.be.equal(2);
    await expect(await NefturiansArtifactsAdmin.balanceOf(clientA.address, 2)).to.be.equal(initialBalance.add(1));
  });

  it('Can get rare artifact', async () => {
    const initialBalance = await NefturiansArtifactsAdmin.balanceOf(clientA.address, 3);
    await ArtifactsClientA.stake({
      value: ethers.utils.parseEther('0.1')
    });
    const seed = '0x00000006';
    const signature = await clientA.signMessage(ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(
        ['bytes4'],
        [seed]
      )
    ));

    const tx = await NefturiansArtifactsAdmin.claimArtifact(
      1,
      seed,
      seed,
      signature
    );
    const receipt = await tx.wait();
    const mintEvent = receipt.events.find(e => {
      const from = parseInt(e.args.from, 16);
      return from === 0;
    });
    await expect(mintEvent.args.id).to.be.equal(3);
    await expect(await NefturiansArtifactsAdmin.balanceOf(clientA.address, 3)).to.be.equal(initialBalance.add(1));
  });

  it('Can get legendary artifact', async () => {
    const initialBalance = await NefturiansArtifactsAdmin.balanceOf(clientA.address, 4);
    await ArtifactsClientA.stake({
      value: ethers.utils.parseEther('0.1')
    });
    const seed = '0x00000001';
    const signature = await clientA.signMessage(ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(
        ['bytes4'],
        [seed]
      )
    ));

    const tx = await NefturiansArtifactsAdmin.claimArtifact(
      1,
      seed,
      seed,
      signature
    );
    const receipt = await tx.wait();
    const mintEvent = receipt.events.find(e => {
      const from = parseInt(e.args.from, 16);
      return from === 0;
    });
    await expect(mintEvent.args.id).to.be.equal(4);
    await expect(await NefturiansArtifactsAdmin.balanceOf(clientA.address, 4)).to.be.equal(initialBalance.add(1));
  });

  it('Cant claim artifact if not DEFAULT_ADMIN_ROLE', async () => {
    await ArtifactsClientA.stake({
      value: ethers.utils.parseEther('0.1')
    });

    const userSeed = '0xffffdddd';
    const serverSeed = userSeed;

    const message = ethers.utils.solidityKeccak256(
      ['bytes4'],
      [userSeed]
    );
    const signature = await clientA.signMessage(ethers.utils.arrayify(message));

    await expect(ArtifactsClientA.claimArtifact(
      10,
      userSeed,
      serverSeed,
      signature
    )).to.be.revertedWith(errorMessages['You dont have required role']);
  });

  it('Gets back staked amount when claim', async () => {
    await ArtifactsClientA.unstake();

    await ArtifactsClientA.stake({
      value: ethers.utils.parseEther('0.1')
    });

    const userSeed = '0xffffdddd';
    const serverSeed = userSeed;

    const message = ethers.utils.solidityKeccak256(
      ['bytes4'],
      [userSeed]
    );
    const signature = await clientA.signMessage(ethers.utils.arrayify(message));

    await NefturiansArtifactsAdmin.claimArtifact(
      1,
      userSeed,
      serverSeed,
      signature
    );
  });

  it('Can add common artifact', async () => {
    NefturiansArtifactsAdmin.addRareItem(0, 1, true);
  });

  it('Can add rare artifact', async () => {
    NefturiansArtifactsAdmin.addRareItem(0, 3, false);
  });

  it('Can add legendary artifact', async () => {
    NefturiansArtifactsAdmin.addRareItem(0, 4, false);
  });

  it('Cant mint batch when not minter role', async () => {
    await expect(ArtifactsClientA.mintBatch(clientA.address, [0, 1, 2, 3], [2, 5, 4, 1], 0)).to.be.revertedWith(errorMessages['You dont have required role']);
  });

  it('Can mint batch when minter role', async () => {
    const initialBalances = [];

    const tokenIds = [0, 1, 2, 3];
    const tokenCounts = [2, 5, 4, 1];

    for (let index = 0; index < tokenIds.length; index++) {
      initialBalances.push(await NefturiansArtifactsAdmin.balanceOf(clientA.address, tokenIds[index]));
    }

    const tx = await NefturiansArtifactsAdmin.mintBatch(clientA.address, tokenIds, tokenCounts, 0);
    const receipt = await tx.wait();
    const mintEvent = receipt.events.find(e => {
      const from = parseInt(e.args.from, 16);
      return from === 0;
    });
    for (let i = 0; i < tokenIds.length; i++) {
      await expect(mintEvent.args.ids[i]).to.be.equal(tokenIds[i]);
      await expect(await NefturiansArtifactsAdmin.balanceOf(clientA.address, tokenIds[i])).to.be.equal(initialBalances[i].add(tokenCounts[i]));
    }
  });

  it('Cant mint with signature if signature is incorrect', async () => {
    const response = await http.post('/signArtifact', { address: clientB.address, tokenId: 0, quantity: 3 });
    const signed = response.data.signature;

    await expect(ArtifactsClientA.mintWithSignature(0, 3, signed)).to.be.revertedWith(errorMessages['This operation has not been signed']);
  });

  it('Can mint with signature if signature is correct', async () => {
    const initialBalance = await ArtifactsClientA.balanceOf(clientA.address, 0);

    const response = await http.post('/signArtifact', { address: clientA.address, tokenId: 0, quantity: 3 });
    const signed = response.data.signature;

    const transaction = await ArtifactsClientA.mintWithSignature(0, 3, signed);
    const details = await transaction.wait();
    const event = details.events.find(e => e.event === 'TransferSingle');
    const {
      from,
      to,
      id,
      value
    } = event.args;
    await expect(parseInt(from, 16)).to.equal(0);
    await expect(to).to.equal(clientA.address);
    await expect(id).to.equal(0);
    await expect(value).to.equal(3);

    await expect(await ArtifactsClientA.balanceOf(clientA.address, 0) - initialBalance).to.equal(3);
  });

  it('Mints multiple times with the updated signature', async () => {
    let response = await http.post('/signArtifact', { address: clientA.address, tokenId: 0, quantity: 3 });
    let signed = response.data.signature;

    await ArtifactsClientA.mintWithSignature(0, 3, signed);
    await expect(ArtifactsClientA.mintWithSignature(0, 3, signed)).to.be.revertedWith(errorMessages['This operation has not been signed']);

    response = await http.post('/signArtifact', { address: clientA.address, tokenId: 1, quantity: 1 });
    signed = response.data.signature;

    await ArtifactsClientA.mintWithSignature(1, 1, signed);

    response = await http.post('/signArtifact', { address: clientA.address, tokenId: 2, quantity: 10 });
    signed = response.data.signature;

    await ArtifactsClientA.mintWithSignature(2, 10, signed);
  });

  it('Cant update odds if not ADMIN', async () => {
    await expect(ArtifactsClientA.updateOdds([75000, 90000, 99000, 100000])).to.be.revertedWith(errorMessages['You dont have required role']);
  });

  it('Cant update odds if wrong format', async () => {
    await expect(NefturiansArtifactsAdmin.updateOdds([75000, 99000, 100000])).to.be.revertedWith(errorMessages['Wrong format for array']);
    await expect(NefturiansArtifactsAdmin.updateOdds([75000, 90000, 89000, 100000])).to.be.revertedWith(errorMessages['Wrong format for array']);
    await expect(NefturiansArtifactsAdmin.updateOdds([75000, 90000, 99000, 100001])).to.be.revertedWith(errorMessages['Wrong format for array']);
  });

  it('Can update odds if ADMIN', async () => {
    const transaction = await NefturiansArtifactsAdmin.updateOdds([75000, 86000, 99000, 100000]);
    const details = await transaction.wait();
    const event = details.events.find(e => e.event === 'UpdateOdds');
    const {
      oldOdds,
      newOdds
    } = event.args;

    const supposedOldOdds = [70000, 90000, 99000, 100000];
    const supposedNewOdds = [75000, 86000, 99000, 100000];

    for (let index = 0; index < oldOdds.length; index++) {
      expect(oldOdds[index]).to.equal(supposedOldOdds[index]);
      expect(newOdds[index]).to.equal(supposedNewOdds[index]);
    }

    const initialBalance = await NefturiansArtifactsAdmin.balanceOf(clientA.address, 3);
    await ArtifactsClientA.stake({
      value: ethers.utils.parseEther('0.1')
    });
    const seed = '0x00000005';
    const signature = await clientA.signMessage(ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(
        ['bytes4'],
        [seed]
      )
    ));

    const tx = await NefturiansArtifactsAdmin.claimArtifact(
      1,
      seed,
      seed,
      signature
    );
    const receipt = await tx.wait();
    const mintEvent = receipt.events.find(e => {
      const from = parseInt(e.args.from, 16);
      return from === 0;
    });
    await expect(mintEvent.args.id).to.be.equal(3);
    await expect(await NefturiansArtifactsAdmin.balanceOf(clientA.address, 3)).to.be.equal(initialBalance.add(1));
  });

  it('Cant use non consumable Artifact', async () => {
    const previousBalance = await ArtifactsClientA.balanceOf(clientA.address, 1);

    expect(previousBalance.toNumber()).to.be.greaterThanOrEqual(2);
    await expect(ArtifactsClientA.useArtifact(1, 2)).to.be.revertedWith(errorMessages['Item not consummable']);

    expect(await ArtifactsClientA.balanceOf(clientA.address, 1)).to.be.equal(previousBalance);
  });

  it('Can use consumable Artifact', async () => {
    const previousBalance = await ArtifactsClientA.balanceOf(clientA.address, 3);

    expect(previousBalance.toNumber()).to.be.greaterThanOrEqual(2);
    const transaction = await ArtifactsClientA.useArtifact(3, 2);
    const details = await transaction.wait();
    const event = details.events.find(e => e.event === 'UseArtifact');
    const {
      tokenId,
      quantity
    } = event.args;
    expect(tokenId).to.equal(3);
    expect(quantity).to.equal(2);

    expect(await ArtifactsClientA.balanceOf(clientA.address, 3)).to.be.equal(previousBalance.sub(2));
  });

  it('Cant use Artifact if not enough artifacts', async () => {
    const previousBalance = await ArtifactsClientA.balanceOf(clientA.address, 3);

    await expect(ArtifactsClientA.useArtifact(3, 100)).to.be.revertedWith(errorMessages['Not enough artifacts']);

    expect(await ArtifactsClientA.balanceOf(clientA.address, 3)).to.be.equal(previousBalance);
  });

  // it('Can use multiple artifacts', async () => {
  //   let previousBalances;
  //   const supposedTokenIds = [3, 5];
  //   const supposedQuantities = [1, 2];

  //   for (let index = 0; index < supposedTokenIds.length; index++) {
  //     previousBalances.push(await ArtifactsClientA.balanceOf(clientA.address, supposedTokenIds[index]));
  //   }

  //   expect(previousBalance.toNumber()).to.be.greaterThanOrEqual(2);
  //   const transaction = await ArtifactsClientA.useArtifacts(supposedTokenIds, supposedQuantities);
  //   const details = await transaction.wait();
  //   const event = details.events.find(e => e.event === 'UseArtifacts');
  //   const {
  //     tokenIds,
  //     quantities
  //   } = event.args;
  //   for (let index = 0; index < tokenIds.length; index++) {
  //     expect(tokenIds[index]).to.equal(supposedTokenIds[index]);
  //     expect(quantities[index]).to.equal(supposedQuantities[index]);
  //     expect(await ArtifactsClientA.balanceOf(clientA.address, tokenIds[index])).to.be.equal(previousBalance.sub(quantities[index]));
  //   }
  // });

  it('Can set URI', async () => {
    await NefturiansArtifactsAdmin.setURI(0, 'https://api.nefturians.io/artifacts/0');
    await NefturiansArtifactsAdmin.setURI(1, 'https://api.nefturians.io/artifacts/1');

    expect(await ArtifactsClientA.uri(0)).to.equal('https://api.nefturians.io/artifacts/0');
  });

  // #########
  // metadata
  // #########

  it('Can get metadata', async () => {
    await expect(await NefturiansClientA.getMetadata(0)).to.be.equal('');
  });

  it("Can't set metadata of not owned token", async () => {
    const dataClientA = NefturiansData.connect(clientA);
    const tokenId = 0;
    await expect(await NefturiansClientB.ownerOf(tokenId)).to.be.equal(clientB.address);
    const newMetadataKey = 0;
    const newMetadataValue = 'evarian';
    const response = await http.post('/sign-metadata', { address: clientB.address, tokenId: tokenId, metadataKey: newMetadataKey, metadataValue: newMetadataValue });
    const signed = response.data.signature;

    await expect(dataClientA.setMetadata(tokenId, newMetadataKey, newMetadataValue, signed)).to.be.revertedWith(errorMessages['Not authorized to update metadata']);
  });

  it('Can set metadata of owned tokend if signature is correct', async () => {
    const dataClientB = NefturiansData.connect(clientB);
    const tokenId = 0;
    await expect(await NefturiansClientB.ownerOf(tokenId)).to.be.equal(clientB.address);
    const newMetadataKey = 0;
    const newMetadataValue = 'evarian';
    const response = await http.post('/sign-metadata', {
      address: clientB.address,
      tokenId: tokenId,
      metadataKey: newMetadataKey,
      metadataValue: newMetadataValue
    });
    const signed = response.data.signature;

    await dataClientB.setMetadata(tokenId, newMetadataKey, newMetadataValue, signed);

    await expect(await dataClientB.getMetadata(tokenId)).to.be.equal('name=evarian\n');
  });

  it('Can update metadata of owned tokend if signature is correct', async () => {
    const dataClientB = NefturiansData.connect(clientB);
    const tokenId = 0;
    await expect(await NefturiansClientB.ownerOf(tokenId)).to.be.equal(clientB.address);
    const newMetadataKey = 0;
    const newMetadataValue = 'newName';
    const response = await http.post('/sign-metadata', {
      address: clientB.address,
      tokenId: tokenId,
      metadataKey: newMetadataKey,
      metadataValue: newMetadataValue
    });
    const signed = response.data.signature;

    await dataClientB.setMetadata(tokenId, newMetadataKey, newMetadataValue, signed);

    await expect(await dataClientB.getMetadata(tokenId)).to.be.equal('name=newName\n');
  });

  it("Can't set metadata of owned token if signature is signed with different metadata", async () => {
    const dataClientB = NefturiansData.connect(clientB);
    const tokenId = 0;
    await expect(await NefturiansClientB.ownerOf(tokenId)).to.be.equal(clientB.address);
    const newMetadataKey = 0;
    const newMetadataValue = 'evarian';
    const response = await http.post('/sign-metadata', {
      address: clientB.address,
      tokenId: tokenId,
      metadataKey: newMetadataKey,
      metadataValue: newMetadataValue + 'cheating'
    });
    const signed = response.data.signature;

    await expect(dataClientB.setMetadata(tokenId, newMetadataKey, newMetadataValue, signed)).to.be.revertedWith(errorMessages['Not authorized to update metadata']);
  });

  it("Can't set attribute of not owned token", async () => {
    const dataClientA = NefturiansData.connect(clientA);
    const tokenId = 0;
    await expect(await NefturiansClientA.ownerOf(tokenId)).to.be.equal(clientB.address);
    const newMetadataKey = 0;
    const newMetadataValue = 'evarian';
    const response = await http.post('/sign-metadata', {
      address: clientA.address,
      tokenId: tokenId,
      metadataKey: newMetadataKey,
      metadataValue: newMetadataValue
    });
    const signed = response.data.signature;
    await expect(dataClientA.setAttributes(tokenId, [1], [3], signed)).to.be.revertedWith(errorMessages['Not authorized to update metadata']);
  });

  it("Can't set attributes of owned token if signature is signed with different attributes", async () => {
    const dataClientB = NefturiansData.connect(clientB);
    const tokenId = 0;
    await expect(await NefturiansClientB.ownerOf(tokenId)).to.be.equal(clientB.address);
    const attributeKeys = [1];
    const attributeValues = [5];
    const response = await http.post('/sign-attributes', { address: clientB.address, tokenId, attributeKeys, attributeValues });
    const signed = response.data.signature;
    attributeValues[0] += 1;

    await expect(dataClientB.setAttributes(tokenId, attributeKeys, attributeValues, signed)).to.be.revertedWith(errorMessages['Not authorized to update metadata']);
  });

  it('Can set attribute of owned tokend if signature is correct', async () => {
    const dataClientB = NefturiansData.connect(clientB);
    const tokenId = 0;
    await expect(await NefturiansClientB.ownerOf(tokenId)).to.be.equal(clientB.address);
    const attributeKeys = [1];
    const attributeValues = [5];
    const response = await http.post('/sign-attributes', { address: clientB.address, tokenId: tokenId, attributeKeys, attributeValues });
    const signed = response.data.signature;

    await dataClientB.setAttributes(tokenId, attributeKeys, attributeValues, signed);

    await expect(await NefturiansClientB.getMetadata(tokenId)).to.be.equal('name=newName\nstrength=5\n');
  });

  // ############
  // metadata DAO
  // ############

  it('Can set metadata through DAO', async () => {
    const dataDao = NefturiansData.connect(signers[0]);
    const tokenId = 0;
    const owner = await NefturiansClientA.ownerOf(tokenId);
    const nonce = await NefturiansClientA.getNonce(owner);
    await expect(owner).to.be.equal(clientB.address);
    const newMetadataKey = 0;
    const newMetadataValue = 'Cyberianos';
    const message = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'uint256', 'uint256', 'string'],
      [clientB.address, nonce, tokenId, newMetadataKey, newMetadataValue]
    );
    const signature = clientB.signMessage(ethers.utils.arrayify(message));

    await dataDao.setMetadata(tokenId, newMetadataKey, newMetadataValue, signature);
    await expect(await NefturiansClientA.getMetadata(tokenId)).to.be.equal('name=Cyberianos\nstrength=5\n');
  });

  it('Can set attributes through DAO', async () => {
    const dataDao = NefturiansData.connect(deployer);
    const tokenId = 0;
    const owner = await NefturiansClientA.ownerOf(tokenId);
    const nonce = await NefturiansClientA.getNonce(owner);
    await expect(owner).to.be.equal(clientB.address);
    const attributeKeys = [1];
    const attributeValues = [6];
    const message = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'uint256', 'uint256[]', 'uint256[]'],
      [clientB.address, nonce, tokenId, attributeKeys, attributeValues]
    );
    const signature = clientB.signMessage(ethers.utils.arrayify(message));

    await dataDao.setAttributes(tokenId, attributeKeys, attributeValues, signature);
    await expect(await NefturiansClientA.getMetadata(tokenId)).to.be.equal('name=Cyberianos\nstrength=6\n');
  });
});
