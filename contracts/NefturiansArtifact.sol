// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/ECDSALibrary.sol";
import "../interfaces/INefturiansArtifact.sol";
import "../interfaces/INefturians.sol";

contract NefturiansArtifact is ERC1155, Ownable, ERC1155Burnable, ERC1155Supply, INefturianArtifact {

  bytes32 internal constant DAO_ROLE = keccak256("DAO_ROLE");
  bytes32 internal constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 internal constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
  bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

  mapping(uint256 => string) private _uris;
  INefturians internal nefturians;

  // common => 0
  // power => 1
  // rare => 2
  // legendary => 3
  uint256[] private odds = [70000, 90000, 99000, 100000];

  // current maximum index
  uint256 private generalCount = 1;

  mapping(uint256 => mapping(uint256 => uint256)) private indexesByRarity;
  mapping(uint256 => uint256) private countByRarity;
  mapping(uint256 => bool) private consumable;

  mapping(address => uint256) public stakes;

  constructor() ERC1155("") {
    nefturians = INefturians(msg.sender);
    consumable[0] = true; // autre utilite pour les eggs ?
  }

  /**
   * updates odds for Artifacts
   * @param newOdds: new odds in increment order with last equal to 100000
   *
   * Error messages:
   *  - AC0: "You dont have required role"
   *  - NA03: "Wrong format for array"
   */
  function updateOdds(uint256[] calldata newOdds) 
  public 
  {
    require(nefturians.hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "AC0");
    require(newOdds.length == 4, "NA03");
    require(newOdds[3] == 100000, "NA03");
    require(
      newOdds[0] <= newOdds[1] &&
      newOdds[1] <= newOdds[2] &&
      newOdds[2] <= newOdds[3], "NA03");
    emit UpdateOdds(odds, newOdds);
    odds = newOdds;
  }

  /**
   * adds new artifact
   * @param rarity: rarity of the new artifact between 
   * @param quantity: quantity of artifacts to be added
   * @param isConsumable: are the artifacts consumable ? 
   *
   * Error messages:
   *  - NA07: "Rarity out of bounds"
   */
  function addRareItem(uint256 rarity, uint256 quantity, bool isConsumable) 
  public
  {
    require(rarity < 4 && rarity >= 0, "NA07");
    require(nefturians.hasRole(MINTER_ROLE, msg.sender), "Missing role");
    for (uint256 i = 0; i < quantity; i++) {
      indexesByRarity[rarity][countByRarity[rarity] + i] = generalCount + i;
      consumable[generalCount + i] = isConsumable;
    }
    countByRarity[rarity] += quantity;
    generalCount += quantity;
    emit AddRareItem(rarity, quantity, isConsumable);
  }

  /**
   * sets URI of givent token
   * @param tokenId: id of the token
   * @param newuri: new uri of token id
   *
   */
  function setURI(uint256 tokenId, string memory newuri) public {
    require(nefturians.hasRole(MINTER_ROLE, msg.sender), "Missing role");
    _setURI(tokenId, newuri);
  }

  /** 
   * mint token but only if signature from SIGNER_ROLE is provided
   * @param tokenId: id of the token
   * @param quantity: quantity to be minted
   * @param signature: signature of SIGNER_ROLE
   *
   */
  function mintWithSignature(uint256 tokenId, uint256 quantity, bytes calldata signature) 
  public 
  {
    uint256 nonce = nefturians.getNonce(msg.sender);
    require(nefturians.hasRole(SIGNER_ROLE, ECDSALibrary.recover(abi.encodePacked(msg.sender, nonce, tokenId, quantity), signature)), "N6");
    nefturians.incrementNonce(msg.sender);
    _mint(msg.sender, tokenId, quantity, "");
  }

  /** 
   * mint batch of token only if MINTER_ROLE
   * @param to: address reveiving tokens
   * @param tokenIds: ids of the tokens to be minted
   * @param amounts: quantities of each token to be minted
   * @param data: arbitrary data for events
   *
   * Error messages:
   *  - AC0: "You dont have required role"
   */
  function mintBatch(address to, uint256[] memory tokenIds, uint256[] memory amounts, bytes memory data)
  public
  {
    require(nefturians.hasRole(MINTER_ROLE, msg.sender), "AC0");
    _mintBatch(to, tokenIds, amounts, data);
  }

  /** 
   * get uri of tokenId
   * @param tokenId: id of the token
   *
   */
  function uri(uint256 tokenId) public view virtual override returns (string memory) {
    return _uris[tokenId];
  }

  /**   
   * allows user to stake eth and allow admin to claim artifacts for him
   */
  function stake() public payable {
    stakes[msg.sender] += msg.value;
  }

  /**   
   * allows user to recover his staked funds
   */
  function unstake() public {
    require(stakes[msg.sender] > 0, "No stake");
    uint256 staked = stakes[msg.sender];
    stakes[msg.sender] = 0;
    payable(msg.sender).transfer(staked);
  }

  /**   
   * allows an owner contract to mint tickets to address
   * @param ticketAddress: address reveiving token
   */
  function giveTickets(address ticketAddress) override external onlyOwner {
    _mint(ticketAddress, 0, 1, "");
  }

  /**   
   * internal function to set URI of token
   * @param tokenId: id of the token
   * @param newuri: new uri of token id
   */
  function _setURI(uint256 tokenId, string memory newuri) internal {
    _uris[tokenId] = newuri;
  }

  /**   
   * function to claim an artifact with a ticket. One ticket gives one random artifact of verying rarity
   * @param quantity: quantity of tickets to use
   * @param userSeed: random seed from user
   * @param serverSeed: random seed from server
   * @param signature: signature of the token owner
   *
   * Error messages:
   *  - AC0: "You dont have required role"
   *  - NA00: "Your stake does not cover the gas price"
   *  - NA01: "Division by zero"
   *  - NA08: "Balance too low"
   */
  function claimArtifact(
    uint256 quantity,
    bytes4 userSeed,
    bytes4 serverSeed,
    bytes calldata signature
  ) public {
    require(nefturians.hasRole(SIGNER_ROLE, msg.sender), "AC0");
    address caller = ECDSALibrary.recover(abi.encodePacked(userSeed), signature);
    require(balanceOf(caller, 0) >= quantity, "NA00");
    require(stakes[caller] >= tx.gasprice, "NA01");
    _burn(caller, 0, quantity);
    for (uint256 i = 0; i < quantity; i++) {
      uint256 number = uint256(keccak256(abi.encodePacked(userSeed, serverSeed, i)));
      distributeReward(caller, number);
    }
    stakes[caller] -= tx.gasprice;
    require(address(this).balance > tx.gasprice, "NA08");
    payable(msg.sender).transfer(tx.gasprice);
  }

  /**   
   * mint reward based on odds and ticket number
   * @param rewardee: address of receiver
   * @param ticket: random number
   *
   * Error messages:
   *  - NA02: "Division by zero"
   */
  function distributeReward(address rewardee, uint256 ticket) internal {
    uint256 number = ticket % 100000;
    uint256 index;
    uint256 rarity;

    if (number < odds[0]) {
      require(countByRarity[0] != 0, "NA02");
      index = ticket % countByRarity[0];
      rarity = 0;
    }
    else if (number < odds[1]) {
      require(countByRarity[1] != 0, "NA02");
      index = ticket % countByRarity[1];
      rarity = 1;
    }
    else if (number < odds[2]) {
      require(countByRarity[2] != 0, "NA02");
      index = ticket % countByRarity[2];
      rarity = 2;
    }
    else {
      require(countByRarity[3] != 0, "NA02");
      index = ticket % countByRarity[3];
      rarity = 3;
    }
    _mint(rewardee, indexesByRarity[rarity][index], 1, "");
  }

  /**   
   * allow owner of consumable tokens to use them
   * @param tokenId: id of the token to be used
   * @param quantity: quantity to be used
   *
   * Error messages:
   *  - NA06: "Item not consummable"
   *  - NA04: "Not enough artifacts"
   */
  function useArtifact(uint256 tokenId, uint256 quantity) public {
    require(consumable[tokenId], "NA06");
    require(balanceOf(msg.sender, tokenId) >= quantity, "NA04");
    _burn(msg.sender, tokenId, quantity);
    emit UseArtifact(tokenId, quantity);
  }

  // The following functions are overrides required by Solidity.
  function supportsInterface(bytes4 interfaceId)
  public
  view
  override(ERC1155, IERC165)
  returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
  internal
  override(ERC1155, ERC1155Supply)
  {
    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }
}
