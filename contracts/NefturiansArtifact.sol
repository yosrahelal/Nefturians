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

  /**
   * Roles for the access control
   * these roles are only checked against the parent contract's settings
   */
  bytes32 internal constant DAO_ROLE = keccak256("DAO_ROLE");
  bytes32 internal constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 internal constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
  bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

  /**
   * Custom URI for each token
   */
  mapping(uint256 => string) private _uris;

  /**
   * Odds of drawing artifacts based on their rarity level.
   *
   * Rarity levels go in this order:
   *  - odds[0] = common (for common equipment and basic consumables)
   *  - odds[1] = powerUp (consummables used to upgrades Nefturians stats)
   *  - odds[2] = rare (for rare equipment and powerful buffs consumables)
   *  - odds[3] = legendary (wait for it...)
   */
  uint256[] private odds = [70000, 90000, 99000, 100000];

  /**
   * Current tokenId count.
   * Starts at 1 because index 0 is reserved for eggs
   */
  uint256 private generalCount = 1;

  /**
   * Mapping Rarity + index from rarity to tokenIds.
   *
   * indexesByRarity[ rarityId ][ autoincremented index ] => tokenId
   * countByRarity = autoincremented indexes for each rarity level
   */
  mapping(uint256 => mapping(uint256 => uint256)) indexesByRarity;
  mapping(uint256 => uint256) countByRarity;

  /**
   * If token should be burned or equipped when used
   */
  mapping(uint256 => bool) consumable;

  /**
   * Ether pool to pay for the gas when a method needs to be called by our API
   */
  mapping(address => uint256) public stakes;

  /**
   * Parent contract: The ERC721N collection
   */
  INefturians internal nefturians;

  constructor() ERC1155("") {
    nefturians = INefturians(msg.sender);
    consumable[0] = true;
  }

  /**
   * Updated the odds of drawing artifacts based on their rarity level
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

  function addRareItem(uint256 rarity, uint256 quantity, bool isConsumable)
  public
  {
    require(nefturians.hasRole(MINTER_ROLE, msg.sender), "Missing role");
    for (uint256 i = 0; i < quantity; i++) {
      indexesByRarity[rarity][countByRarity[rarity] + i] = generalCount + i;
      consumable[generalCount + i] = isConsumable;
    }
    countByRarity[rarity] += quantity;
    generalCount += quantity;
  }

  function setURI(uint256 tokenId, string memory newuri) public {
    require(nefturians.hasRole(MINTER_ROLE, msg.sender), "Missing role");
    _setURI(tokenId, newuri);
  }

  // mint avec signature
  // IMPORTANT: est ce qu'on garde l'argument 'data' ? pour donner le tokenId a l'event ?
  function mintWithSignature(uint256 tokenId, uint256 quantity, bytes calldata signature)
  public
  {
    uint256 nonce = nefturians.getNonce(msg.sender);
    require(nefturians.hasRole(SIGNER_ROLE, ECDSALibrary.recover(abi.encodePacked(msg.sender, nonce, tokenId, quantity), signature)), "N6");
    nefturians.incrementNonce(msg.sender);
    _mint(msg.sender, tokenId, quantity, "");
  }

  // IMPORTANT: est ce qu'on garde l'argument 'data' ?
  function mintBatch(address to, uint256[] memory tokenIds, uint256[] memory amounts, bytes memory data)
  public
  {
    require(nefturians.hasRole(MINTER_ROLE, msg.sender), "AC0");
    _mintBatch(to, tokenIds, amounts, data);
  }

  function uri(uint256 tokenId) public view virtual override returns (string memory) {
    return _uris[tokenId];
  }

  function stake() public payable {
    stakes[msg.sender] += msg.value;
  }

  function unstake() public {
    require(stakes[msg.sender] > 0, "No stake");
    uint256 staked = stakes[msg.sender];
    stakes[msg.sender] = 0;
    payable(msg.sender).transfer(staked);
  }

  function giveTickets(address ticketAddress) override external onlyOwner {
    _mint(ticketAddress, 0, 1, "");
  }

  function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
  internal
  override(ERC1155, ERC1155Supply)
  {
    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  function _setURI(uint256 tokenId, string memory newuri) internal {
    _uris[tokenId] = newuri;
  }

  function claimArtifact(
    uint256 quantity,
    bytes4 userSeed,
    bytes4 serverSeed,
    bytes calldata signature
  ) public {
    require(nefturians.hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "AC0"); // IMPORTANT: est ce qu'on ferait pas un SIGNER_ROLE (API) ?
    address caller = ECDSALibrary.recover(abi.encodePacked(userSeed), signature);
    require(balanceOf(caller, 0) >= quantity, "NA00");
    require(stakes[caller] >= tx.gasprice, "NA01");
    _burn(caller, 0, quantity);
    uint256[] memory numbers = new uint256[](quantity);
    for (uint256 i = 0; i < quantity; i++) {
      uint256 salt = (i == 0) ? i : numbers[i - 1];
      numbers[i] = uint256(keccak256(abi.encodePacked(userSeed, serverSeed, salt)));
    }
    for (uint256 i = 0; i < quantity; i++) {
      distributeReward(caller, numbers[i]);
    }
    stakes[caller] -= tx.gasprice;
    require(address(this).balance > tx.gasprice, "balance too low");
    payable(msg.sender).transfer(tx.gasprice);
  }

  function distributeReward(address rewardee, uint256 ticket) internal {
    uint256 number = ticket % 100000;

    if (number < odds[0]) {
      require(countByRarity[0] != 0, "NA02");
      uint256 index = ticket % countByRarity[0];
      _mint(rewardee, indexesByRarity[0][index], 1, "");
    }
    else if (number < odds[1]) {
      require(countByRarity[1] != 0, "NA02");
      uint256 index = ticket % countByRarity[1];
      _mint(rewardee, indexesByRarity[1][index], 1, "");
    }
    else if (number < odds[2]) {
      require(countByRarity[2] != 0, "NA02");
      uint256 index = ticket % countByRarity[2];
      _mint(rewardee, indexesByRarity[2][index], 1, "");
    }
    else {
      require(countByRarity[3] != 0, "NA02");
      uint256 index = ticket % countByRarity[3];
      _mint(rewardee, indexesByRarity[3][index], 1, "");
    }
  }

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
}
