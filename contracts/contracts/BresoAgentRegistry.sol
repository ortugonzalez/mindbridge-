// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BresoAgentRegistry
 * @notice On-chain identity registry for BRESO AI wellness agents.
 *         Each registered agent receives a non-transferable NFT (ERC-8004 style)
 *         that anchors its identity on Celo. Activity is trackable via AgentScan.
 */
contract BresoAgentRegistry is ERC721, Ownable {
    uint256 private _nextTokenId;

    struct AgentIdentity {
        string name;           // Human-readable agent name (e.g. "Soledad")
        string agentType;      // Agent category (e.g. "wellness")
        string metadataURI;    // IPFS/HTTPS URI with extended metadata
        uint256 registeredAt;  // Block timestamp of registration
        bool active;           // Whether the agent is currently active
    }

    // tokenId => identity
    mapping(uint256 => AgentIdentity) public agents;

    // agent wallet address => tokenId (0 = not registered)
    mapping(address => uint256) public agentTokenId;

    event AgentRegistered(
        uint256 indexed tokenId,
        address indexed agentAddress,
        string name,
        string agentType
    );

    event AgentDeactivated(uint256 indexed tokenId, address indexed agentAddress);
    event AgentMetadataUpdated(uint256 indexed tokenId, string newMetadataURI);

    constructor() ERC721("BRESO Agent Identity", "BRESO-AI") Ownable(msg.sender) {}

    /**
     * @notice Register a new AI agent and mint its identity NFT to msg.sender.
     * @param name         Human-readable name for the agent.
     * @param agentType    Category string (e.g. "wellness").
     * @param metadataURI  URI pointing to off-chain metadata (IPFS/HTTPS).
     */
    function registerAgent(
        string calldata name,
        string calldata agentType,
        string calldata metadataURI
    ) external onlyOwner returns (uint256 tokenId) {
        require(agentTokenId[msg.sender] == 0, "Agent already registered");
        require(bytes(name).length > 0, "Name required");

        _nextTokenId++;
        tokenId = _nextTokenId;

        _safeMint(msg.sender, tokenId);

        agents[tokenId] = AgentIdentity({
            name: name,
            agentType: agentType,
            metadataURI: metadataURI,
            registeredAt: block.timestamp,
            active: true
        });

        agentTokenId[msg.sender] = tokenId;

        emit AgentRegistered(tokenId, msg.sender, name, agentType);
    }

    /**
     * @notice Deactivate an agent (keeps the NFT but marks it inactive).
     */
    function deactivateAgent(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        agents[tokenId].active = false;
        emit AgentDeactivated(tokenId, ownerOf(tokenId));
    }

    /**
     * @notice Update the metadata URI for an agent.
     */
    function updateMetadata(uint256 tokenId, string calldata newURI) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        agents[tokenId].metadataURI = newURI;
        emit AgentMetadataUpdated(tokenId, newURI);
    }

    /**
     * @notice Non-transferable: block all transfers except minting.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "Agent NFTs are non-transferable");
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return agents[tokenId].metadataURI;
    }

    function totalAgents() external view returns (uint256) {
        return _nextTokenId;
    }
}
