// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/security/Pausable.sol";
import "../libraries/ECDSALibrary.sol";
import "../libraries/MerkleProofLibrary.sol";
import "../interfaces/INefturians.sol";
import "../interfaces/INefturiansArtifact.sol";
import "../interfaces/INefturiansData.sol";
import "./AccessControl.sol";
import "./ERC721A.sol";
import "./NefturiansArtifact.sol";
import "./NefturiansData.sol";

/**********************************************************************************************************************/
/*                                                                                                                    */
/*                                                     Nefturians                                                     */
/*                                                                                                                    */
/*                     NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN                     */
/*                  NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN                  */
/*                NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN                */
/*              NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN              */
/*             NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN             */
/*            NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN            */
/*           NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN           */
/*           NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN           */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN...NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN........NNNNNNNNNNNNNNNNNNN.......NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNNN...........NNNNNNNNNNNNNNNN.........NNNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNN...............NNNNNNNNNNNN............NNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNN.................NNNNNNNNNNN.............NNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNN...................NNNNNNNNNNN..............NNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNN.....................NNNNNNNNNNN..............NNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNN.......................NNNNNNNNNNN..............NNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNN..........................NNNNNNNNNN..............NNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNN.............................NNNNNNNNNN.............NNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNN............NNNN...............NNNNNNNNNN.............NNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNN............NNNNNN...............NNNNNNNNNN.............NNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNN.............NNNNNNNN...............NNNNNNNNNN.............NNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNN.............NNNNNNNNNN..............NNNNNNNNNN............NNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNN.............NNNNNNNNNN..............NNNNNNNN.............NNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNN.............NNNNNNNNNN...............NNNNN.............NNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNN..............NNNNNNNNNN...............NNN.............NNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNN.............NNNNNNNNNN............................NNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNN..............NNNNNNNNN..........................NNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNN..............NNNNNNNNN........................NNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNN..............NNNNNNNNNN.....................NNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNN..............NNNNNNNNNNN..................NNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNN..............NNNNNNNNNNN................NNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNN...........NNNNNNNNNNNNN..............NNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.........NNNNNNNNNNNNNNNN...........NNNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.......NNNNNNNNNNNNNNNNNNN........NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.NNNNNNNNNNNNNNNNNNNNNNNNNN.NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*          NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN          */
/*           NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN           */
/*           NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN           */
/*            NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN            */
/*             NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN             */
/*               NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN               */
/*                 NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN                 */
/*                    NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN                     */
/*                                                                                                                    */
/*                                                                                                                    */
/*                                                                                                                    */
/**********************************************************************************************************************/

contract Nefturians is ERC721A, AccessControl, Pausable, INefturians {

  /**
   * Base URI for offchain metadata
   */
  string private _baseTokenURI;

  /**
   * Roles used for access control
   */
  bytes32 internal constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 internal constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  bytes32 internal constant DAO_ROLE = keccak256("DAO_ROLE");
  bytes32 internal constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
  bytes32 internal constant METADATA_ROLE = keccak256("METADATA_ROLE");
  bytes32 internal constant DATA_CONTRACT_ROLE = keccak256("DATA_CONTRACT_ROLE");
  bytes32 internal constant ARTIFACT_CONTRACT_ROLE = keccak256("ARTIFACT_CONTRACT_ROLE");
  bytes32 internal constant URI_ROLE = keccak256("URI_ROLE");

  /**
   * Minting rules and supplies
   */
  uint256 internal constant MAX_SUPPLY = 8001;
  uint256 internal constant TOKENS_RESERVED = 250;
  uint256 internal constant MINTING_PRICE = 0.15 ether;
  uint256 internal constant MAX_PUBLIC_MINT = 5;
  uint256 internal constant MAX_WHITELIST_MINT = 2;

  /**
   * Sale calendar
   */
  uint256 internal preSaleStartTimestamp = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe;
  uint256 internal publicSaleStartTimestamp = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

  /**
   * Minting state used to enforce aforementioned rules
   */
  uint256 internal reservedTokensMinted = 0;
  mapping(address => uint256) private nonces;
  mapping(address => uint256) public whitelistClaimed;
  mapping(address => uint256) public publicClaimed;

  /**
   * Root hash for the whitelist merkle tree
   */
  bytes32 public merkleRoot;

  /**
   * Payment distribution
   */
  uint256 internal totalShares = 1000;
  uint256 internal totalReleased;
  mapping(address => uint256) internal released;
  mapping(address => uint256) internal shares;

  /**
   * Side contracts
   */
  INefturianArtifact internal nefturiansArtifacts;
  INefturiansData internal nefturiansData;

  constructor() ERC721A("Nefturians", "NFTR") {
    nefturiansArtifacts = new NefturiansArtifact();
    nefturiansData = new NefturiansData();

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(MINTER_ROLE, msg.sender);
    _grantRole(PAUSER_ROLE, msg.sender);
    _grantRole(DAO_ROLE, msg.sender);
    _grantRole(SIGNER_ROLE, msg.sender);
    _grantRole(URI_ROLE, msg.sender);
    _grantRole(METADATA_ROLE, msg.sender);
    _grantRole(METADATA_ROLE, address(nefturiansData));
    _grantRole(METADATA_ROLE, address(nefturiansArtifacts));
    _grantRole(DATA_CONTRACT_ROLE, address(nefturiansData));
    _grantRole(ARTIFACT_CONTRACT_ROLE, address(nefturiansArtifacts));

    // Nefture wallet, Aris, Baptiste, Celim, Wafae, Mourad, Romain
    shares[0x90F79bf6EB2c4f870365E785982E1f101E93b906] = 920;
    shares[0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65] = 15;
    shares[0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc] = 15;
    shares[0x976EA74026E726554dB657fA54763abd0C3a0aa9] = 15;
    shares[0x14dC79964da2C08b23698B3D3cc7Ca32193d9955] = 15;
    shares[0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f] = 10;
    shares[0xa0Ee7A142d267C1f36714E4a8F75612F20a79720] = 10;
  }

  /**
   * Get the pinting price
   */
  function getMintingPrice() public pure returns (uint256) {
    return MINTING_PRICE;
  }

  /**
   * Get the address of the internally deployed NefturiansArtifact contract
   */
  function getArtifactContract() public view returns (address) {
    return address(nefturiansArtifacts);
  }

  /**
   * Get the address of the internally deployed NefturiansData contract
   */
  function getDataContract() public view returns (address) {
    return address(nefturiansData);
  }

  /**
   * Admin can move the presale start to avoid conflicting with NFT partners
   */
  function setPresaleStart(uint256 ts) public onlyRole(DEFAULT_ADMIN_ROLE) {
    preSaleStartTimestamp = ts;
  }

  /**
   * Admin can move the public sale start to avoid conflicting with NFT partners
   */
  function setPublicSaleStart(uint256 ts) public onlyRole(DEFAULT_ADMIN_ROLE) {
    publicSaleStartTimestamp = ts;
  }

  /**
   * Globally pauses minting
   */
  function pause() public onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * Globally unpauses minting
   */
  function unpause() public onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * Mint function for devs
   * @param to: address of receiver
   * @param quantity: number of tokens to mint
   *
   * Error messages:
   *  - N0 : "Maximum supply would be exceeded with this mint" (should never happen but better safe than sorry)
   *  - N15: "Reserve supply would be exceeded with this mint"
   */
  function safeMint(address to, uint256 quantity) public onlyRole(MINTER_ROLE)
  {
    require(quantity + totalSupply() <= MAX_SUPPLY, "N0");
    require(reservedTokensMinted + quantity <= TOKENS_RESERVED, "N15");
    reservedTokensMinted += quantity;
    _safeMint(to, quantity);
  }

  /**
   * Mint function for presale
   * @param quantity: uint256 - number of tokens to mint
   * @param merkleProof: serie of merkle hashes to prove whitelist
   *
   * Error messages:
   *  - N7 : "Presale has not started"
   *  - N8 : "Whitelist supply would be exceeded with this mint"
   *  - N9 : "The whitelist has not been initialized"
   *  - N5 : "You have to send the right amount"
   *  - N10: "Your max allocation would be exceeded with this mint"
   *  - N11: "Invalid proof of whitelist"
   */
  function whitelistMint(uint256 quantity, bytes32[] calldata merkleProof) public payable whenNotPaused {
    require(block.timestamp >= preSaleStartTimestamp, "N7");
    require(totalSupply() + quantity <= MAX_SUPPLY - TOKENS_RESERVED + reservedTokensMinted, "N8");
    require(merkleRoot != 0, "N9");
    require(msg.value >= MINTING_PRICE * quantity, "N5");
    require(whitelistClaimed[msg.sender] + quantity <= MAX_WHITELIST_MINT, "N10");
    bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
    require(MerkleProofLibrary.verify(merkleProof, merkleRoot, leaf), "N11");
    whitelistClaimed[msg.sender] += quantity;
    _safeMint(msg.sender, quantity);
    if (msg.value > MINTING_PRICE * quantity) {
      payable(msg.sender).transfer(msg.value - MINTING_PRICE * quantity);
    }
  }

  /**
   * Public mint function with requirement for signature from a SIGNER_ROLE
   * @param quantity: number of tokens to mint
   * @param signature: signature from a wallet with SIGNER_ROLE to authorize the mint
   *
   * Error messages:
   *  - N2 : "Public sale has not started yet"
   *  - N3 : "Public supply would be exceeded with this mint"
   *  - N4: "Mint quantity too high"
   *  - N5: "You have to send the right amount"
   *  - N6: "This operation has not been signed"
  */
  function publicMint(uint256 quantity, bytes calldata signature) public payable whenNotPaused {
    require(block.timestamp >= publicSaleStartTimestamp, "N2");
    require(quantity + totalSupply() <= MAX_SUPPLY - TOKENS_RESERVED + reservedTokensMinted, "N3");
    require(publicClaimed[msg.sender] + quantity <= MAX_PUBLIC_MINT, "N4");
    publicClaimed[msg.sender] += quantity;
    require(msg.value == MINTING_PRICE * quantity, "N5");
    uint256 nonce = nonces[msg.sender] + 1;
    require(hasRole(SIGNER_ROLE, ECDSALibrary.recover(abi.encodePacked(msg.sender, nonce), signature)), "N6");
    nonces[msg.sender] += 1;
    _safeMint(msg.sender, quantity);
  }

  /**
   * Define merkle root
   * @param newMerkleRoot: newly defined merkle root
   */
  function setMerkleRoot(bytes32 newMerkleRoot) public onlyRole(MINTER_ROLE) {
    merkleRoot = newMerkleRoot;
  }

  /**
   * Get the nonce of a particular address
   * @param minter: selected address from which to get the nonce
   */
  function getNonce(address minter) public view returns (uint256) {
    return nonces[minter] + 1;
  }

  /**
   * Increment the nonce
   * @param holder: address of the address for which to increnebnt the nonce
   */
  function incrementNonce(address holder) public onlyRole(METADATA_ROLE) {
    nonces[holder] += 1;
  }

  /**
   * Get the on chain metadata of a token
   * @param tokenId: id of the token from which to get the on chain metadata
   *
   * Error messages:
   *  - N12: "Token ID doesn't correspond to a minted token"
   */
  function getMetadata(uint256 tokenId) public view returns (string memory) {
    require(_exists(tokenId), "N12");
    return nefturiansData.getMetadata(tokenId);
  }

  /**
   * Add a new Metadata key
   * @param keyName: the name of the Metadata key
   */
  function addKey(string calldata keyName) public onlyRole(METADATA_ROLE) {
    nefturiansData.addKey(keyName);
  }


  /**
   * get the base URI of tokens
   */
  function _baseURI() internal view virtual override returns (string memory) {
    return _baseTokenURI;
  }

  /**
   * set the base URI to a new value
   * @param baseURI: new base URI to be pushed
   */
  function setBaseURI(string calldata baseURI) external onlyRole(URI_ROLE) {
    _baseTokenURI = baseURI;
  }

  /**
   * get full token URI of a selected token by tokenId
   * @param tokenId: token id from which to get token URI
   *
   * Error messages:
   *  - N12: "Token ID doesn't correspond to a minted token"
   */
  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
      require(_exists(tokenId), "N12");
      return string(abi.encodePacked(_baseTokenURI, StringsLibrary.toString(tokenId)));
  }

  /**
   * Withdraw contract balance to a shareholder proportionnaly to their share amount
   *
   * @param account: address of the shareholder
   *
   * Error messages:
   *  - N16: "You have no shares in the project"
   *  - N17: "All funds have already been sent"
   */
  function withdraw(address account) public {
    require(shares[account] > 0, "N16");
    uint256 totalReceived = address(this).balance + totalReleased;
    uint256 payment = (totalReceived * shares[account]) / totalShares - released[account];
    require(payment != 0, "N17");
    released[account] = released[account] + payment;
    totalReleased = totalReleased + payment;
    payable(account).transfer(payment);
  }

  /**
   * Mints an egg artifact for the buyer
   *
   * @param from: transferer's address
   * @param to: reveiver's address
   */
  function _beforeTokenTransfers(
    address from,
    address to
  ) internal override {
    if (from != address(0) && to != address(0)) {
      nefturiansArtifacts.giveTickets(to);
    }
  }
}
